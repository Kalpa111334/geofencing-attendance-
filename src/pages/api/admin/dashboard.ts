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

      // Get all work shifts for today
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = dayNames[today];
      
      // Find all work shifts active today
      const activeWorkShifts = await prisma.workShift.findMany({
        where: {
          days: {
            has: todayName,
          },
        },
        include: {
          employees: true,
        },
      });
      
      // Get all employees who should be working today based on work shifts and rosters
      const employeesWithShifts = new Set<string>();
      
      // Add employees from work shifts
      activeWorkShifts.forEach(shift => {
        shift.employees.forEach(employee => {
          employeesWithShifts.add(employee.id);
        });
      });
      
      // Add employees from active rosters
      const activeRosters = await prisma.roster.findMany({
        where: {
          startDate: {
            lte: todayEnd,
          },
          OR: [
            { endDate: null },
            { endDate: { gte: todayStart } },
          ],
          workShift: {
            days: {
              has: todayName,
            },
          },
        },
        include: {
          user: true,
        },
      });
      
      activeRosters.forEach(roster => {
        employeesWithShifts.add(roster.userId);
      });
      
      // If no employees are scheduled, use all employees as fallback
      const expectedEmployeeCount = employeesWithShifts.size > 0 ? employeesWithShifts.size : totalUsers;
      
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

      // Calculate absent count based on scheduled employees
      const absentCount = expectedEmployeeCount - (presentCount + lateCount);

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