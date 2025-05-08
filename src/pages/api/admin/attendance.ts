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

  // Handle GET request - Get all attendance records
  if (req.method === 'GET') {
    try {
      const { userId, locationId, status, startDate, endDate } = req.query;
      
      // Build the where clause based on query parameters
      let where: any = {};
      
      if (userId && typeof userId === 'string') {
        where.userId = userId;
      }
      
      if (locationId && typeof locationId === 'string') {
        where.locationId = locationId;
      }
      
      if (status && typeof status === 'string') {
        where.status = status;
      }
      
      if (startDate && typeof startDate === 'string') {
        where.checkInTime = {
          ...where.checkInTime,
          gte: new Date(startDate),
        };
      }
      
      if (endDate && typeof endDate === 'string') {
        where.checkInTime = {
          ...where.checkInTime,
          lte: new Date(endDate),
        };
      }
      
      const attendances = await prisma.attendance.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { checkInTime: 'desc' },
      });
      
      return res.status(200).json(attendances);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      return res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
  }

  // Handle POST request - Create a manual attendance record
  if (req.method === 'POST') {
    try {
      const { 
        userId, 
        locationId, 
        checkInTime, 
        checkOutTime, 
        status, 
        notes 
      } = req.body;

      // Validate required fields
      if (!userId || !locationId || !checkInTime) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if location exists
      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        return res.status(404).json({ error: 'Location not found' });
      }

      // Create attendance record
      const attendance = await prisma.attendance.create({
        data: {
          userId,
          locationId,
          checkInTime: new Date(checkInTime),
          checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
          checkInLatitude: 0, // Default values for manual entry
          checkInLongitude: 0,
          checkOutLatitude: checkOutTime ? 0 : null,
          checkOutLongitude: checkOutTime ? 0 : null,
          status: status || 'PRESENT',
          notes,
        },
      });

      return res.status(201).json(attendance);
    } catch (error) {
      console.error('Error creating attendance record:', error);
      return res.status(500).json({ error: 'Failed to create attendance record' });
    }
  }

  // Return 405 for other methods
  return res.status(405).json({ error: 'Method not allowed' });
}