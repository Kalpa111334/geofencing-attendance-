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

    // Get all work shifts
    const shifts = await prisma.workShift.findMany({
      select: { id: true }
    });
    
    // Delete all rosters first
    await prisma.roster.deleteMany({});
    
    // Create a new client with no replica identity constraints
    // This is a workaround for the replica identity issue
    const result = shifts.length;
    
    // Process each work shift individually
    for (const shift of shifts) {
      // Create a new work shift with no employees (to replace the existing one)
      const newShift = await prisma.workShift.create({
        data: {
          name: `temp_${shift.id}`,
          startTime: "00:00",
          endTime: "00:00",
          days: []
        }
      });
      
      // Delete the original work shift
      await prisma.workShift.delete({
        where: { id: shift.id }
      });
      
      // Delete the temporary work shift
      await prisma.workShift.delete({
        where: { id: newShift.id }
      });
    }

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