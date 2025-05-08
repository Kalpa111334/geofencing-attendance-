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

  // Handle GET request - Get all locations
  if (req.method === 'GET') {
    try {
      const locations = await prisma.location.findMany();
      return res.status(200).json(locations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      return res.status(500).json({ error: 'Failed to fetch locations' });
    }
  }

  // Handle POST request - Create a new location
  if (req.method === 'POST') {
    try {
      // Get user role from database
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      // Only admins can create locations
      if (dbUser?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can create locations' });
      }

      const { name, address, latitude, longitude, radius } = req.body;

      // Validate required fields
      if (!name || !address || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Create the location
      const location = await prisma.location.create({
        data: {
          name,
          address,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: radius ? parseFloat(radius) : 50, // Default to 50 meters if not provided
          admins: {
            connect: { id: user.id } // Add the creator as an admin
          }
        },
      });

      return res.status(201).json(location);
    } catch (error) {
      console.error('Error creating location:', error);
      return res.status(500).json({ error: 'Failed to create location' });
    }
  }

  // Return 405 for other methods
  return res.status(405).json({ error: 'Method not allowed' });
}