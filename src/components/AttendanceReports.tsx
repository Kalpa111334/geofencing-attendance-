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
  FaSpinner, 
  FaSearch,
  FaUserClock,
  FaMapMarkerAlt,
  FaFilePdf,
  FaWhatsapp,
  FaDownload,
  FaCalendarAlt
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
  const [generatingPDF, setGeneratingPDF] = useState<boolean>(false);
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

  // Generate and open PDF report
  const generatePDFReport = async () => {
    try {
      setGeneratingPDF(true);
      
      // Get the date range for the report (last 30 days by default)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      // Fetch the data for the report
      const response = await fetch('/api/attendance/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          includeDetails: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report data');
      }

      const reportData = await response.json();
      
      // Generate PDF using jsPDF and jspdf-autotable
      const generatePDF = async () => {
        const { default: jsPDF } = await import('jspdf');
        await import('jspdf-autotable');
        
        // Create a new PDF document
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        // Add header with icon and title
        doc.setFillColor(41, 98, 255); // Primary blue color
        doc.rect(0, 0, 210, 25, 'F');
        
        // Add title with icon
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('📊 Employee Attendance Report', 105, 15, { align: 'center' });
        
        // Add period information
        doc.setFontSize(10);
        doc.text(`Period: ${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`, 105, 22, { align: 'center' });
        
        // Prepare table data with the requested structure: Employee | Location | Check In | Check Out | Duration | Status
        const tableColumn = ["Employee", "Location", "Check In", "Check Out", "Duration", "Status"];
        const tableRows = reportData.attendances.map((att: any) => [
          att.employee,
          att.location,
          att.checkIn,
          att.checkOut,
          att.duration,
          att.status
        ]);
        
        // Add the table
        (doc as any).autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: 35,
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { 
            fillColor: [41, 98, 255], 
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 35 }, // Employee
            1: { cellWidth: 30 }, // Location
            2: { cellWidth: 30 }, // Check In
            3: { cellWidth: 30 }, // Check Out
            4: { cellWidth: 25 }, // Duration
            5: { // Status column
              cellWidth: 25,
              cellCallback: function(cell: any, data: any) {
                if (data.raw[5] === 'PRESENT') {
                  cell.styles.textColor = [0, 128, 0]; // Green for present
                } else if (data.raw[5] === 'LATE') {
                  cell.styles.textColor = [255, 165, 0]; // Orange for late
                } else if (data.raw[5] === 'ABSENT') {
                  cell.styles.textColor = [255, 0, 0]; // Red for absent
                }
              }
            }
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          didDrawPage: function(data: any) {
            // Add page number at the bottom of each page
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`Page ${data.pageNumber} of ${data.pageCount}`, 180, 287);
            
            // Add header to each page after the first page
            if (data.pageNumber > 1) {
              doc.setFillColor(41, 98, 255);
              doc.rect(0, 0, 210, 25, 'F');
              
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(16);
              doc.setTextColor(255, 255, 255);
              doc.text('📊 Employee Attendance Report', 105, 15, { align: 'center' });
              
              doc.setFontSize(10);
              doc.text(`Period: ${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`, 105, 22, { align: 'center' });
            }
          }
        });
        
        // Add footer
        doc.setFillColor(245, 245, 245);
        doc.rect(0, 277, 210, 20, 'F');
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated at: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 10, 283);
        doc.text(`Generated by: ${reportData.generatedBy || 'System'}`, 10, 288);
        
        // Generate a blob from the PDF
        const pdfBlob = doc.output('blob');
        
        // Create a URL for the blob
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Open the PDF in a new tab
        window.open(pdfUrl, '_blank');
        
        // Create a download link for the PDF
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `Attendance_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
        
        // Store the URL for potential sharing
        setPdfUrl(pdfUrl);
        setPdfBlob(pdfBlob);
        
        toast({
          title: 'Success',
          description: 'Attendance report generated successfully',
        });
      };
      
      // Generate the PDF
      await generatePDF();
      
    } catch (error: any) {
      console.error('Error generating PDF report:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to generate PDF report',
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  // State for PDF sharing
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  // Download the generated PDF
  const downloadPDF = () => {
    if (!pdfUrl || !pdfBlob) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No PDF has been generated yet',
      });
      return;
    }
    
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `Attendance_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
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
    if (!pdfUrl) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No PDF has been generated yet',
      });
      return;
    }
    
    // Create a simple text message for WhatsApp
    const message = `📊 *Employee Attendance Report*\n\nI'm sharing an attendance report generated on ${format(new Date(), 'MMM d, yyyy h:mm a')}.\n\nPlease check the attached PDF for details.`;
    
    // Encode the message for a URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Open WhatsApp in a new window
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: 'WhatsApp Share',
      description: 'Sharing attendance report via WhatsApp',
    });
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
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm"
                onClick={generatePDFReport}
                disabled={generatingPDF}
                className="flex-1 sm:flex-none"
              >
                {generatingPDF ? (
                  <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FaFilePdf className="mr-2 h-4 w-4" />
                )}
                Generate Report
              </Button>
              {pdfUrl && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={downloadPDF}
                    className="flex-1 sm:flex-none"
                  >
                    <FaDownload className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={shareViaWhatsApp}
                    className="flex-1 sm:flex-none"
                  >
                    <FaWhatsapp className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </>
              )}
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
    </div>
  );
};

export default AttendanceReports;