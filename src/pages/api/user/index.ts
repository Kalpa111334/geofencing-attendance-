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

  // Handle GET request - Get user data
  if (req.method === 'GET') {
    try {
      // First try to get user from Prisma
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (userData) {
        return res.status(200).json(userData);
      }

      // If not found in Prisma, try to create the user
      const newUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email || '',
          firstName: null,
          lastName: null,
          role: 'EMPLOYEE',
          department: null,
          position: null,
        },
      });

      return res.status(200).json(newUser);
    } catch (error) {
      console.error('Error fetching or creating user data:', error);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }
  }

  // Handle PATCH request - Update user data
  if (req.method === 'PATCH') {
    try {
      const { firstName, lastName, department, position, role } = req.body;

      // First check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!existingUser) {
        // Create user if not exists
        const newUser = await prisma.user.create({
          data: {
            id: user.id,
            email: user.email || '',
            firstName,
            lastName,
            department,
            position,
            role: role || 'EMPLOYEE',
          },
        });
        return res.status(200).json(newUser);
      }

      // Update user data
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName,
          lastName,
          department,
          position,
          ...(role && { role }), // Only include role if it's provided
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