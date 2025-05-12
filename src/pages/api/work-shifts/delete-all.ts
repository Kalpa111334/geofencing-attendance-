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
    // Get all work shifts with their employees and rosters
    const workShifts = await prisma.workShift.findMany({
      include: {
        employees: {
          select: { id: true }
        },
        rosters: true
      }
    });

    if (workShifts.length === 0) {
      return res.status(200).json({ 
        message: 'No work shifts to delete',
        deletedCount: 0
      });
    }

    let deletedCount = 0;

    // Process each work shift individually to properly handle relationships
    for (const workShift of workShifts) {
      try {
        // First, delete any associated rosters for this work shift
        if (workShift.rosters.length > 0) {
          await prisma.roster.deleteMany({
            where: { workShiftId: workShift.id }
          });
        }

        // Then, disconnect all employees from this work shift
        if (workShift.employees.length > 0) {
          await prisma.workShift.update({
            where: { id: workShift.id },
            data: {
              employees: {
                disconnect: workShift.employees
              }
            }
          });
        }
        
        // Finally, delete this work shift
        await prisma.workShift.delete({
          where: { id: workShift.id }
        });

        deletedCount++;
      } catch (error) {
        console.error(`Error deleting work shift ${workShift.id}:`, error);
        // Continue with other work shifts even if one fails
      }
    }
    
    // Return success
    return res.status(200).json({ 
      message: `Successfully deleted ${deletedCount} work shifts`,
      deletedCount
    });
  } catch (error) {
    console.error('Error deleting all work shifts:', error);
    return res.status(500).json({ 
      error: 'Failed to delete all work shifts',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}