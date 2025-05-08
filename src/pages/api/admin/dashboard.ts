import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

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

  // Handle GET request - Get dashboard statistics
  if (req.method === 'GET') {
    try {
      // Get today's date range
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      // Get total users count
      const totalUsers = await prisma.user.count();

      // Get total locations count
      const totalLocations = await prisma.location.count();

      // Get active users today (users who have checked in)
      const activeUsers = await prisma.attendance.findMany({
        where: {
          checkInTime: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        select: {
          userId: true,
        },
        distinct: ['userId'],
      });

      // Get today's attendance breakdown
      const presentCount = await prisma.attendance.count({
        where: {
          checkInTime: {
            gte: todayStart,
            lte: todayEnd,
          },
          status: 'PRESENT',
        },
      });

      const lateCount = await prisma.attendance.count({
        where: {
          checkInTime: {
            gte: todayStart,
            lte: todayEnd,
          },
          status: 'LATE',
        },
      });

      // Calculate absent count (this is a simplification - in a real app you'd need to consider scheduled employees)
      // For now, we'll assume all users should be present
      const absentCount = totalUsers - (presentCount + lateCount);

      // Get recent check-ins
      const recentCheckIns = await prisma.attendance.findMany({
        where: {
          checkInTime: {
            gte: todayStart,
          },
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          location: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          checkInTime: 'desc',
        },
        take: 5,
      });

      // Format the response
      const dashboardStats = {
        totalUsers,
        activeUsers: activeUsers.length,
        totalLocations,
        todayAttendance: {
          present: presentCount,
          late: lateCount,
          absent: absentCount > 0 ? absentCount : 0,
          total: totalUsers,
        },
        recentCheckIns: recentCheckIns.map(checkIn => ({
          id: checkIn.id,
          userName: checkIn.user.firstName && checkIn.user.lastName 
            ? `${checkIn.user.firstName} ${checkIn.user.lastName}` 
            : checkIn.user.email,
          locationName: checkIn.location.name,
          time: checkIn.checkInTime.toISOString(),
        })),
      };

      return res.status(200).json(dashboardStats);
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
      return res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
  }

  // Return 405 for other methods
  return res.status(405).json({ error: 'Method not allowed' });
}