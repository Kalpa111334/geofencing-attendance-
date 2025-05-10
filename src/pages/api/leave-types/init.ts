import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

// Default leave types to initialize
const defaultLeaveTypes = [
  {
    name: 'Annual Leave',
    description: 'Regular paid time off for vacation or personal matters',
    color: '#4CAF50' // Green
  },
  {
    name: 'Sick Leave',
    description: 'Leave due to illness or medical appointments',
    color: '#F44336' // Red
  },
  {
    name: 'Maternity Leave',
    description: 'Leave for expectant or new mothers',
    color: '#E91E63' // Pink
  },
  {
    name: 'Paternity Leave',
    description: 'Leave for new fathers',
    color: '#9C27B0' // Purple
  },
  {
    name: 'Bereavement Leave',
    description: 'Leave due to death of a family member',
    color: '#607D8B' // Blue Grey
  },
  {
    name: 'Unpaid Leave',
    description: 'Leave without pay',
    color: '#9E9E9E' // Grey
  }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Create Supabase client with admin privileges
  const supabase = createClient(req, res);
  
  // Get user from session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;

  // Get user role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Only admins can initialize leave types
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only admins can initialize leave types' });
  }

  try {
    // Check if leave types already exist
    const existingLeaveTypes = await prisma.leaveType.findMany();
    
    if (existingLeaveTypes.length > 0) {
      return res.status(200).json({ 
        message: 'Leave types already initialized', 
        count: existingLeaveTypes.length,
        leaveTypes: existingLeaveTypes
      });
    }
    
    // Create default leave types
    const createdLeaveTypes = await prisma.leaveType.createMany({
      data: defaultLeaveTypes,
      skipDuplicates: true
    });
    
    // Fetch the created leave types
    const newLeaveTypes = await prisma.leaveType.findMany();
    
    return res.status(201).json({
      message: 'Leave types initialized successfully',
      count: createdLeaveTypes.count,
      leaveTypes: newLeaveTypes
    });
  } catch (error) {
    console.error('Error initializing leave types:', error);
    return res.status(500).json({ error: 'Failed to initialize leave types' });
  }
}