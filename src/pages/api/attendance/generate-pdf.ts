import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';
import { format, parseISO } from 'date-fns';

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

  // Check if the user is an admin for certain operations
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!userData) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Handle POST request - Generate attendance PDF data
  if (req.method === 'POST') {
    try {
      const { userId, startDate, endDate, includeDetails } = req.body;

      // Validate required fields
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // If userId is provided and the requester is not an admin, check if they're requesting their own data
      if (userId && userData.role !== 'ADMIN' && userId !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You can only access your own attendance records' });
      }

      // Determine which user's attendance to fetch
      const targetUserId = userId || user.id;

      // Get the target user's details
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        return res.status(404).json({ error: 'Target user not found' });
      }

      // Parse dates
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);
      
      // Set end date to end of day
      parsedEndDate.setHours(23, 59, 59, 999);

      // Fetch attendance records
      const attendances = await prisma.attendance.findMany({
        where: {
          userId: targetUserId,
          checkInTime: {
            gte: parsedStartDate,
            lte: parsedEndDate,
          },
        },
        include: {
          location: true,
        },
        orderBy: { checkInTime: 'asc' },
      });

      // Calculate attendance statistics
      const totalDays = Math.ceil((parsedEndDate.getTime() - parsedStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const presentDays = new Set(attendances.map(a => format(new Date(a.checkInTime), 'yyyy-MM-dd'))).size;
      const lateDays = attendances.filter(a => a.status === 'LATE').length;
      const absentDays = totalDays - presentDays;
      const attendanceRate = (presentDays / totalDays) * 100;
      const punctualityRate = presentDays > 0 ? ((presentDays - lateDays) / presentDays) * 100 : 0;

      // Calculate average work hours
      let totalWorkHours = 0;
      let daysWithCompleteRecords = 0;

      attendances.forEach(attendance => {
        if (attendance.checkInTime && attendance.checkOutTime) {
          const checkIn = new Date(attendance.checkInTime).getTime();
          const checkOut = new Date(attendance.checkOutTime).getTime();
          const hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60);
          
          if (hoursWorked > 0) {
            totalWorkHours += hoursWorked;
            daysWithCompleteRecords++;
          }
        }
      });

      const averageWorkHours = daysWithCompleteRecords > 0 ? totalWorkHours / daysWithCompleteRecords : 0;

      // Format attendance records for PDF
      const formattedAttendances = attendances.map(attendance => ({
        date: format(new Date(attendance.checkInTime), 'yyyy-MM-dd'),
        location: attendance.location.name,
        checkIn: format(new Date(attendance.checkInTime), 'HH:mm:ss'),
        checkOut: attendance.checkOutTime ? format(new Date(attendance.checkOutTime), 'HH:mm:ss') : 'N/A',
        duration: attendance.checkOutTime 
          ? calculateDuration(attendance.checkInTime, attendance.checkOutTime) 
          : 'N/A',
        status: attendance.status,
      }));

      // Prepare the response data
      const pdfData = {
        reportTitle: `Attendance Report: ${format(parsedStartDate, 'MMM d, yyyy')} to ${format(parsedEndDate, 'MMM d, yyyy')}`,
        employeeInfo: {
          name: `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email,
          email: targetUser.email,
          department: targetUser.department || 'N/A',
          position: targetUser.position || 'N/A',
        },
        summary: {
          totalDays,
          presentDays,
          lateDays,
          absentDays,
          attendanceRate: attendanceRate.toFixed(2),
          punctualityRate: punctualityRate.toFixed(2),
          averageWorkHours: averageWorkHours.toFixed(2),
        },
        attendances: includeDetails ? formattedAttendances : [],
        generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        generatedBy: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
      };

      return res.status(200).json(pdfData);
    } catch (error) {
      console.error('Error generating attendance PDF data:', error);
      return res.status(500).json({ error: 'Failed to generate attendance PDF data' });
    }
  }

  // Return 405 for other methods
  return res.status(405).json({ error: 'Method not allowed' });
}

// Helper function to calculate duration between check-in and check-out
function calculateDuration(checkInTime: string | Date, checkOutTime: string | Date): string {
  const checkIn = new Date(checkInTime).getTime();
  const checkOut = new Date(checkOutTime).getTime();
  const durationMs = checkOut - checkIn;
  
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}