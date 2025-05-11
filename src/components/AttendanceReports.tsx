import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { 
  FaSpinner, 
  FaCalendarAlt, 
  FaDownload, 
  FaFilter, 
  FaSearch,
  FaUserClock,
  FaMapMarkerAlt,
  FaCheck,
  FaTimes,
  FaFilePdf,
  FaWhatsapp,
  FaShareAlt
} from 'react-icons/fa';
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface Location {
  id: string;
  name: string;
}

interface Attendance {
  id: string;
  userId: string;
  user: User;
  locationId: string;
  location: Location;
  checkInTime: string;
  checkOutTime: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

const AttendanceReports: React.FC = () => {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [locations, setLocations] = useState<Location[]>([]);
  const { toast } = useToast();

  // Fetch attendances and locations on component mount
  useEffect(() => {
    fetchAttendances();
    fetchLocations();
  }, []);

  // Fetch all attendances from API
  const fetchAttendances = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/attendance');
      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }
      const data = await response.json();
      setAttendances(data);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch attendance records',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch locations for filtering
  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy h:mm a');
    }
  };

  // Calculate duration between check-in and check-out
  const calculateDuration = (checkInTime: string, checkOutTime: string | null) => {
    if (!checkOutTime) return 'In progress';
    
    const checkIn = new Date(checkInTime).getTime();
    const checkOut = new Date(checkOutTime).getTime();
    const durationMs = checkOut - checkIn;
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  // State for PDF generation
  const [generatingPDF, setGeneratingPDF] = useState<boolean>(false);
  const [pdfData, setPdfData] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedDateRange, setSelectedDateRange] = useState<{start: Date, end: Date}>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  const [showPdfDialog, setShowPdfDialog] = useState<boolean>(false);

  // Export attendance data as CSV
  const exportToCSV = () => {
    const headers = ['Employee', 'Email', 'Location', 'Check In', 'Check Out', 'Duration', 'Status'];
    
    const csvData = filteredAttendances.map(attendance => [
      `${attendance.user.firstName || ''} ${attendance.user.lastName || ''}`.trim() || 'N/A',
      attendance.user.email,
      attendance.location.name,
      formatDate(attendance.checkInTime),
      attendance.checkOutTime ? formatDate(attendance.checkOutTime) : 'N/A',
      calculateDuration(attendance.checkInTime, attendance.checkOutTime),
      attendance.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate PDF data
  const generatePDFData = async () => {
    try {
      setGeneratingPDF(true);
      
      const response = await fetch('/api/attendance/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserId || undefined,
          startDate: selectedDateRange.start.toISOString(),
          endDate: selectedDateRange.end.toISOString(),
          includeDetails: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF data');
      }

      const data = await response.json();
      setPdfData(data);
      setShowPdfDialog(true);
    } catch (error: any) {
      console.error('Error generating PDF data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to generate PDF data',
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Download PDF
  const downloadPDF = () => {
    if (!pdfData) return;
    
    // In a real implementation, you would use a library like jsPDF or pdfmake
    // to generate a proper PDF file. For this example, we'll create a simple HTML
    // representation and convert it to a PDF-like download.
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${pdfData.reportTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .summary { margin: 20px 0; }
          .summary div { margin: 5px 0; }
          .header { display: flex; justify-content: space-between; }
          .footer { margin-top: 30px; font-size: 0.8em; color: #666; }
        </style>
      </head>
      <body>
        <h1>${pdfData.reportTitle}</h1>
        
        <div class="header">
          <div>
            <h2>Employee Information</h2>
            <div>Name: ${pdfData.employeeInfo.name}</div>
            <div>Email: ${pdfData.employeeInfo.email}</div>
            <div>Department: ${pdfData.employeeInfo.department}</div>
            <div>Position: ${pdfData.employeeInfo.position}</div>
          </div>
        </div>
        
        <div class="summary">
          <h2>Attendance Summary</h2>
          <div>Total Days: ${pdfData.summary.totalDays}</div>
          <div>Present Days: ${pdfData.summary.presentDays}</div>
          <div>Late Days: ${pdfData.summary.lateDays}</div>
          <div>Absent Days: ${pdfData.summary.absentDays}</div>
          <div>Attendance Rate: ${pdfData.summary.attendanceRate}%</div>
          <div>Punctuality Rate: ${pdfData.summary.punctualityRate}%</div>
          <div>Average Work Hours: ${pdfData.summary.averageWorkHours} hours</div>
        </div>
        
        <h2>Attendance Details</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Location</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${pdfData.attendances.map(att => `
              <tr>
                <td>${att.date}</td>
                <td>${att.location}</td>
                <td>${att.checkIn}</td>
                <td>${att.checkOut}</td>
                <td>${att.duration}</td>
                <td>${att.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <div>Generated at: ${pdfData.generatedAt}</div>
          <div>Generated by: ${pdfData.generatedBy}</div>
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Success',
      description: 'Attendance report downloaded successfully',
    });
  };

  // Share via WhatsApp
  const shareViaWhatsApp = () => {
    if (!pdfData) return;
    
    // Create a summary text for WhatsApp
    const summaryText = `
*${pdfData.reportTitle}*

*Employee:* ${pdfData.employeeInfo.name}
*Department:* ${pdfData.employeeInfo.department}
*Position:* ${pdfData.employeeInfo.position}

*Attendance Summary:*
- Total Days: ${pdfData.summary.totalDays}
- Present: ${pdfData.summary.presentDays} days (${pdfData.summary.attendanceRate}%)
- Late: ${pdfData.summary.lateDays} days
- Absent: ${pdfData.summary.absentDays} days
- Average Work Hours: ${pdfData.summary.averageWorkHours} hours

Generated at: ${pdfData.generatedAt}
    `.trim();
    
    // Encode the text for a URL
    const encodedText = encodeURIComponent(summaryText);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    
    // Open WhatsApp in a new window
    window.open(whatsappUrl, '_blank');
  };

  // Filter attendances based on search term, status, date, and location
  const filteredAttendances = attendances.filter(attendance => {
    // Search filter
    const matchesSearch = 
      searchTerm === '' || 
      attendance.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (attendance.user.firstName && attendance.user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (attendance.user.lastName && attendance.user.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      attendance.location.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'ALL' || attendance.status === statusFilter;
    
    // Location filter
    const matchesLocation = locationFilter === 'ALL' || attendance.locationId === locationFilter;
    
    // Date filter
    let matchesDate = true;
    const checkInDate = parseISO(attendance.checkInTime);
    
    if (dateFilter === 'today') {
      matchesDate = isToday(checkInDate);
    } else if (dateFilter === 'yesterday') {
      matchesDate = isYesterday(checkInDate);
    } else if (dateFilter === 'thisWeek') {
      matchesDate = isThisWeek(checkInDate);
    } else if (dateFilter === 'thisMonth') {
      matchesDate = isThisMonth(checkInDate);
    }
    
    return matchesSearch && matchesStatus && matchesDate && matchesLocation;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <CardTitle>Attendance Reports</CardTitle>
              <CardDescription>
                View and analyze employee attendance records
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportToCSV}
                disabled={filteredAttendances.length === 0}
                className="flex-1 sm:flex-none"
              >
                <FaDownload className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={generatePDFData}
                disabled={generatingPDF}
                className="flex-1 sm:flex-none"
              >
                {generatingPDF ? (
                  <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FaFilePdf className="mr-2 h-4 w-4" />
                )}
                Generate PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employees or locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PRESENT">Present</SelectItem>
                  <SelectItem value="LATE">Late</SelectItem>
                  <SelectItem value="ABSENT">Absent</SelectItem>
                  <SelectItem value="OVERTIME">Overtime</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <FaSpinner className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : filteredAttendances.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="hidden sm:table-cell">Location</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead className="hidden md:table-cell">Check Out</TableHead>
                      <TableHead className="hidden lg:table-cell">Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendances.map((attendance) => (
                      <TableRow key={attendance.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>
                              {attendance.user.firstName && attendance.user.lastName 
                                ? `${attendance.user.firstName} ${attendance.user.lastName}` 
                                : 'Not set'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {attendance.user.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center">
                            <FaMapMarkerAlt className="mr-2 h-3 w-3 text-muted-foreground" />
                            {attendance.location.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <FaUserClock className="mr-2 h-3 w-3 text-green-500" />
                            {formatDate(attendance.checkInTime)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {attendance.checkOutTime ? (
                            <div className="flex items-center">
                              <FaUserClock className="mr-2 h-3 w-3 text-red-500" />
                              {formatDate(attendance.checkOutTime)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">In progress</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {calculateDuration(attendance.checkInTime, attendance.checkOutTime)}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            attendance.status === 'PRESENT' 
                              ? 'bg-green-100 text-green-800' 
                              : attendance.status === 'LATE' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : attendance.status === 'ABSENT'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                          }`}>
                            {attendance.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No attendance records found matching your search criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF Report Dialog */}
      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Attendance Report</DialogTitle>
            <DialogDescription>
              Preview and download the attendance report or share it via WhatsApp
            </DialogDescription>
          </DialogHeader>
          
          {pdfData && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="border rounded-md p-4 bg-muted/30">
                <h3 className="text-lg font-semibold">{pdfData.reportTitle}</h3>
                
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium">Employee Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Name: <span className="font-medium">{pdfData.employeeInfo.name}</span></div>
                    <div>Email: <span className="font-medium">{pdfData.employeeInfo.email}</span></div>
                    <div>Department: <span className="font-medium">{pdfData.employeeInfo.department}</span></div>
                    <div>Position: <span className="font-medium">{pdfData.employeeInfo.position}</span></div>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium">Attendance Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Total Days: <span className="font-medium">{pdfData.summary.totalDays}</span></div>
                    <div>Present Days: <span className="font-medium">{pdfData.summary.presentDays}</span></div>
                    <div>Late Days: <span className="font-medium">{pdfData.summary.lateDays}</span></div>
                    <div>Absent Days: <span className="font-medium">{pdfData.summary.absentDays}</span></div>
                    <div>Attendance Rate: <span className="font-medium">{pdfData.summary.attendanceRate}%</span></div>
                    <div>Punctuality Rate: <span className="font-medium">{pdfData.summary.punctualityRate}%</span></div>
                    <div>Average Work Hours: <span className="font-medium">{pdfData.summary.averageWorkHours} hours</span></div>
                  </div>
                </div>
                
                {pdfData.attendances.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium">Attendance Details</h4>
                    <div className="text-xs text-muted-foreground">
                      Showing first 5 of {pdfData.attendances.length} records
                    </div>
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2 text-left">Date</th>
                            <th className="p-2 text-left">Check In</th>
                            <th className="p-2 text-left">Check Out</th>
                            <th className="p-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pdfData.attendances.slice(0, 5).map((att: any, index: number) => (
                            <tr key={index} className="border-t">
                              <td className="p-2">{att.date}</td>
                              <td className="p-2">{att.checkIn}</td>
                              <td className="p-2">{att.checkOut}</td>
                              <td className="p-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  att.status === 'PRESENT' 
                                    ? 'bg-green-100 text-green-800' 
                                    : att.status === 'LATE' 
                                      ? 'bg-yellow-100 text-yellow-800' 
                                      : att.status === 'ABSENT'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {att.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 text-xs text-muted-foreground">
                  Generated at: {pdfData.generatedAt} • Generated by: {pdfData.generatedBy}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowPdfDialog(false)}
              className="sm:order-1"
            >
              Close
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                onClick={downloadPDF}
                className="flex-1 sm:flex-none"
              >
                <FaDownload className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button 
                onClick={shareViaWhatsApp}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
              >
                <FaWhatsapp className="mr-2 h-4 w-4" />
                Share via WhatsApp
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceReports;