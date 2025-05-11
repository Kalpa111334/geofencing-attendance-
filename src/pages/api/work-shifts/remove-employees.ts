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

    // For each employee, update their work shifts to exclude this one
    for (const employee of workShift.employees) {
      // Get all the employee's work shifts
      const employeeWithShifts = await prisma.user.findUnique({
        where: { id: employee.id },
        include: { workShifts: true }
      });

      if (employeeWithShifts) {
        // Filter out the work shift to be deleted
        const remainingShifts = employeeWithShifts.workShifts.filter(
          shift => shift.id !== workShiftId
        );

        // Update the employee with the filtered work shifts
        await prisma.user.update({
          where: { id: employee.id },
          data: {
            workShifts: {
              set: remainingShifts.map(shift => ({ id: shift.id }))
            }
          }
        });
      }
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