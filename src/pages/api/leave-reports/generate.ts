import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

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

  // Only admins and managers can generate reports
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
    return res.status(403).json({ 
      error: 'Only admins and managers can generate reports' 
    });
  }

  try {
    const { 
      reportType, 
      userId: targetUserId, 
      department, 
      startDate, 
      endDate, 
      leaveTypeId 
    } = req.body;
    
    if (!reportType) {
      return res.status(400).json({ error: 'Report type is required' });
    }
    
    // Parse dates if provided
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;
    
    // Build filter conditions
    const where: any = {};
    
    // Filter by date range if provided
    if (parsedStartDate || parsedEndDate) {
      where.OR = [
        // Leave starts within range
        {
          startDate: {
            ...(parsedStartDate && { gte: parsedStartDate }),
            ...(parsedEndDate && { lte: parsedEndDate })
          }
        },
        // Leave ends within range
        {
          endDate: {
            ...(parsedStartDate && { gte: parsedStartDate }),
            ...(parsedEndDate && { lte: parsedEndDate })
          }
        },
        // Leave spans the entire range
        {
          ...(parsedStartDate && parsedEndDate && {
            AND: [
              { startDate: { lte: parsedStartDate } },
              { endDate: { gte: parsedEndDate } }
            ]
          })
        }
      ];
    }
    
    // Filter by leave type if provided
    if (leaveTypeId) {
      where.leaveTypeId = leaveTypeId;
    }
    
    // Generate report based on type
    let reportData;
    
    // Individual employee report
    if (reportType === 'individual' && targetUserId) {
      where.userId = targetUserId;
      
      // Get employee details
      const employee = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          department: true,
          position: true
        }
      });
      
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      // Get leave requests
      const leaveRequests = await prisma.leaveRequest.findMany({
        where,
        include: {
          leaveType: true,
          reviewer: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { startDate: 'desc' }
      });
      
      // Get leave balances
      const currentYear = new Date().getFullYear();
      const leaveBalances = await prisma.leaveBalance.findMany({
        where: {
          userId: targetUserId,
          year: currentYear
        },
        include: {
          leaveType: true
        }
      });
      
      // Calculate statistics
      const totalRequests = leaveRequests.length;
      const approvedRequests = leaveRequests.filter(req => req.status === 'APPROVED').length;
      const rejectedRequests = leaveRequests.filter(req => req.status === 'REJECTED').length;
      const pendingRequests = leaveRequests.filter(req => req.status === 'PENDING').length;
      
      const totalDaysTaken = leaveRequests
        .filter(req => req.status === 'APPROVED')
        .reduce((sum, req) => sum + req.totalDays, 0);
      
      reportData = {
        reportType: 'Individual Employee Report',
        employee,
        leaveRequests,
        leaveBalances,
        statistics: {
          totalRequests,
          approvedRequests,
          rejectedRequests,
          pendingRequests,
          totalDaysTaken
        },
        generatedAt: new Date(),
        generatedBy: {
          id: userId,
          role: user.role
        }
      };
    }
    
    // Department report
    else if (reportType === 'department' && department) {
      // Get all employees in the department
      const employees = await prisma.user.findMany({
        where: { department },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          position: true
        }
      });
      
      if (employees.length === 0) {
        return res.status(404).json({ 
          error: 'No employees found in this department' 
        });
      }
      
      // Get leave requests for all employees in the department
      where.userId = { in: employees.map(emp => emp.id) };
      
      const leaveRequests = await prisma.leaveRequest.findMany({
        where,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              position: true
            }
          },
          leaveType: true
        },
        orderBy: [
          { user: { firstName: 'asc' } },
          { startDate: 'desc' }
        ]
      });
      
      // Calculate statistics
      const totalRequests = leaveRequests.length;
      const approvedRequests = leaveRequests.filter(req => req.status === 'APPROVED').length;
      const rejectedRequests = leaveRequests.filter(req => req.status === 'REJECTED').length;
      const pendingRequests = leaveRequests.filter(req => req.status === 'PENDING').length;
      
      // Group by employee
      const employeeStats = employees.map(emp => {
        const empRequests = leaveRequests.filter(req => req.userId === emp.id);
        const totalDaysTaken = empRequests
          .filter(req => req.status === 'APPROVED')
          .reduce((sum, req) => sum + req.totalDays, 0);
        
        return {
          employee: emp,
          totalRequests: empRequests.length,
          approvedRequests: empRequests.filter(req => req.status === 'APPROVED').length,
          totalDaysTaken
        };
      });
      
      reportData = {
        reportType: 'Department Report',
        department,
        employees,
        leaveRequests,
        statistics: {
          totalRequests,
          approvedRequests,
          rejectedRequests,
          pendingRequests,
          employeeStats
        },
        generatedAt: new Date(),
        generatedBy: {
          id: userId,
          role: user.role
        }
      };
    }
    
    // Summary report
    else if (reportType === 'summary') {
      // Get all leave requests within the date range
      const leaveRequests = await prisma.leaveRequest.findMany({
        where,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              department: true,
              position: true
            }
          },
          leaveType: true
        }
      });
      
      // Get all leave types
      const leaveTypes = await prisma.leaveType.findMany();
      
      // Calculate statistics
      const totalRequests = leaveRequests.length;
      const approvedRequests = leaveRequests.filter(req => req.status === 'APPROVED').length;
      const rejectedRequests = leaveRequests.filter(req => req.status === 'REJECTED').length;
      const pendingRequests = leaveRequests.filter(req => req.status === 'PENDING').length;
      
      // Group by department
      const deptSet = new Set<string>();
      leaveRequests.forEach(req => {
        if (req.user.department) {
          deptSet.add(req.user.department);
        }
      });
      const departments = Array.from(deptSet);
      const departmentStats = departments.map(dept => {
        const deptRequests = leaveRequests.filter(req => req.user.department === dept);
        const totalDaysTaken = deptRequests
          .filter(req => req.status === 'APPROVED')
          .reduce((sum, req) => sum + req.totalDays, 0);
        
        return {
          department: dept,
          totalRequests: deptRequests.length,
          approvedRequests: deptRequests.filter(req => req.status === 'APPROVED').length,
          totalDaysTaken
        };
      });
      
      // Group by leave type
      const leaveTypeStats = leaveTypes.map(type => {
        const typeRequests = leaveRequests.filter(req => req.leaveTypeId === type.id);
        const totalDaysTaken = typeRequests
          .filter(req => req.status === 'APPROVED')
          .reduce((sum, req) => sum + req.totalDays, 0);
        
        return {
          leaveType: type,
          totalRequests: typeRequests.length,
          approvedRequests: typeRequests.filter(req => req.status === 'APPROVED').length,
          totalDaysTaken
        };
      });
      
      reportData = {
        reportType: 'Summary Report',
        dateRange: {
          startDate: parsedStartDate,
          endDate: parsedEndDate
        },
        statistics: {
          totalRequests,
          approvedRequests,
          rejectedRequests,
          pendingRequests,
          departmentStats,
          leaveTypeStats
        },
        generatedAt: new Date(),
        generatedBy: {
          id: userId,
          role: user.role
        }
      };
    }
    
    else {
      return res.status(400).json({ 
        error: 'Invalid report type or missing required parameters' 
      });
    }
    
    return res.status(200).json(reportData);
  } catch (error) {
    console.error('Error generating report:', error);
    return res.status(500).json({ error: 'Failed to generate report' });
  }
}