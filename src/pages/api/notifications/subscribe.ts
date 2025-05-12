import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if cookies exist in the request
    if (!req.cookies || Object.keys(req.cookies).length === 0) {
      return res.status(401).json({ error: 'No authentication cookies found' });
    }

    try {
      // Verify authentication
      const supabase = createClient({ req, res });
      const { data, error } = await supabase.auth.getUser();
      
      if (error || !data.user) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const user = data.user;
      const { subscription } = req.body;

      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Invalid subscription data' });
      }

      // Save subscription to database
      await prisma.notificationSubscription.upsert({
        where: {
          endpoint: subscription.endpoint,
        },
        update: {
          userId: user.id,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          expirationTime: subscription.expirationTime ? new Date(subscription.expirationTime) : null,
          updatedAt: new Date(),
        },
        create: {
          userId: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          expirationTime: subscription.expirationTime ? new Date(subscription.expirationTime) : null,
        },
      });

      return res.status(200).json({ success: true });
    } catch (authError) {
      console.error('Error in authentication:', authError);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}