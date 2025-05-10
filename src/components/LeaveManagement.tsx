import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FaCalendarAlt, FaFileUpload, FaSpinner, FaCheck, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { format, differenceInDays } from 'date-fns';

interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
}

interface LeaveBalance {
  id: string;
  leaveTypeId: string;
  leaveType: LeaveType;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  year: number;
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

const LeaveManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for leave request form
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [customLeaveType, setCustomLeaveType] = useState<string>('');
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string>('custom');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState<string>('');
  const [documents, setDocuments] = useState<File[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // State for leave balances and history
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Fetch leave types, balances, and history on component mount
  useEffect(() => {
    const fetchLeaveData = async () => {
      setIsLoading(true);
      try {
        // Fetch leave types (previously used leave types)
        const typesResponse = await fetch('/api/leave-types');
        if (typesResponse.ok) {
          const typesData = await typesResponse.json();
          setLeaveTypes(typesData);
          // Default to custom leave type
          setSelectedLeaveTypeId('custom');
        }
        
        // Fetch leave balances
        const balancesResponse = await fetch('/api/leave-balances');
        if (balancesResponse.ok) {
          const balancesData = await balancesResponse.json();
          setLeaveBalances(balancesData);
        }
        
        // Fetch leave history
        const historyResponse = await fetch('/api/leave-requests');
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setLeaveHistory(historyData);
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
  
  // Calculate total leave days
  const calculateLeaveDays = () => {
    if (!startDate || !endDate) return 0;
    
    // Add 1 to include both start and end dates
    return differenceInDays(endDate, startDate) + 1;
  };
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      
      // Validate file types (PDF or JPG/JPEG)
      const validFiles = newFiles.filter(file => 
        file.type === 'application/pdf' || 
        file.type === 'image/jpeg' || 
        file.type === 'image/jpg'
      );
      
      if (validFiles.length !== newFiles.length) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Only PDF and JPG/JPEG files are allowed',
        });
      }
      
      // Validate file size (max 5MB)
      const validSizeFiles = validFiles.filter(file => file.size <= 5 * 1024 * 1024);
      
      if (validSizeFiles.length !== validFiles.length) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Maximum file size is 5MB',
        });
      }
      
      setDocuments([...documents, ...validSizeFiles]);
    }
  };
  
  // Remove a document from the list
  const removeDocument = (index: number) => {
    const newDocuments = [...documents];
    newDocuments.splice(index, 1);
    setDocuments(newDocuments);
  };
  
  // Upload documents to server
  const uploadDocuments = async () => {
    const uploadedDocs: Array<{
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    }> = [];
    
    for (const file of documents) {
      try {
        // Convert file to base64
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
        
        // Upload file
        const response = await fetch('/api/leave-documents/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileData: base64Data,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          uploadedDocs.push(data as any);
        } else {
          throw new Error('Failed to upload document');
        }
      } catch (error) {
        console.error('Error uploading document:', error);
        throw error;
      }
    }
    
    return uploadedDocs;
  };
  
  // Submit leave request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!selectedLeaveTypeId || (selectedLeaveTypeId === 'custom' && !customLeaveType)) || !startDate || !endDate || !reason) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please fill in all required fields',
      });
      return;
    }
    
    if (reason.length < 50) {
      toast({
        variant: 'destructive',
        title: 'Reason too short',
        description: 'Reason must be at least 50 characters long',
      });
      return;
    }
    
    if (startDate > endDate) {
      toast({
        variant: 'destructive',
        title: 'Invalid date range',
        description: 'End date must be after start date',
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Upload documents if any
      let uploadedDocs: any[] = [];
      if (documents.length > 0) {
        uploadedDocs = await uploadDocuments();
      }
      
      // Get custom leave type name
      const customLeaveTypeName = selectedLeaveTypeId === 'custom' ? customLeaveType : '';
      
      // Submit leave request
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaveTypeId: selectedLeaveTypeId === 'custom' ? 'custom' : selectedLeaveTypeId,
          customLeaveTypeName, // Pass the custom leave type name
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          reason,
          documents: uploadedDocs,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit leave request');
      }
      
      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setReason('');
      setDocuments([]);
      setUploadedDocuments([]);
      
      toast({
        title: 'Success',
        description: 'Leave request submitted successfully',
      });
      
      // Refresh leave history and balances
      const historyResponse = await fetch('/api/leave-requests');
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setLeaveHistory(historyData);
      }
      
      const balancesResponse = await fetch('/api/leave-balances');
      if (balancesResponse.ok) {
        const balancesData = await balancesResponse.json();
        setLeaveBalances(balancesData);
      }
    } catch (error: any) {
      console.error('Error submitting leave request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to submit leave request',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Cancel a leave request
  const handleCancelRequest = async (id: string) => {
    try {
      const response = await fetch(`/api/leave-requests?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel leave request');
      }
      
      toast({
        title: 'Success',
        description: 'Leave request cancelled successfully',
      });
      
      // Refresh leave history and balances
      const historyResponse = await fetch('/api/leave-requests');
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setLeaveHistory(historyData);
      }
      
      const balancesResponse = await fetch('/api/leave-balances');
      if (balancesResponse.ok) {
        const balancesData = await balancesResponse.json();
        setLeaveBalances(balancesData);
      }
    } catch (error: any) {
      console.error('Error cancelling leave request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to cancel leave request',
      });
    }
  };
  
  // Get status badge color
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
  
  // Calculate available leave days
  const getAvailableDays = (balance: LeaveBalance) => {
    return balance.totalDays - balance.usedDays - balance.pendingDays;
  };
  
  // Format date for display
  const formatDateDisplay = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="request" className="space-y-4">
        <TabsList>
          <TabsTrigger value="request">
            <FaCalendarAlt className="mr-2 h-4 w-4" />
            Request Leave
          </TabsTrigger>
          <TabsTrigger value="balance">
            <FaInfoCircle className="mr-2 h-4 w-4" />
            Leave Balance
          </TabsTrigger>
          <TabsTrigger value="history">
            <FaCheck className="mr-2 h-4 w-4" />
            Leave History
          </TabsTrigger>
        </TabsList>
        
        {/* Leave Request Form */}
        <TabsContent value="request">
          <Card>
            <CardHeader>
              <CardTitle>Request Leave</CardTitle>
              <CardDescription>
                Submit a new leave request. All fields marked with * are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Leave Type */}
                  <div className="space-y-2">
                    <Label htmlFor="leaveType">Leave Type *</Label>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <Select
                          value={selectedLeaveTypeId}
                          onValueChange={setSelectedLeaveTypeId}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger id="leaveType" className="flex-1">
                            <SelectValue placeholder="Select leave type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="custom">Enter New Leave Type</SelectItem>
                            {leaveTypes.length > 0 && (
                              <>
                                <SelectItem value="divider" disabled>
                                  ───── Previously Used ─────
                                </SelectItem>
                                {leaveTypes.map((type) => (
                                  <SelectItem key={type.id} value={type.id}>
                                    {type.name}
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Custom Leave Type Input - Always show when 'custom' is selected */}
                      {selectedLeaveTypeId === 'custom' && (
                        <div className="pt-2">
                          <Label htmlFor="customLeaveType" className="text-xs mb-1 block">
                            Enter Leave Type Name
                          </Label>
                          <Input
                            id="customLeaveType"
                            placeholder="E.g., Sick Leave, Vacation, Family Emergency"
                            className="w-full"
                            value={customLeaveType}
                            onChange={(e) => setCustomLeaveType(e.target.value.trim())}
                            disabled={isSubmitting}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Specify the type of leave you are requesting
                          </p>
                        </div>
                      )}
                      
                      {/* Show available balance for selected leave type */}
                      {selectedLeaveTypeId && 
                       selectedLeaveTypeId !== 'custom' && 
                       leaveBalances.length > 0 && (
                        <div className="text-sm text-muted-foreground mt-2">
                          {(() => {
                            const balance = leaveBalances.find(b => b.leaveTypeId === selectedLeaveTypeId);
                            if (balance) {
                              const available = getAvailableDays(balance);
                              return `Available: ${available} days`;
                            }
                            return null;
                          })()}
                        </div>
                      )}
                      
                      {/* Message for custom leave types */}
                      {selectedLeaveTypeId === 'custom' && (
                        <div className="text-sm text-amber-600 mt-2 flex items-center">
                          <FaInfoCircle className="mr-1 h-3 w-3" />
                          No pre-defined balance for custom leave types
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Date Range */}
                  <div className="space-y-2">
                    <Label>Date Range *</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <Label htmlFor="startDate" className="text-xs">Start Date</Label>
                        <div className="border rounded-md p-2">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            disabled={isSubmitting}
                            initialFocus
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="endDate" className="text-xs">End Date</Label>
                        <div className="border rounded-md p-2">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            disabled={isSubmitting || !startDate}
                            initialFocus
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Show total days */}
                    {startDate && endDate && (
                      <div className="text-sm text-muted-foreground mt-2">
                        Total: {calculateLeaveDays()} days
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Reason */}
                <div className="space-y-2">
                  <Label htmlFor="reason">
                    Reason for Leave * <span className="text-xs text-muted-foreground">(minimum 50 characters)</span>
                  </Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please provide a detailed reason for your leave request..."
                    disabled={isSubmitting}
                    rows={4}
                  />
                  <div className="text-xs text-muted-foreground">
                    {reason.length}/50 characters
                  </div>
                </div>
                
                {/* Supporting Documents */}
                <div className="space-y-2">
                  <Label htmlFor="documents">
                    Supporting Documents <span className="text-xs text-muted-foreground">(optional)</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="documents"
                      type="file"
                      onChange={handleFileChange}
                      disabled={isSubmitting}
                      accept=".pdf,.jpg,.jpeg"
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" disabled={isSubmitting}>
                      <FaFileUpload className="mr-2 h-4 w-4" />
                      Browse
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Accepted formats: PDF, JPG/JPEG (max 5MB)
                  </div>
                  
                  {/* Document List */}
                  {documents.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <Label>Selected Documents:</Label>
                      <div className="space-y-2">
                        {documents.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                            <div className="truncate flex-1">
                              <span className="font-medium">{doc.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({(doc.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocument(index)}
                              disabled={isSubmitting}
                            >
                              <FaTimes className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || (selectedLeaveTypeId === 'custom' && !customLeaveType) || !startDate || !endDate || reason.length < 50}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Leave Request'
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Leave Balance */}
        <TabsContent value="balance">
          <Card>
            <CardHeader>
              <CardTitle>Leave Balance</CardTitle>
              <CardDescription>
                Your current leave balance for the year {new Date().getFullYear()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <FaSpinner className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : leaveBalances.length > 0 ? (
                <div className="space-y-6">
                  {leaveBalances.map((balance) => {
                    const available = getAvailableDays(balance);
                    const percentUsed = Math.round((balance.usedDays / balance.totalDays) * 100);
                    const percentPending = Math.round((balance.pendingDays / balance.totalDays) * 100);
                    
                    return (
                      <div key={balance.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">{balance.leaveType.name}</h3>
                          <span className="text-sm">
                            {available} / {balance.totalDays} days available
                          </span>
                        </div>
                        <div className="h-2 relative bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="absolute left-0 top-0 h-full bg-primary"
                            style={{ width: `${percentUsed}%` }}
                          />
                          <div
                            className="absolute h-full bg-yellow-400"
                            style={{ 
                              left: `${percentUsed}%`,
                              width: `${percentPending}%` 
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Used: {balance.usedDays} days</span>
                          <span>Pending: {balance.pendingDays} days</span>
                          <span>Available: {available} days</span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Summary Chart */}
                  <div className="mt-8 pt-6 border-t">
                    <h3 className="font-medium mb-4">Leave Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {leaveBalances.map((balance) => {
                        const available = getAvailableDays(balance);
                        const percentUsed = Math.round((balance.usedDays / balance.totalDays) * 100);
                        
                        return (
                          <div key={balance.id} className="text-center">
                            <div className="relative inline-block w-20 h-20">
                              <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path
                                  className="stroke-current text-gray-200"
                                  fill="none"
                                  strokeWidth="3"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  className="stroke-current text-primary"
                                  fill="none"
                                  strokeWidth="3"
                                  strokeDasharray={`${percentUsed}, 100`}
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <text
                                  x="18"
                                  y="20.35"
                                  className="fill-current text-xs font-medium"
                                  textAnchor="middle"
                                >
                                  {percentUsed}%
                                </text>
                              </svg>
                            </div>
                            <div className="mt-2 text-sm font-medium">{balance.leaveType.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No leave balances found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Leave History */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Leave History</CardTitle>
              <CardDescription>
                Your leave request history and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <FaSpinner className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : leaveHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveHistory.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell>{leave.leaveType.name}</TableCell>
                        <TableCell>
                          {formatDateDisplay(leave.startDate)} - {formatDateDisplay(leave.endDate)}
                        </TableCell>
                        <TableCell>{leave.totalDays}</TableCell>
                        <TableCell>{getStatusBadge(leave.status)}</TableCell>
                        <TableCell>
                          {leave.status === 'PENDING' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelRequest(leave.id)}
                            >
                              Cancel
                            </Button>
                          )}
                          {leave.status === 'REJECTED' && leave.rejectionReason && (
                            <div className="text-xs text-red-500">
                              Reason: {leave.rejectionReason}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No leave history found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeaveManagement;