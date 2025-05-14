import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';
import { sendCheckInNotification, sendCheckOutNotification } from '@/util/notifications';
import { isWithinRadius } from '@/util/geofencing';

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

  // Handle GET request - Get user's attendance records
  if (req.method === 'GET') {
    try {
      const attendances = await prisma.attendance.findMany({
        where: { userId: user.id },
        include: { location: true },
        orderBy: { checkInTime: 'desc' },
      });
      return res.status(200).json(attendances);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      return res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
  }

  // Handle POST request - Create a check-in or check-out
  if (req.method === 'POST') {
    try {
      const { locationId, latitude, longitude, type } = req.body;

      // Validate required fields
      if (!locationId || latitude === undefined || longitude === undefined || !type) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get the location
      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        return res.status(404).json({ error: 'Location not found' });
      }

      // Check if user is within the geofence
      const isInGeofence = isWithinRadius(
        parseFloat(latitude),
        parseFloat(longitude),
        location.latitude,
        location.longitude,
        location.radius
      );

      if (!isInGeofence) {
        return res.status(400).json({ 
          error: 'You are not within the required distance of this location',
          distance: {
            required: location.radius,
            actual: Math.round(
              calculateDistance(
                parseFloat(latitude),
                parseFloat(longitude),
                location.latitude,
                location.longitude
              )
            )
          }
        });
      }

      // Handle check-in
      if (type === 'check-in') {
        // Check if there's an open attendance record
        const openAttendance = await prisma.attendance.findFirst({
          where: {
            userId: user.id,
            checkOutTime: null,
          },
        });

        if (openAttendance) {
          return res.status(400).json({ error: 'You already have an active check-in' });
        }

        // Get the current time
        const now = new Date();
        
        // Check if the user has a work shift for today
        const today = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = dayNames[today];
        
        // Find the user's work shift for today
        const userWorkShift = await prisma.workShift.findFirst({
          where: {
            days: {
              has: todayName,
            },
            employees: {
              some: {
                id: user.id,
              },
            },
          },
        });
        
        // Find the user's roster assignment for today
        const userRoster = await prisma.roster.findFirst({
          where: {
            userId: user.id,
            startDate: {
              lte: now,
            },
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
            workShift: {
              days: {
                has: todayName,
              },
            },
          },
          include: {
            workShift: true,
          },
        });
        
        // Determine if the user is late based on work shift or roster
        let isLate = false;
        let workShiftStartTime: string | null = null;
        
        if (userRoster) {
          // User has a roster assignment for today
          workShiftStartTime = userRoster.workShift.startTime;
        } else if (userWorkShift) {
          // User has a work shift for today
          workShiftStartTime = userWorkShift.startTime;
        }
        
        if (workShiftStartTime) {
          // Parse the work shift start time (format: "HH:MM")
          const [hours, minutes] = workShiftStartTime.split(':').map(Number);
          
          // Create a Date object for the work shift start time today
          const shiftStartTime = new Date();
          shiftStartTime.setHours(hours, minutes, 0, 0);
          
          // Add a 15-minute grace period
          const graceEndTime = new Date(shiftStartTime);
          graceEndTime.setMinutes(graceEndTime.getMinutes() + 15);
          
          // Check if current time is after grace period
          isLate = now > graceEndTime;
        }
        
        // Create new attendance record
        const attendance = await prisma.attendance.create({
          data: {
            userId: user.id,
            locationId,
            checkInTime: now,
            checkInLatitude: parseFloat(latitude),
            checkInLongitude: parseFloat(longitude),
            status: isLate ? 'LATE' : 'PRESENT',
          },
          include: {
            location: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });
        
        console.log(`User ${user.id} checked in at location ${locationId} at ${now.toISOString()}`);

        // Send check-in notification
        try {
          await sendCheckInNotification(
            user.id,
            location.name,
            now
          );
        } catch (notificationError) {
          console.error('Error sending check-in notification:', notificationError);
          // Continue even if notification fails
        }

        return res.status(201).json(attendance);
      }

      // Handle check-out
      if (type === 'check-out') {
        // Find the open attendance record
        const openAttendance = await prisma.attendance.findFirst({
          where: {
            userId: user.id,
            checkOutTime: null,
          },
          include: {
            location: true,
          }
        });

        if (!openAttendance) {
          return res.status(400).json({ error: 'No active check-in found' });
        }

        // Get the current time
        const now = new Date();
        
        // Update the attendance record with check-out information
        const updatedAttendance = await prisma.attendance.update({
          where: { id: openAttendance.id },
          data: {
            checkOutTime: now,
            checkOutLatitude: parseFloat(latitude),
            checkOutLongitude: parseFloat(longitude),
          },
          include: {
            location: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });
        
        console.log(`User ${user.id} checked out from location ${openAttendance.locationId} at ${now.toISOString()}`);

        // Calculate duration in minutes
        const checkInTime = new Date(updatedAttendance.checkInTime);
        const durationMinutes = Math.round((now.getTime() - checkInTime.getTime()) / (1000 * 60));

        // Send check-out notification
        try {
          await sendCheckOutNotification(
            user.id,
            updatedAttendance.location.name,
            now,
            durationMinutes
          );
        } catch (notificationError) {
          console.error('Error sending check-out notification:', notificationError);
          // Continue even if notification fails
        }

        return res.status(200).json(updatedAttendance);
      }

      return res.status(400).json({ error: 'Invalid attendance type' });
    } catch (error) {
      console.error('Error processing attendance:', error);
      return res.status(500).json({ error: 'Failed to process attendance' });
    }
  }

  // Return 405 for other methods
  return res.status(405).json({ error: 'Method not allowed' });
}

// Helper function to calculate distance
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Earth's radius in meters
  const R = 6371000;
  
  // Convert latitude and longitude from degrees to radians
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
  // Haversine formula
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}