import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Create Supabase client and get user
  const { supabase, user } = await createClient(req, res);
  
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

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Task ID is required' });
  }

  try {
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return await getTask(req, res, id, user.id);
      case 'PUT':
        return await updateTask(req, res, id, user.id, dbUser.role);
      case 'DELETE':
        return await deleteTask(req, res, id, user.id, dbUser.role);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Task API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Get a specific task
async function getTask(req: NextApiRequest, res: NextApiResponse, taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      assignedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
  });
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  // Check if user has access to this task
  if (task.assignedToId !== userId && task.assignedById !== userId) {
    return res.status(403).json({ error: 'You do not have access to this task' });
  }
  
  return res.status(200).json(task);
}

// Update a specific task
async function updateTask(req: NextApiRequest, res: NextApiResponse, taskId: string, userId: string, userRole: string) {
  const { status, proofImageUrl, rejectionReason, title, description, startDate, deadline, duration } = req.body;
  
  // Get the task to check permissions
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  // Prepare update data
  const updateData: any = {};
  
  // Admin/manager can update task details
  if ((userRole === 'ADMIN' || userRole === 'MANAGER') && task.assignedById === userId) {
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (startDate) updateData.startDate = new Date(startDate);
    if (deadline) updateData.deadline = new Date(deadline);
    if (duration) updateData.duration = parseInt(duration);
  }
  
  // Status updates have specific permissions
  if (status) {
    if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
      // Only the assigned employee can mark as in progress or completed
      if (task.assignedToId !== userId) {
        return res.status(403).json({ error: 'Only the assigned employee can update this task status' });
      }
      updateData.status = status;
    } else if (status === 'APPROVED' || status === 'REJECTED') {
      // Only the admin who created the task can approve or reject
      if (task.assignedById !== userId) {
        return res.status(403).json({ error: 'Only the task creator can approve or reject tasks' });
      }
      
      // Rejection requires a reason
      if (status === 'REJECTED' && !rejectionReason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }
      
      updateData.status = status;
      updateData.reviewedAt = new Date();
      
      if (rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }
    }
  }
  
  // Proof image can only be added by the assignee
  if (proofImageUrl && task.assignedToId === userId) {
    updateData.proofImageUrl = proofImageUrl;
  }
  
  // If no valid updates were provided
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No valid updates provided' });
  }
  
  // Update the task
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      assignedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
  
  return res.status(200).json(updatedTask);
}

// Delete a task (admin/manager only)
async function deleteTask(req: NextApiRequest, res: NextApiResponse, taskId: string, userId: string, userRole: string) {
  // Only admins and managers can delete tasks
  if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
    return res.status(403).json({ error: 'Only admins and managers can delete tasks' });
  }
  
  // Get the task to check permissions
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  // Only the creator can delete the task
  if (task.assignedById !== userId) {
    return res.status(403).json({ error: 'Only the task creator can delete this task' });
  }
  
  // Delete all messages for this task first
  await prisma.taskMessage.deleteMany({
    where: { taskId },
  });
  
  // Delete the task
  await prisma.task.delete({
    where: { id: taskId },
  });
  
  return res.status(200).json({ message: 'Task deleted successfully' });
}