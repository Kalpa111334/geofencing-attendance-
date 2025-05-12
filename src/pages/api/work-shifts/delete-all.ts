import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  try {
    const supabase = createClient(req, res);
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data.user) {
      console.error('Authentication error:', error);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if the user is an admin
    const userData = await prisma.user.findUnique({
      where: { id: data.user.id },
    });

    if (!userData || userData.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
  } catch (authError) {
    console.error('Error in authentication:', authError);
    return res.status(401).json({ error: 'Authentication failed' });
  }

  try {
    // Get all work shifts to count them
    const workShifts = await prisma.workShift.findMany({
      select: { id: true }
    });

    if (workShifts.length === 0) {
      return res.status(200).json({ 
        message: 'No work shifts to delete',
        deletedCount: 0
      });
    }

    // Delete work shifts one by one to avoid bulk operations on the junction table
    let deletedCount = 0;
    
    // First, delete all rosters
    await prisma.roster.deleteMany({});
    
    // Get all work shifts
    const shifts = await prisma.workShift.findMany({
      include: { employees: true }
    });
    
    // Delete each work shift individually
    for (const shift of shifts) {
      // First disconnect all employees from this shift
      if (shift.employees.length > 0) {
        const employeeIds = shift.employees.map(emp => emp.id);
        
        await prisma.workShift.update({
          where: { id: shift.id },
          data: {
            employees: {
              disconnect: employeeIds.map(id => ({ id }))
            }
          }
        });
      }
      
      // Then delete the work shift
      await prisma.workShift.delete({
        where: { id: shift.id }
      });
      
      deletedCount++;
    }
    
    const result = deletedCount;

    // Return success
    return res.status(200).json({ 
      message: `Successfully deleted ${result} work shifts`,
      deletedCount: result
    });
  } catch (error) {
    console.error('Error deleting all work shifts:', error);
    return res.status(500).json({ 
      error: 'Failed to delete all work shifts',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}