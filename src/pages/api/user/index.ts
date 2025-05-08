import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get the user from the request
  const supabase = createClient({ req, res });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Handle GET request - Get user data
  if (req.method === 'GET') {
    try {
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }
  }

  // Handle PATCH request - Update user data
  if (req.method === 'PATCH') {
    try {
      const { firstName, lastName, department, position } = req.body;

      // Update user data
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName,
          lastName,
          department,
          position,
        },
      });

      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error('Error updating user data:', error);
      return res.status(500).json({ error: 'Failed to update user data' });
    }
  }

  // Return 405 for other methods
  return res.status(405).json({ error: 'Method not allowed' });
}