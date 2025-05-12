import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';
import webpush from 'web-push';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if cookies exist in the request
    if (!req.cookies || Object.keys(req.cookies).length === 0) {
      return res.status(401).json({ error: 'No authentication cookies found' });
    }

    let user;
    try {
      // Verify authentication
      const supabase = createClient({ req, res });
      const { data, error } = await supabase.auth.getUser();
      
      if (error || !data.user) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      user = data.user;
    } catch (authError) {
      console.error('Error in authentication:', authError);
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Configure web-push
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || '',
      process.env.VAPID_PUBLIC_KEY || '',
      process.env.VAPID_PRIVATE_KEY || ''
    );

    // Get user's subscriptions
    const subscriptions = await prisma.notificationSubscription.findMany({
      where: {
        userId: user.id,
      },
    });

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No subscription found for this user' });
    }

    // Create notification payload
    const payload = JSON.stringify({
      title: 'Test Notification',
      body: 'This is a test notification from your Employee Management System',
      icon: '/favicon.ico',
      data: {
        url: '/dashboard',
      },
    });

    // Send notification to all user's devices
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          // Validate subscription data
          if (!subscription.endpoint || !subscription.p256dh || !subscription.auth) {
            console.error(`Invalid subscription data: ${JSON.stringify(subscription)}`);
            // Delete invalid subscription
            await prisma.notificationSubscription.delete({
              where: { id: subscription.id },
            });
            return { 
              success: false, 
              endpoint: subscription.endpoint || 'unknown', 
              error: 'Invalid subscription data' 
            };
          }
          
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
          console.error(`Error sending notification to ${subscription.endpoint || 'unknown'}:`, error);
          
          // If subscription is expired or invalid, remove it
          if (error.statusCode === 404 || error.statusCode === 410) {
            await prisma.notificationSubscription.delete({
              where: { id: subscription.id },
            });
            console.log(`Deleted invalid subscription: ${subscription.endpoint || 'unknown'}`);
          }
          return { 
            success: false, 
            endpoint: subscription.endpoint || 'unknown', 
            error: error.message || 'Unknown error' 
          };
        }
      })
    );

    // Log notification to database
    await prisma.notification.create({
      data: {
        title: 'Test Notification',
        body: 'This is a test notification from your Employee Management System',
        icon: '/favicon.ico',
        url: '/dashboard',
        userId: user.id,
      },
    });

    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('Error sending test notification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}