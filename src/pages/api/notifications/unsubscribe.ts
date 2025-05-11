import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const supabase = createClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // Delete subscription from database
    await prisma.notificationSubscription.deleteMany({
      where: {
        endpoint: subscription.endpoint,
        userId: user.id,
      },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}