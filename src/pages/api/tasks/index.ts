import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Create Supabase client
  const supabase = createClient(req, res);
  
  // Get the user from the session
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get user with role from database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true }
  });

  if (!dbUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  try {
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return await getTasks(req, res, user.id, dbUser.role);
      case 'POST':
        return await createTask(req, res, user.id, dbUser.role);
      case 'PUT':
        return await updateTask(req, res, user.id, dbUser.role);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Task API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Get tasks based on user role
async function getTasks(req: NextApiRequest, res: NextApiResponse, userId: string, userRole: string) {
  const { status, employeeId } = req.query;
  
  let whereClause: any = {};
  
  // Filter by status if provided
  if (status) {
    whereClause.status = status;
  }
  
  // For admin/manager, can filter by employee
  if (userRole === 'ADMIN' || userRole === 'MANAGER') {
    if (employeeId) {
      whereClause.assignedToId = employeeId as string;
    }
    
    const tasks = await prisma.task.findMany({
      where: {
        ...whereClause,
        assignedById: userId, // Tasks created by this admin/manager
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return res.status(200).json(tasks);
  } else {
    // For employees, only show tasks assigned to them
    const tasks = await prisma.task.findMany({
      where: {
        ...whereClause,
        assignedToId: userId,
      },
      include: {
        assignedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return res.status(200).json(tasks);
  }
}

// Create a new task (admin/manager only)
async function createTask(req: NextApiRequest, res: NextApiResponse, userId: string, userRole: string) {
  if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
    return res.status(403).json({ error: 'Only admins and managers can create tasks' });
  }
  
  const { title, description, assignedToId, startDate, deadline, duration } = req.body;
  
  // Validate required fields
  if (!title || !description || !assignedToId || !startDate || !deadline || !duration) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Create the task
  const task = await prisma.task.create({
    data: {
      title,
      description,
      assignedToId,
      assignedById: userId,
      startDate: new Date(startDate),
      deadline: new Date(deadline),
      duration: parseInt(duration),
      status: 'ASSIGNED',
    },
  });
  
  return res.status(201).json(task);
}

// Update a task
async function updateTask(req: NextApiRequest, res: NextApiResponse, userId: string, userRole: string) {
  const { id, status, proofImageUrl, rejectionReason } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Task ID is required' });
  }
  
  // Get the task to check permissions
  const task = await prisma.task.findUnique({
    where: { id },
  });
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  // Check permissions based on the update being performed
  if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
    // Only the assigned employee can mark as in progress or completed
    if (task.assignedToId !== userId) {
      return res.status(403).json({ error: 'Only the assigned employee can update this task status' });
    }
  } else if (status === 'APPROVED' || status === 'REJECTED') {
    // Only the admin who created the task can approve or reject
    if (task.assignedById !== userId) {
      return res.status(403).json({ error: 'Only the task creator can approve or reject tasks' });
    }
    
    // Rejection requires a reason
    if (status === 'REJECTED' && !rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
  }
  
  // Prepare update data
  const updateData: any = {};
  
  if (status) {
    updateData.status = status;
  }
  
  if (proofImageUrl) {
    updateData.proofImageUrl = proofImageUrl;
  }
  
  if (rejectionReason) {
    updateData.rejectionReason = rejectionReason;
  }
  
  // Add reviewedAt timestamp for approval/rejection
  if (status === 'APPROVED' || status === 'REJECTED') {
    updateData.reviewedAt = new Date();
  }
  
  // Update the task
  const updatedTask = await prisma.task.update({
    where: { id },
    data: updateData,
  });
  
  return res.status(200).json(updatedTask);
}