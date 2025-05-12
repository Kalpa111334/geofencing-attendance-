import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

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

  // Handle POST request - Enable real-time updates for attendance
  if (req.method === 'POST') {
    try {
      // Get user role
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true }
      });

      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create a Supabase client for the server
      const supabase = createClient(req, res);
      
      // Return the channel configuration based on user role
      return res.status(200).json({
        success: true,
        channelConfig: {
          name: userData.role === 'ADMIN' ? 'admin-attendance-updates' : 'employee-attendance-updates',
          config: {
            event: '*',
            schema: 'public',
            table: 'Attendance',
            ...(userData.role !== 'ADMIN' && { 
              filter: `userId=eq.${user.id}` 
            })
          }
        }
      });
    } catch (error) {
      console.error('Error setting up real-time updates:', error);
      return res.status(500).json({ error: 'Failed to set up real-time updates' });
    }
  }

  // Return 405 for other methods
  return res.status(405).json({ error: 'Method not allowed' });
}