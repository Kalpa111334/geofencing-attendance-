import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

// No default leave types - employees will create their own
const defaultLeaveTypes: any[] = [];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Create Supabase client with admin privileges
  const supabase = createClient(req, res);
  
  // Get user from session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;

  // Get user role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Only admins can initialize leave types
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only admins can initialize leave types' });
  }

  try {
    // Find leave types used in leave requests
    const leaveTypesInRequests = await prisma.leaveRequest.findMany({
      select: {
        leaveTypeId: true
      },
      distinct: ['leaveTypeId']
    });
    
    // Find leave types used in leave balances
    const leaveTypesInBalances = await prisma.leaveBalance.findMany({
      select: {
        leaveTypeId: true
      },
      distinct: ['leaveTypeId']
    });
    
    // Combine both sets of IDs to get all leave types in use
    const leaveTypeIdsInRequests = leaveTypesInRequests.map(lt => lt.leaveTypeId);
    const leaveTypeIdsInBalances = leaveTypesInBalances.map(lt => lt.leaveTypeId);
    const allLeaveTypeIdsInUse = [...new Set([...leaveTypeIdsInRequests, ...leaveTypeIdsInBalances])];
    
    // Get all leave types
    const allLeaveTypes = await prisma.leaveType.findMany();
    const unusedLeaveTypeIds = allLeaveTypes
      .filter(lt => !allLeaveTypeIdsInUse.includes(lt.id))
      .map(lt => lt.id);
    
    let deletedCount = 0;
    
    // Delete unused leave types one by one to handle any unexpected constraints
    for (const leaveTypeId of unusedLeaveTypeIds) {
      try {
        // First delete any associated leave balances (should be none, but just in case)
        await prisma.leaveBalance.deleteMany({
          where: { leaveTypeId }
        });
        
        // Then delete the leave type
        await prisma.leaveType.delete({
          where: { id: leaveTypeId }
        });
        
        deletedCount++;
      } catch (err) {
        console.warn(`Could not delete leave type ${leaveTypeId}:`, err);
        // Continue with other leave types even if one fails
      }
    }
    
    // Fetch the remaining leave types
    const remainingLeaveTypes = await prisma.leaveType.findMany();
    
    return res.status(201).json({
      message: 'Leave types reset successfully',
      deleted: deletedCount,
      remaining: remainingLeaveTypes.length,
      leaveTypes: remainingLeaveTypes
    });
  } catch (error) {
    console.error('Error initializing leave types:', error);
    return res.status(500).json({ error: 'Failed to initialize leave types' });
  }
}