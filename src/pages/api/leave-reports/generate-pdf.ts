import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';
import { format } from 'date-fns';

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

  // Check if the user is an admin for certain operations
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!userData) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Handle POST request - Generate leave summary PDF data
  if (req.method === 'POST') {
    try {
      const { userId, year, includeDetails } = req.body;

      // Validate required fields
      if (!year) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // If userId is provided and the requester is not an admin, check if they're requesting their own data
      if (userId && userData.role !== 'ADMIN' && userId !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You can only access your own leave records' });
      }

      // Determine which user's leave to fetch
      const targetUserId = userId || user.id;

      // Get the target user's details
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        return res.status(404).json({ error: 'Target user not found' });
      }

      // Fetch leave balances for the specified year
      const leaveBalances = await prisma.leaveBalance.findMany({
        where: {
          userId: targetUserId,
          year: parseInt(year),
        },
        include: {
          leaveType: true,
        },
      });

      // Fetch leave requests for the specified year
      const startOfYear = new Date(parseInt(year), 0, 1);
      const endOfYear = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);

      const leaveRequests = await prisma.leaveRequest.findMany({
        where: {
          userId: targetUserId,
          startDate: {
            gte: startOfYear,
          },
          endDate: {
            lte: endOfYear,
          },
        },
        include: {
          leaveType: true,
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { startDate: 'desc' },
      });

      // Calculate leave statistics
      const totalLeavesTaken = leaveRequests
        .filter(req => req.status === 'APPROVED')
        .reduce((sum, req) => sum + req.totalDays, 0);
      
      const totalLeavesRequested = leaveRequests.reduce((sum, req) => sum + req.totalDays, 0);
      
      const pendingLeaves = leaveRequests
        .filter(req => req.status === 'PENDING')
        .reduce((sum, req) => sum + req.totalDays, 0);
      
      const approvedLeaves = leaveRequests
        .filter(req => req.status === 'APPROVED')
        .reduce((sum, req) => sum + req.totalDays, 0);
      
      const rejectedLeaves = leaveRequests
        .filter(req => req.status === 'REJECTED')
        .reduce((sum, req) => sum + req.totalDays, 0);

      // Format leave balances for PDF
      const formattedLeaveBalances = leaveBalances.map(balance => ({
        leaveType: balance.leaveType.name,
        totalDays: balance.totalDays,
        usedDays: balance.usedDays,
        pendingDays: balance.pendingDays,
        remainingDays: balance.totalDays - balance.usedDays - balance.pendingDays,
      }));

      // Format leave requests for PDF
      const formattedLeaveRequests = leaveRequests.map(request => ({
        leaveType: request.leaveType.name,
        startDate: format(new Date(request.startDate), 'yyyy-MM-dd'),
        endDate: format(new Date(request.endDate), 'yyyy-MM-dd'),
        totalDays: request.totalDays,
        status: request.status,
        reason: request.reason,
        reviewedBy: request.reviewer 
          ? `${request.reviewer.firstName || ''} ${request.reviewer.lastName || ''}`.trim() || request.reviewer.email
          : 'N/A',
        reviewedAt: request.reviewedAt ? format(new Date(request.reviewedAt), 'yyyy-MM-dd') : 'N/A',
      }));

      // Prepare the response data
      const pdfData = {
        reportTitle: `Leave Summary Report: ${year}`,
        employeeInfo: {
          name: `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email,
          email: targetUser.email,
          department: targetUser.department || 'N/A',
          position: targetUser.position || 'N/A',
        },
        summary: {
          year,
          totalLeavesTaken,
          totalLeavesRequested,
          pendingLeaves,
          approvedLeaves,
          rejectedLeaves,
        },
        leaveBalances: formattedLeaveBalances,
        leaveRequests: includeDetails ? formattedLeaveRequests : [],
        generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        generatedBy: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
      };

      return res.status(200).json(pdfData);
    } catch (error) {
      console.error('Error generating leave summary PDF data:', error);
      return res.status(500).json({ error: 'Failed to generate leave summary PDF data' });
    }
  }

  // Return 405 for other methods
  return res.status(405).json({ error: 'Method not allowed' });
}