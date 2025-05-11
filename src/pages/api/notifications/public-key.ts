import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const supabase = createClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Return the public VAPID key
    return res.status(200).json({ 
      publicKey: process.env.VAPID_PUBLIC_KEY 
    });
  } catch (error) {
    console.error('Error getting public key:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}