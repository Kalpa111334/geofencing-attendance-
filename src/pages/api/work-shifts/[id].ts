import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
      return res.status(500).json({ 
        error: 'Failed to fetch work shift',
        details: error instanceof Error ? error.message : String(error)
      });
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

      // First, check if the work shift exists
      const workShift = await prisma.workShift.findUnique({
        where: { id },
      });

      if (!workShift) {
        return res.status(404).json({ error: 'Work shift not found' });
      }

      // Use a transaction to ensure all operations are atomic
      const updatedWorkShift = await prisma.$transaction(async (tx) => {
        // First, remove all employee connections using raw SQL
        await tx.$executeRawUnsafe(`DELETE FROM "_EmployeeWorkShifts" WHERE "B" = $1`, id);
        
        // Then update the work shift
        const updated = await tx.workShift.update({
          where: { id },
          data: {
            name,
            description,
            startTime,
            endTime,
            days,
          },
        });
        
        // If there are employees to connect, add them
        if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
          // Add new employee connections
          for (const empId of employeeIds) {
            await tx.$executeRawUnsafe(
              `INSERT INTO "_EmployeeWorkShifts" ("A", "B") VALUES ($1, $2)`,
              empId,
              id
            );
          }
        }
        
        // Return the updated work shift with employees
        return tx.workShift.findUnique({
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
      });

      return res.status(200).json(updatedWorkShift);
    } catch (error) {
      console.error('Error updating work shift:', error);
      return res.status(500).json({ 
        error: 'Failed to update work shift',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Handle DELETE request - Delete a work shift
  if (req.method === 'DELETE') {
    try {
      // Check if the work shift exists
      const workShift = await prisma.workShift.findUnique({
        where: { id },
      });

      if (!workShift) {
        return res.status(404).json({ error: 'Work shift not found' });
      }

      // Use a transaction to ensure all operations are atomic
      await prisma.$transaction(async (tx) => {
        // First, delete any associated rosters
        await tx.roster.deleteMany({
          where: { workShiftId: id }
        });
        
        // Then, delete the junction table entries using raw SQL
        await tx.$executeRawUnsafe(`DELETE FROM "_EmployeeWorkShifts" WHERE "B" = $1`, id);
        
        // Finally, delete the work shift
        await tx.workShift.delete({
          where: { id }
        });
      });

      return res.status(200).json({ message: 'Work shift deleted successfully' });
    } catch (error) {
      console.error('Error deleting work shift:', error);
      return res.status(500).json({ 
        error: 'Failed to delete work shift',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Return 405 for other methods
  return res.status(405).json({ error: 'Method not allowed' });
}