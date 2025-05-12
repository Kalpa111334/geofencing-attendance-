import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const supabase = createClient({ req, res });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get endpoint from request body
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Missing subscription endpoint' });
    }

    // Delete subscription from database
    const result = await prisma.notificationSubscription.deleteMany({
      where: {
        endpoint: endpoint,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}