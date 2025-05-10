import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { FaCalendarAlt, FaFileDownload, FaSpinner, FaCheck, FaTimes, FaFilter, FaUser, FaBuilding, FaCalendar } from 'react-icons/fa';
import { format, addDays, subDays } from 'date-fns';

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  department: string | null;
  position: string | null;
}

interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
}

interface LeaveDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

interface LeaveRequest {
  id: string;
  userId: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    department: string | null;
  };
  leaveTypeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reviewerId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  documents: LeaveDocument[];
}

const AdminLeaveManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for leave requests
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // State for filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>(undefined);
  const [endDateFilter, setEndDateFilter] = useState<Date | undefined>(undefined);
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('ALL');
  
  // State for leave types and departments
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  
  // State for leave request details
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState<boolean>(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState<boolean>(false);
  
  // State for report generation
  const [reportType, setReportType] = useState<string>('summary');
  const [reportUserId, setReportUserId] = useState<string>('');
  const [reportDepartment, setReportDepartment] = useState<string>('');
  const [reportStartDate, setReportStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [reportEndDate, setReportEndDate] = useState<Date | undefined>(new Date());
  const [reportLeaveType, setReportLeaveType] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  
  // Fetch leave requests, types, and departments on component mount
  useEffect(() => {
    const fetchLeaveData = async () => {
      setIsLoading(true);
      try {
        // Fetch leave requests
        const requestsResponse = await fetch('/api/leave-requests');
        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json();
          setLeaveRequests(requestsData);
          setFilteredRequests(requestsData);
          
          // Extract unique departments
          const uniqueDepartments = [...new Set(requestsData.map((req: LeaveRequest) => 
            req.user.department).filter(Boolean))];
          setDepartments(uniqueDepartments);
          
          // Extract unique employees
          const uniqueEmployees = [...new Map(requestsData.map((req: LeaveRequest) => 
            [req.userId, { 
              id: req.userId, 
              firstName: req.user.firstName, 
              lastName: req.user.lastName, 
              email: req.user.email,
              department: req.user.department
            }])).values()];
          setEmployees(uniqueEmployees);
        }
        
        // Fetch leave types
        const typesResponse = await fetch('/api/leave-types');
        if (typesResponse.ok) {
          const typesData = await typesResponse.json();
          setLeaveTypes(typesData);
        }
      } catch (error) {
        console.error('Error fetching leave data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch leave data',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLeaveData();
  }, [toast]);
  
  // Apply filters when filter values change
  useEffect(() => {
    let filtered = [...leaveRequests];
    
    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }
    
    // Filter by department
    if (departmentFilter !== 'ALL') {
      filtered = filtered.filter(req => req.user.department === departmentFilter);
    }
    
    // Filter by employee
    if (employeeFilter) {
      filtered = filtered.filter(req => req.userId === employeeFilter);
    }
    
    // Filter by date range
    if (startDateFilter || endDateFilter) {
      filtered = filtered.filter(req => {
        const reqStartDate = new Date(req.startDate);
        const reqEndDate = new Date(req.endDate);
        
        if (startDateFilter && endDateFilter) {
          // Request overlaps with filter range
          return (
            (reqStartDate >= startDateFilter && reqStartDate <= endDateFilter) ||
            (reqEndDate >= startDateFilter && reqEndDate <= endDateFilter) ||
            (reqStartDate <= startDateFilter && reqEndDate >= endDateFilter)
          );
        } else if (startDateFilter) {
          // Request ends on or after filter start date
          return reqEndDate >= startDateFilter;
        } else if (endDateFilter) {
          // Request starts on or before filter end date
          return reqStartDate <= endDateFilter;
        }
        
        return true;
      });
    }
    
    // Filter by leave type
    if (leaveTypeFilter !== 'ALL') {
      filtered = filtered.filter(req => req.leaveTypeId === leaveTypeFilter);
    }
    
    setFilteredRequests(filtered);
  }, [
    leaveRequests, 
    statusFilter, 
    departmentFilter, 
    employeeFilter, 
    startDateFilter, 
    endDateFilter, 
    leaveTypeFilter
  ]);
  
  // Reset filters
  const resetFilters = () => {
    setStatusFilter('ALL');
    setDepartmentFilter('ALL');
    setEmployeeFilter('');
    setStartDateFilter(undefined);
    setEndDateFilter(undefined);
    setLeaveTypeFilter('ALL');
  };
  
  // Handle approve leave request
  const handleApproveRequest = async (id: string) => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/leave-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status: 'APPROVED'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve leave request');
      }
      
      // Update leave requests
      const updatedRequest = await response.json();
      setLeaveRequests(prevRequests => 
        prevRequests.map(req => req.id === id ? updatedRequest : req)
      );
      
      toast({
        title: 'Success',
        description: 'Leave request approved successfully',
      });
    } catch (error: any) {
      console.error('Error approving leave request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to approve leave request',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle reject leave request
  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please provide a detailed rejection reason (at least 10 characters)',
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/leave-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedRequest.id,
          status: 'REJECTED',
          rejectionReason
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject leave request');
      }
      
      // Update leave requests
      const updatedRequest = await response.json();
      setLeaveRequests(prevRequests => 
        prevRequests.map(req => req.id === selectedRequest.id ? updatedRequest : req)
      );
      
      // Close dialog and reset form
      setShowRejectionDialog(false);
      setRejectionReason('');
      setSelectedRequest(null);
      
      toast({
        title: 'Success',
        description: 'Leave request rejected successfully',
      });
    } catch (error: any) {
      console.error('Error rejecting leave request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to reject leave request',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Open rejection dialog
  const openRejectionDialog = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectionDialog(true);
  };
  
  // Open details dialog
  const openDetailsDialog = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };
  
  // Generate report
  const handleGenerateReport = async () => {
    try {
      setIsGeneratingReport(true);
      
      const response = await fetch('/api/leave-reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType,
          userId: reportUserId || undefined,
          department: reportDepartment || undefined,
          startDate: reportStartDate?.toISOString() || undefined,
          endDate: reportEndDate?.toISOString() || undefined,
          leaveTypeId: reportLeaveType || undefined
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }
      
      const reportData = await response.json();
      
      // Convert report data to CSV or display in a new window
      const reportWindow = window.open('', '_blank');
      if (reportWindow) {
        reportWindow.document.write(`
          <html>
            <head>
              <title>Leave Report - ${reportData.reportType}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; }
                table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .summary { margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 5px; }
                .print-btn { padding: 10px 15px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
              </style>
            </head>
            <body>
              <h1>${reportData.reportType}</h1>
              <div>Generated on: ${new Date(reportData.generatedAt).toLocaleString()}</div>
              
              <div class="summary">
                <h2>Summary</h2>
                <p>Total Requests: ${reportData.statistics.totalRequests}</p>
                <p>Approved: ${reportData.statistics.approvedRequests}</p>
                <p>Rejected: ${reportData.statistics.rejectedRequests}</p>
                <p>Pending: ${reportData.statistics.pendingRequests}</p>
              </div>
              
              <button class="print-btn" onclick="window.print()">Print Report</button>
              
              ${reportData.leaveRequests ? `
                <h2>Leave Requests</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Days</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${reportData.leaveRequests.map((req: any) => `
                      <tr>
                        <td>${req.user.firstName || ''} ${req.user.lastName || ''} (${req.user.email})</td>
                        <td>${req.leaveType.name}</td>
                        <td>${new Date(req.startDate).toLocaleDateString()}</td>
                        <td>${new Date(req.endDate).toLocaleDateString()}</td>
                        <td>${req.totalDays}</td>
                        <td>${req.status}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : ''}
              
              ${reportData.departmentStats ? `
                <h2>Department Statistics</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Total Requests</th>
                      <th>Approved Requests</th>
                      <th>Total Days Taken</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${reportData.statistics.departmentStats.map((dept: any) => `
                      <tr>
                        <td>${dept.department}</td>
                        <td>${dept.totalRequests}</td>
                        <td>${dept.approvedRequests}</td>
                        <td>${dept.totalDaysTaken}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : ''}
              
              ${reportData.leaveTypeStats ? `
                <h2>Leave Type Statistics</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>Total Requests</th>
                      <th>Approved Requests</th>
                      <th>Total Days Taken</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${reportData.statistics.leaveTypeStats.map((type: any) => `
                      <tr>
                        <td>${type.leaveType.name}</td>
                        <td>${type.totalRequests}</td>
                        <td>${type.approvedRequests}</td>
                        <td>${type.totalDaysTaken}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : ''}
            </body>
          </html>
        `);
        reportWindow.document.close();
      }
      
      toast({
        title: 'Success',
        description: 'Report generated successfully',
      });
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to generate report',
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };
  
  // Format date for display
  const formatDateDisplay = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };
  
  // Get employee full name
  const getEmployeeName = (user: { firstName: string | null; lastName: string | null; email: string }) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      return user.firstName;
    } else {
      return user.email;
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-500">Rejected</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-gray-500">Cancelled</Badge>;
      default:
        return <Badge className="bg-yellow-500">Pending</Badge>;
    }
  };
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">
            <FaCalendarAlt className="mr-2 h-4 w-4" />
            Leave Requests
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FaFileDownload className="mr-2 h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>
        
        {/* Leave Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Leave Requests</CardTitle>
              <CardDescription>
                Manage employee leave requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Filters</h3>
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Reset Filters
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Status Filter */}
                  <div>
                    <Label htmlFor="statusFilter">Status</Label>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger id="statusFilter">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Department Filter */}
                  <div>
                    <Label htmlFor="departmentFilter">Department</Label>
                    <Select
                      value={departmentFilter}
                      onValueChange={setDepartmentFilter}
                    >
                      <SelectTrigger id="departmentFilter">
                        <SelectValue placeholder="Filter by department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Departments</SelectItem>
                        {departments.map((dept, index) => (
                          <SelectItem key={index} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Employee Filter */}
                  <div>
                    <Label htmlFor="employeeFilter">Employee</Label>
                    <Select
                      value={employeeFilter}
                      onValueChange={setEmployeeFilter}
                    >
                      <SelectTrigger id="employeeFilter">
                        <SelectValue placeholder="Filter by employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Employees</SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {getEmployeeName(emp)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Date Range Filter */}
                  <div>
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <FaCalendar className="mr-2 h-4 w-4" />
                          {startDateFilter ? format(startDateFilter, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDateFilter}
                          onSelect={setStartDateFilter}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <FaCalendar className="mr-2 h-4 w-4" />
                          {endDateFilter ? format(endDateFilter, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDateFilter}
                          onSelect={setEndDateFilter}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {/* Leave Type Filter */}
                  <div>
                    <Label htmlFor="leaveTypeFilter">Leave Type</Label>
                    <Select
                      value={leaveTypeFilter}
                      onValueChange={setLeaveTypeFilter}
                    >
                      <SelectTrigger id="leaveTypeFilter">
                        <SelectValue placeholder="Filter by leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Leave Types</SelectItem>
                        {leaveTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Leave Requests Table */}
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <FaSpinner className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{getEmployeeName(request.user)}</TableCell>
                        <TableCell>{request.user.department || 'N/A'}</TableCell>
                        <TableCell>{request.leaveType.name}</TableCell>
                        <TableCell>
                          {formatDateDisplay(request.startDate)} - {formatDateDisplay(request.endDate)}
                        </TableCell>
                        <TableCell>{request.totalDays}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetailsDialog(request)}
                            >
                              View
                            </Button>
                            
                            {request.status === 'PENDING' && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleApproveRequest(request.id)}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? (
                                    <FaSpinner className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FaCheck className="h-4 w-4" />
                                  )}
                                </Button>
                                
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => openRejectionDialog(request)}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? (
                                    <FaSpinner className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FaTimes className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No leave requests found matching the filters
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Rejection Dialog */}
          <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Leave Request</DialogTitle>
                <DialogDescription>
                  Please provide a reason for rejecting this leave request.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Rejection Reason</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a detailed reason for rejection..."
                    rows={4}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectionDialog(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRejectRequest}
                  disabled={isProcessing || !rejectionReason || rejectionReason.trim().length < 10}
                >
                  {isProcessing ? (
                    <>
                      <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Reject Request'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Details Dialog */}
          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Leave Request Details</DialogTitle>
              </DialogHeader>
              
              {selectedRequest && (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium">Employee</h3>
                      <p>{getEmployeeName(selectedRequest.user)}</p>
                      <p className="text-sm text-muted-foreground">{selectedRequest.user.email}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium">Department</h3>
                      <p>{selectedRequest.user.department || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium">Leave Type</h3>
                      <p>{selectedRequest.leaveType.name}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium">Status</h3>
                      <p>{getStatusBadge(selectedRequest.status)}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium">Date Range</h3>
                      <p>
                        {formatDateDisplay(selectedRequest.startDate)} - {formatDateDisplay(selectedRequest.endDate)}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedRequest.totalDays} days</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium">Requested On</h3>
                      <p>{format(new Date(selectedRequest.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Reason</h3>
                    <p className="mt-1 p-3 bg-gray-50 rounded-md">{selectedRequest.reason}</p>
                  </div>
                  
                  {selectedRequest.status === 'REJECTED' && selectedRequest.rejectionReason && (
                    <div>
                      <h3 className="font-medium text-red-500">Rejection Reason</h3>
                      <p className="mt-1 p-3 bg-red-50 text-red-800 rounded-md">
                        {selectedRequest.rejectionReason}
                      </p>
                    </div>
                  )}
                  
                  {selectedRequest.documents && selectedRequest.documents.length > 0 && (
                    <div>
                      <h3 className="font-medium">Supporting Documents</h3>
                      <div className="mt-2 space-y-2">
                        {selectedRequest.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 border rounded-md">
                            <div className="truncate flex-1">
                              <span className="font-medium">{doc.fileName}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({(doc.fileSize / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90"
                            >
                              View
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsDialog(false)}
                >
                  Close
                </Button>
                
                {selectedRequest && selectedRequest.status === 'PENDING' && (
                  <>
                    <Button
                      variant="default"
                      onClick={() => {
                        setShowDetailsDialog(false);
                        handleApproveRequest(selectedRequest.id);
                      }}
                      disabled={isProcessing}
                    >
                      Approve
                    </Button>
                    
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setShowDetailsDialog(false);
                        openRejectionDialog(selectedRequest);
                      }}
                      disabled={isProcessing}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Generate Reports</CardTitle>
              <CardDescription>
                Generate leave reports for employees and departments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Report Type */}
                <div className="space-y-2">
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select
                    value={reportType}
                    onValueChange={setReportType}
                  >
                    <SelectTrigger id="reportType">
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Summary Report</SelectItem>
                      <SelectItem value="individual">Individual Employee Report</SelectItem>
                      <SelectItem value="department">Department Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Report Parameters */}
                <div className="space-y-4">
                  {/* Individual Employee Parameters */}
                  {reportType === 'individual' && (
                    <div className="space-y-2">
                      <Label htmlFor="reportUserId">Select Employee</Label>
                      <Select
                        value={reportUserId}
                        onValueChange={setReportUserId}
                      >
                        <SelectTrigger id="reportUserId">
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {getEmployeeName(emp)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Department Parameters */}
                  {reportType === 'department' && (
                    <div className="space-y-2">
                      <Label htmlFor="reportDepartment">Select Department</Label>
                      <Select
                        value={reportDepartment}
                        onValueChange={setReportDepartment}
                      >
                        <SelectTrigger id="reportDepartment">
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept, index) => (
                            <SelectItem key={index} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Common Parameters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date Range */}
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <FaCalendar className="mr-2 h-4 w-4" />
                            {reportStartDate ? format(reportStartDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={reportStartDate}
                            onSelect={setReportStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <FaCalendar className="mr-2 h-4 w-4" />
                            {reportEndDate ? format(reportEndDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={reportEndDate}
                            onSelect={setReportEndDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {/* Leave Type */}
                    <div className="space-y-2">
                      <Label htmlFor="reportLeaveType">Leave Type (Optional)</Label>
                      <Select
                        value={reportLeaveType}
                        onValueChange={setReportLeaveType}
                      >
                        <SelectTrigger id="reportLeaveType">
                          <SelectValue placeholder="All leave types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Leave Types</SelectItem>
                          {leaveTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleGenerateReport}
                disabled={
                  isGeneratingReport || 
                  (reportType === 'individual' && !reportUserId) ||
                  (reportType === 'department' && !reportDepartment) ||
                  !reportStartDate ||
                  !reportEndDate
                }
                className="w-full"
              >
                {isGeneratingReport ? (
                  <>
                    <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FaFileDownload className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLeaveManagement;