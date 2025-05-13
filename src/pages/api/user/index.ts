import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Try to get user from authorization header first
  const userId = req.headers.authorization;
  
  // If no authorization header, try to get from Supabase cookies
  if (!userId) {
    // Check if cookies exist in the request
    if (!req.cookies || Object.keys(req.cookies).length === 0) {
      return res.status(401).json({ error: 'No authentication found' });
    }
    
    try {
      const supabase = createClient(req, res);
      const { data, error } = await supabase.auth.getUser();
      
      if (error || !data.user) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      handleUserRequest(req, res, data.user.id);
    } catch (error) {
      console.error('Error in API handler:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    // Use the user ID from the authorization header
    handleUserRequest(req, res, userId);
  }
}

async function handleUserRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  // Handle GET request - Get user data
  if (req.method === 'GET') {
    try {
      // First try to get user from Prisma
      const userData = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (userData) {
        return res.status(200).json(userData);
      }

      // If not found in Prisma, try to create the user
      // Get email from Supabase if available
      let email = '';
      try {
        const supabase = createClient(req, res);
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          email = data.user.email || '';
        }
      } catch (error) {
        console.error('Error getting user email from Supabase:', error);
      }

      const newUser = await prisma.user.create({
        data: {
          id: userId,
          email: email,
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
      const { firstName, lastName, department, position, role, email } = req.body;

      // First check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        // Create user if not exists
        const newUser = await prisma.user.create({
          data: {
            id: userId,
            email: email || '',
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
        where: { id: userId },
        data: {
          ...(email && { email }),
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(department !== undefined && { department }),
          ...(position !== undefined && { position }),
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