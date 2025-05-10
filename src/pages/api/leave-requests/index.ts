import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

// Helper function to calculate business days between two dates
function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const curDate = new Date(startDate.getTime());
  while (curDate <= endDate) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  // GET - Fetch leave requests
  if (req.method === 'GET') {
    try {
      const { status, startDate, endDate, userId: queryUserId } = req.query;
      
      // Build filter conditions
      const where: any = {};
      
      // Filter by status if provided
      if (status) {
        where.status = status;
      }
      
      // Filter by date range if provided
      if (startDate || endDate) {
        where.OR = [
          // Leave starts within range
          {
            startDate: {
              ...(startDate && { gte: new Date(startDate as string) }),
              ...(endDate && { lte: new Date(endDate as string) })
            }
          },
          // Leave ends within range
          {
            endDate: {
              ...(startDate && { gte: new Date(startDate as string) }),
              ...(endDate && { lte: new Date(endDate as string) })
            }
          },
          // Leave spans the entire range
          {
            ...(startDate && endDate && {
              AND: [
                { startDate: { lte: new Date(startDate as string) } },
                { endDate: { gte: new Date(endDate as string) } }
              ]
            })
          }
        ];
      }
      
      // For regular employees, only show their own requests
      if (user.role === 'EMPLOYEE') {
        where.userId = userId;
      } 
      // For managers/admins, filter by specific user if requested
      else if (queryUserId) {
        where.userId = queryUserId;
      }
      
      const leaveRequests = await prisma.leaveRequest.findMany({
        where,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              department: true
            }
          },
          leaveType: true,
          reviewer: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          documents: {
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
              fileType: true,
              fileSize: true,
              uploadedAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return res.status(200).json(leaveRequests);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      return res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
  }
  
  // POST - Create a new leave request
  else if (req.method === 'POST') {
    try {
      const { 
        leaveTypeId, 
        startDate, 
        endDate, 
        reason,
        documents = [] 
      } = req.body;
      
      // Validate required fields
      if (!leaveTypeId || !startDate || !endDate || !reason) {
        return res.status(400).json({ 
          error: 'Leave type, start date, end date, and reason are required' 
        });
      }
      
      // Validate reason length
      if (reason.length < 50) {
        return res.status(400).json({ 
          error: 'Reason must be at least 50 characters long' 
        });
      }
      
      // Parse dates
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);
      
      // Validate date range
      if (parsedStartDate > parsedEndDate) {
        return res.status(400).json({ 
          error: 'End date must be after start date' 
        });
      }
      
      // Calculate total days (business days only)
      const totalDays = calculateBusinessDays(parsedStartDate, parsedEndDate);
      
      // Check for overlapping leave requests
      const overlappingRequests = await prisma.leaveRequest.findMany({
        where: {
          userId,
          status: { in: ['PENDING', 'APPROVED'] },
          OR: [
            // New request starts during existing request
            {
              startDate: { lte: parsedStartDate },
              endDate: { gte: parsedStartDate }
            },
            // New request ends during existing request
            {
              startDate: { lte: parsedEndDate },
              endDate: { gte: parsedEndDate }
            },
            // New request completely contains existing request
            {
              startDate: { gte: parsedStartDate },
              endDate: { lte: parsedEndDate }
            }
          ]
        }
      });
      
      if (overlappingRequests.length > 0) {
        return res.status(400).json({ 
          error: 'You already have an overlapping leave request for this period' 
        });
      }
      
      // Handle custom leave types
      let finalLeaveTypeId = leaveTypeId;
      const currentYear = new Date().getFullYear();
      
      if (leaveTypeId === 'custom') {
        // Extract the custom leave type name from the request body
        const customLeaveTypeName = req.body.customLeaveTypeName;
        
        if (!customLeaveTypeName) {
          return res.status(400).json({ 
            error: 'Custom leave type name is required' 
          });
        }
        
        // Create a new leave type in the database
        const newLeaveType = await prisma.leaveType.create({
          data: {
            name: customLeaveTypeName,
            description: 'Custom leave type created by employee',
            color: '#' + Math.floor(Math.random()*16777215).toString(16) // Random color
          }
        });
        
        // Use the newly created leave type ID
        finalLeaveTypeId = newLeaveType.id;
        
        // Create a default leave balance for this new type
        await prisma.leaveBalance.create({
          data: {
            userId,
            leaveTypeId: finalLeaveTypeId,
            year: currentYear,
            totalDays: 15, // Default quota for custom leave types
            pendingDays: totalDays
          }
        });
      } else {
        // For existing leave types, check balance
        const leaveBalance = await prisma.leaveBalance.findUnique({
          where: {
            userId_leaveTypeId_year: {
              userId,
              leaveTypeId,
              year: currentYear
            }
          }
        });
        
        // If no balance record exists, create one with default values
        if (!leaveBalance) {
          await prisma.leaveBalance.create({
            data: {
              userId,
              leaveTypeId,
              year: currentYear,
              totalDays: 15, // Default quota for all leave types
              pendingDays: totalDays
            }
          });
        } else {
          // Check if enough balance is available
          const availableDays = leaveBalance.totalDays - leaveBalance.usedDays - leaveBalance.pendingDays;
          
          if (availableDays < totalDays) {
            return res.status(400).json({ 
              error: `Insufficient leave balance. Available: ${availableDays} days, Requested: ${totalDays} days` 
            });
          }
          
          // Update pending days
          await prisma.leaveBalance.update({
            where: { id: leaveBalance.id },
            data: { pendingDays: leaveBalance.pendingDays + totalDays }
          });
        }
      }
      

      
      // Create leave request
      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          userId,
          leaveTypeId: finalLeaveTypeId,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          totalDays,
          reason,
          documents: {
            create: documents.map((doc: any) => ({
              fileName: doc.fileName,
              fileUrl: doc.fileUrl,
              fileType: doc.fileType,
              fileSize: doc.fileSize
            }))
          }
        },
        include: {
          leaveType: true,
          documents: true
        }
      });
      
      return res.status(201).json(leaveRequest);
    } catch (error) {
      console.error('Error creating leave request:', error);
      return res.status(500).json({ error: 'Failed to create leave request' });
    }
  }
  
  // PUT - Update leave request status (admin/manager only)
  else if (req.method === 'PUT') {
    // Check if user is admin or manager
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return res.status(403).json({ 
        error: 'Only admins and managers can update leave request status' 
      });
    }

    try {
      const { id, status, rejectionReason } = req.body;
      
      if (!id || !status) {
        return res.status(400).json({ 
          error: 'Leave request ID and status are required' 
        });
      }
      
      // Validate status
      if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ 
          error: 'Status must be either APPROVED or REJECTED' 
        });
      }
      
      // If rejecting, reason is required
      if (status === 'REJECTED' && !rejectionReason) {
        return res.status(400).json({ 
          error: 'Rejection reason is required' 
        });
      }
      
      // Get the leave request
      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id },
        include: {
          user: true,
          leaveType: true
        }
      });
      
      if (!leaveRequest) {
        return res.status(404).json({ error: 'Leave request not found' });
      }
      
      // Check if request is already processed
      if (leaveRequest.status !== 'PENDING') {
        return res.status(400).json({ 
          error: `Leave request is already ${leaveRequest.status.toLowerCase()}` 
        });
      }
      
      // Get leave balance
      const currentYear = new Date().getFullYear();
      const leaveBalance = await prisma.leaveBalance.findUnique({
        where: {
          userId_leaveTypeId_year: {
            userId: leaveRequest.userId,
            leaveTypeId: leaveRequest.leaveTypeId,
            year: currentYear
          }
        }
      });
      
      if (!leaveBalance) {
        return res.status(404).json({ error: 'Leave balance not found' });
      }
      
      // Update leave balance based on status
      if (status === 'APPROVED') {
        await prisma.leaveBalance.update({
          where: { id: leaveBalance.id },
          data: {
            usedDays: leaveBalance.usedDays + leaveRequest.totalDays,
            pendingDays: leaveBalance.pendingDays - leaveRequest.totalDays
          }
        });
      } else {
        // If rejected, just remove from pending
        await prisma.leaveBalance.update({
          where: { id: leaveBalance.id },
          data: {
            pendingDays: leaveBalance.pendingDays - leaveRequest.totalDays
          }
        });
      }
      
      // Update leave request
      const updatedLeaveRequest = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: status as 'APPROVED' | 'REJECTED',
          reviewerId: userId,
          reviewedAt: new Date(),
          rejectionReason: status === 'REJECTED' ? rejectionReason : null
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          leaveType: true,
          reviewer: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });
      
      return res.status(200).json(updatedLeaveRequest);
    } catch (error) {
      console.error('Error updating leave request:', error);
      return res.status(500).json({ error: 'Failed to update leave request' });
    }
  }
  
  // DELETE - Cancel a leave request (only for own pending requests)
  else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Leave request ID is required' });
      }
      
      // Get the leave request
      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id: id as string }
      });
      
      if (!leaveRequest) {
        return res.status(404).json({ error: 'Leave request not found' });
      }
      
      // Check if user owns this request or is admin
      if (leaveRequest.userId !== userId && user.role !== 'ADMIN') {
        return res.status(403).json({ 
          error: 'You can only cancel your own leave requests' 
        });
      }
      
      // Check if request is still pending
      if (leaveRequest.status !== 'PENDING') {
        return res.status(400).json({ 
          error: 'Only pending leave requests can be cancelled' 
        });
      }
      
      // Update leave balance
      const currentYear = new Date().getFullYear();
      const leaveBalance = await prisma.leaveBalance.findUnique({
        where: {
          userId_leaveTypeId_year: {
            userId: leaveRequest.userId,
            leaveTypeId: leaveRequest.leaveTypeId,
            year: currentYear
          }
        }
      });
      
      if (leaveBalance) {
        await prisma.leaveBalance.update({
          where: { id: leaveBalance.id },
          data: {
            pendingDays: leaveBalance.pendingDays - leaveRequest.totalDays
          }
        });
      }
      
      // Update leave request status to CANCELLED
      await prisma.leaveRequest.update({
        where: { id: id as string },
        data: { status: 'CANCELLED' }
      });
      
      return res.status(200).json({ message: 'Leave request cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling leave request:', error);
      return res.status(500).json({ error: 'Failed to cancel leave request' });
    }
  }
  
  // Method not allowed
  else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}