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

  // Check if cookies exist in the request
  if (!req.cookies || Object.keys(req.cookies).length === 0) {
    return res.status(401).json({ error: 'No authentication cookies found' });
  }

  let user;
  try {
    // Get the user from the request
    const supabase = createClient(req, res);
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data.user) {
      console.error('Authentication error:', error);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    user = data.user;
  
    // Check if the user is an admin
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!userData || userData.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
  } catch (authError) {
    console.error('Error in authentication:', authError);
    return res.status(401).json({ error: 'Authentication failed' });
  }

  try {
    // Get all work shifts with their employees and rosters
    const workShifts = await prisma.workShift.findMany({
      include: {
        employees: true,
        rosters: true
      }
    });

    if (workShifts.length === 0) {
      return res.status(200).json({ message: 'No work shifts to delete' });
    }

    // Process each work shift
    for (const workShift of workShifts) {
      // First, delete any associated rosters
      if (workShift.rosters.length > 0) {
        await prisma.roster.deleteMany({
          where: { workShiftId: workShift.id }
        });
      }

      // Then, disconnect all employees from the work shift
      if (workShift.employees.length > 0) {
        await prisma.workShift.update({
          where: { id: workShift.id },
          data: {
            employees: {
              disconnect: workShift.employees.map(emp => ({ id: emp.id }))
            }
          }
        });
      }
    }

    // Finally, delete all work shifts
    const deletedCount = await prisma.workShift.deleteMany({});

    return res.status(200).json({ 
      message: 'All work shifts deleted successfully',
      deletedCount: deletedCount.count
    });
  } catch (error) {
    console.error('Error deleting all work shifts:', error);
    return res.status(500).json({ error: 'Failed to delete all work shifts' });
  }
}