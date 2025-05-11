import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  // Get the work shift ID from the request
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid work shift ID' });
  }

  // Handle GET request - Get a specific work shift
  if (req.method === 'GET') {
    try {
      const workShift = await prisma.workShift.findUnique({
        where: { id },
        include: {
          employees: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!workShift) {
        return res.status(404).json({ error: 'Work shift not found' });
      }

      return res.status(200).json(workShift);
    } catch (error) {
      console.error('Error fetching work shift:', error);
      return res.status(500).json({ error: 'Failed to fetch work shift' });
    }
  }

  // Handle PUT request - Update a work shift
  if (req.method === 'PUT') {
    try {
      const { name, description, startTime, endTime, days, employeeIds } = req.body;

      // Validate required fields
      if (!name || !startTime || !endTime || !days || !Array.isArray(days)) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // First, get the current work shift to handle employee connections properly
      const currentWorkShift = await prisma.workShift.findUnique({
        where: { id },
        include: { employees: true },
      });

      if (!currentWorkShift) {
        return res.status(404).json({ error: 'Work shift not found' });
      }

      // Update the work shift
      const updatedWorkShift = await prisma.workShift.update({
        where: { id },
        data: {
          name,
          description,
          startTime,
          endTime,
          days,
          employees: {
            // Disconnect all existing employees
            disconnect: currentWorkShift.employees.map(emp => ({ id: emp.id })),
            // Connect the new set of employees
            ...(employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0
              ? { connect: employeeIds.map((empId: string) => ({ id: empId })) }
              : {}),
          },
        },
        include: {
          employees: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return res.status(200).json(updatedWorkShift);
    } catch (error) {
      console.error('Error updating work shift:', error);
      return res.status(500).json({ error: 'Failed to update work shift' });
    }
  }

  // Handle DELETE request - Delete a work shift
  if (req.method === 'DELETE') {
    try {
      // Start a transaction to ensure all operations succeed or fail together
      return await prisma.$transaction(async (tx) => {
        // Check if the work shift exists
        const workShift = await tx.workShift.findUnique({
          where: { id },
          include: {
            employees: true,
            rosters: true
          }
        });

        if (!workShift) {
          return res.status(404).json({ error: 'Work shift not found' });
        }

        // First, delete any associated rosters
        if (workShift.rosters.length > 0) {
          await tx.roster.deleteMany({
            where: { workShiftId: id }
          });
        }

        // For each employee, update their workShifts relation directly
        for (const employee of workShift.employees) {
          // Get all work shifts for this employee except the one being deleted
          const employeeWorkShifts = await tx.user.findUnique({
            where: { id: employee.id },
            select: {
              workShifts: {
                where: {
                  id: {
                    not: id
                  }
                }
              }
            }
          });

          // Update the employee with only the remaining work shifts
          await tx.user.update({
            where: { id: employee.id },
            data: {
              workShifts: {
                set: employeeWorkShifts?.workShifts.map(ws => ({ id: ws.id })) || []
              }
            }
          });
        }

        // Finally, delete the work shift
        await tx.workShift.delete({
          where: { id }
        });

        return res.status(200).json({ message: 'Work shift deleted successfully' });
      });
    } catch (error) {
      console.error('Error deleting work shift:', error);
      return res.status(500).json({ error: 'Failed to delete work shift' });
    }
  }

  // Return 405 for other methods
  return res.status(405).json({ error: 'Method not allowed' });
}