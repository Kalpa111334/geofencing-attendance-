import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check if cookies exist in the request
  if (!req.cookies || Object.keys(req.cookies).length === 0) {
    return res.status(401).json({ error: 'No authentication cookies found' });
  }

  let user;
  try {
    // Get the user from the request
    const supabase = createClient(req, res);
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data.user) {
      console.error('Authentication error:', error);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    user = data.user;
  
    // Check if the user is an admin
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!userData || userData.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
  } catch (authError) {
    console.error('Error in authentication:', authError);
    return res.status(401).json({ error: 'Authentication failed' });
  }

  // Handle GET request - Get all users
  if (req.method === 'GET') {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  // Handle POST request - Create a new user (for admin to create users)
  if (req.method === 'POST') {
    try {
      const { email, firstName, lastName, role, department, position } = req.body;

      // Validate required fields
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Create user in Supabase (this would typically involve sending an invite)
      // For now, we'll just create the user in the database
      // In a real application, you would integrate with Supabase Admin API
      
      // Create user in database
      const newUser = await prisma.user.create({
        data: {
          id: 'placeholder', // This would be the Supabase user ID in a real implementation
          email,
          firstName,
          lastName,
          role: role || 'EMPLOYEE',
          department,
          position,
        },
      });

      return res.status(201).json(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }
  }

  // Return 405 for other methods
  return res.status(405).json({ error: 'Method not allowed' });
}