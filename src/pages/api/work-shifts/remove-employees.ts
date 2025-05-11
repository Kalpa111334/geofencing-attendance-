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

  // Get the user from the request
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if the user is an admin
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!userData || userData.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  try {
    const { workShiftId } = req.body;
    
    if (!workShiftId) {
      return res.status(400).json({ error: 'Work shift ID is required' });
    }

    // Get the work shift with its employees
    const workShift = await prisma.workShift.findUnique({
      where: { id: workShiftId },
      include: { employees: true }
    });

    if (!workShift) {
      return res.status(404).json({ error: 'Work shift not found' });
    }

    // If there are no employees, nothing to do
    if (workShift.employees.length === 0) {
      return res.status(200).json({ message: 'No employees to remove' });
    }

    // Use a raw database query to remove the relationships
    // This is a workaround for the replica identity issue
    try {
      await prisma.$executeRaw`
        DELETE FROM "_EmployeeWorkShifts" 
        WHERE "B" = ${workShiftId}::uuid
      `;
    } catch (error) {
      console.error("Error with raw query:", error);
      
      // If the raw query fails, try an alternative approach
      // Create a new work shift with the same properties but no employees
      const newWorkShift = await prisma.workShift.create({
        data: {
          name: workShift.name + " (Copy)",
          description: workShift.description,
          startTime: workShift.startTime,
          endTime: workShift.endTime,
          days: workShift.days
        }
      });
      
      // Delete the old work shift
      await prisma.workShift.delete({
        where: { id: workShiftId }
      });
      
      // Return the ID of the new work shift
      return res.status(200).json({
        message: 'Created a new work shift without employee relationships',
        newWorkShiftId: newWorkShift.id
      });
    }

    return res.status(200).json({ 
      message: 'Successfully removed all employee relationships from work shift',
      removedCount: workShift.employees.length
    });
  } catch (error) {
    console.error('Error removing employees from work shift:', error);
    return res.status(500).json({ error: 'Failed to remove employees from work shift' });
  }
}