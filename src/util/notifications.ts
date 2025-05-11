import prisma from '@/lib/prisma';
import webpush from 'web-push';

// Configure web-push
export const initWebPush = () => {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || '',
    process.env.VAPID_PUBLIC_KEY || '',
    process.env.VAPID_PRIVATE_KEY || ''
  );
};

// Send notification to a specific user
export const sendNotificationToUser = async (
  userId: string,
  title: string,
  body: string,
  options: {
    icon?: string;
    url?: string;
    tag?: string;
    requireInteraction?: boolean;
    data?: any;
  } = {}
) => {
  try {
    initWebPush();

    // Get user's subscriptions
    const subscriptions = await prisma.notificationSubscription.findMany({
      where: {
        userId,
      },
    });

    if (subscriptions.length === 0) {
      console.log(`No subscriptions found for user ${userId}`);
      return { success: false, error: 'No subscriptions found' };
    }

    // Create notification payload
    const payload = JSON.stringify({
      title,
      body,
      icon: options.icon || '/favicon.ico',
      tag: options.tag || 'default',
      requireInteraction: options.requireInteraction || false,
      data: {
        url: options.url || '/dashboard',
        ...options.data,
      },
    });

    // Send notification to all user's devices
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          // Create proper PushSubscription object format
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            }
          };
          
          // Send notification with proper error handling
          await webpush.sendNotification(pushSubscription, payload);
          console.log(`Successfully sent notification to ${subscription.endpoint}`);
          return { success: true, endpoint: subscription.endpoint };
        } catch (error: any) {
          console.error(`Error sending notification to ${subscription.endpoint}:`, error);
          
          // If subscription is expired or invalid, remove it
          if (error.statusCode === 404 || error.statusCode === 410) {
            await prisma.notificationSubscription.delete({
              where: { endpoint: subscription.endpoint },
            });
            console.log(`Deleted invalid subscription: ${subscription.endpoint}`);
          }
          return { success: false, endpoint: subscription.endpoint, error: error.message };
        }
      })
    );

    // Log notification to database
    await prisma.notification.create({
      data: {
        title,
        body,
        icon: options.icon || '/favicon.ico',
        url: options.url || '/dashboard',
        tag: options.tag,
        userId,
      },
    });

    return { success: true, results };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error };
  }
};

// Send notification to all users with a specific role
export const sendNotificationToRole = async (
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE',
  title: string,
  body: string,
  options: {
    icon?: string;
    url?: string;
    tag?: string;
    requireInteraction?: boolean;
    data?: any;
  } = {}
) => {
  try {
    // Get all users with the specified role
    const users = await prisma.user.findMany({
      where: {
        role,
      },
      select: {
        id: true,
      },
    });

    if (users.length === 0) {
      return { success: false, error: `No users found with role ${role}` };
    }

    // Send notification to each user
    const results = await Promise.allSettled(
      users.map((user) => sendNotificationToUser(user.id, title, body, options))
    );

    return { success: true, results };
  } catch (error) {
    console.error('Error sending notification to role:', error);
    return { success: false, error };
  }
};

// Send notification to all users
export const sendNotificationToAll = async (
  title: string,
  body: string,
  options: {
    icon?: string;
    url?: string;
    tag?: string;
    requireInteraction?: boolean;
    data?: any;
  } = {}
) => {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
      },
    });

    if (users.length === 0) {
      return { success: false, error: 'No users found' };
    }

    // Send notification to each user
    const results = await Promise.allSettled(
      users.map((user) => sendNotificationToUser(user.id, title, body, options))
    );

    return { success: true, results };
  } catch (error) {
    console.error('Error sending notification to all users:', error);
    return { success: false, error };
  }
};

// Generate and send daily attendance report
export const generateAndSendDailyAttendanceReport = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all attendance records for today
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        checkInTime: {
          gte: today,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        location: true,
      },
      orderBy: {
        checkInTime: 'asc',
      },
    });

    if (attendanceRecords.length === 0) {
      console.log('No attendance records found for today');
      return { success: false, error: 'No attendance records found for today' };
    }

    // Calculate statistics
    const totalEmployees = await prisma.user.count({
      where: {
        role: 'EMPLOYEE',
      },
    });
    
    const checkedInCount = new Set(attendanceRecords.map(record => record.userId)).size;
    const lateCount = attendanceRecords.filter(record => record.status === 'LATE').length;
    const checkedOutCount = attendanceRecords.filter(record => record.checkOutTime !== null).length;
    
    // Create report data
    const reportData = {
      date: today.toISOString(),
      totalEmployees,
      checkedInCount,
      lateCount,
      checkedOutCount,
      attendanceRate: Math.round((checkedInCount / totalEmployees) * 100),
      records: attendanceRecords.map(record => ({
        employeeName: `${record.user.firstName || ''} ${record.user.lastName || ''}`.trim() || record.user.email,
        location: record.location.name,
        checkInTime: record.checkInTime.toISOString(),
        checkOutTime: record.checkOutTime?.toISOString() || null,
        status: record.status,
        duration: record.checkOutTime 
          ? Math.round((record.checkOutTime.getTime() - record.checkInTime.getTime()) / (1000 * 60)) 
          : null,
      })),
    };

    // Save report to database
    const savedReport = await prisma.dailyReport.create({
      data: {
        date: today,
        reportType: 'ATTENDANCE',
        reportData: reportData as any,
      },
    });

    // Send notification to admins
    const notificationResult = await sendNotificationToRole(
      'ADMIN',
      'Daily Attendance Report',
      `Attendance Rate: ${reportData.attendanceRate}% (${checkedInCount}/${totalEmployees}). ${lateCount} employees were late.`,
      {
        url: '/admin-dashboard?tab=reports',
        tag: 'daily-report',
        requireInteraction: true,
        data: {
          reportId: savedReport.id,
          reportType: 'ATTENDANCE',
        },
      }
    );

    // Mark report as sent
    await prisma.dailyReport.update({
      where: {
        id: savedReport.id,
      },
      data: {
        sentToUsers: true,
      },
    });

    return { success: true, reportId: savedReport.id, notificationResult };
  } catch (error) {
    console.error('Error generating and sending daily attendance report:', error);
    return { success: false, error };
  }
};