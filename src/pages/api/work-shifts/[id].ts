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
        include: { employees: true }
      });

      if (!workShift) {
        return res.status(404).json({ error: 'Work shift not found' });
      }

      // Create a new work shift with the updated data and new employee connections
      const newWorkShift = await prisma.workShift.create({
        data: {
          name,
          description,
          startTime,
          endTime,
          days,
          employees: employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0
            ? { connect: employeeIds.map(empId => ({ id: empId })) }
            : undefined
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
        }
      });
      
      // Delete the original work shift
      await prisma.workShift.delete({
        where: { id }
      });
      
      // Return the new work shift
      return res.status(200).json({
        ...newWorkShift,
        id // Keep the original ID in the response
      });
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
        include: { employees: true }
      });

      if (!workShift) {
        return res.status(404).json({ error: 'Work shift not found' });
      }

      // Delete any associated rosters
      await prisma.roster.deleteMany({
        where: { workShiftId: id }
      });
      
      // Create a temporary work shift with no employees
      const tempShift = await prisma.workShift.create({
        data: {
          name: `temp_${id}`,
          startTime: "00:00",
          endTime: "00:00",
          days: []
        }
      });
      
      // Delete the original work shift
      await prisma.workShift.delete({
        where: { id }
      });
      
      // Delete the temporary work shift
      await prisma.workShift.delete({
        where: { id: tempShift.id }
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