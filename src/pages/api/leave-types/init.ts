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
    // Delete all existing leave types that aren't associated with any leave requests
    const leaveTypesInUse = await prisma.leaveRequest.findMany({
      select: {
        leaveTypeId: true
      },
      distinct: ['leaveTypeId']
    });
    
    const leaveTypeIdsInUse = leaveTypesInUse.map(lt => lt.leaveTypeId);
    
    // Delete leave types not in use
    const deletedTypes = await prisma.leaveType.deleteMany({
      where: {
        id: {
          notIn: leaveTypeIdsInUse
        }
      }
    });
    
    // Fetch the remaining leave types (those in use)
    const remainingLeaveTypes = await prisma.leaveType.findMany();
    
    return res.status(201).json({
      message: 'Leave types reset successfully',
      deleted: deletedTypes.count,
      remaining: remainingLeaveTypes.length,
      leaveTypes: remainingLeaveTypes
    });
  } catch (error) {
    console.error('Error initializing leave types:', error);
    return res.status(500).json({ error: 'Failed to initialize leave types' });
  }
}