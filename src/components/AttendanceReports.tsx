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
      
      // Get the date range based on the selected filter
      const endDate = new Date();
      let startDate = new Date();
      
      // Determine date range based on selected filter
      if (dateFilter === 'today') {
        // Just today
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'yesterday') {
        // Just yesterday
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
      } else if (dateFilter === 'thisWeek') {
        // This week (starting from Sunday or Monday depending on locale)
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        startDate = new Date(startDate.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'thisMonth') {
        // This month
        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      } else {
        // Default to last 30 days
        startDate.setDate(startDate.getDate() - 30);
      }
      
      console.log('Generating PDF report for period:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: statusFilter,
        location: locationFilter
      });
      
      // Prepare request body with filters
      const requestBody: any = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        includeDetails: true,
      };
      
      // Add location filter if specific location is selected
      if (locationFilter !== 'ALL') {
        requestBody.locationId = locationFilter;
      }
      
      // Add status filter if specific status is selected
      if (statusFilter !== 'ALL') {
        requestBody.status = statusFilter;
      }
      
      // Fetch the data for the report with filters
      const response = await fetch('/api/attendance/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response from API:', errorData);
        throw new Error(errorData.error || 'Failed to generate report data');
      }

      const reportData = await response.json();
      console.log('Successfully received report data:', {
        attendancesCount: reportData.attendances?.length || 0,
        summary: reportData.summary
      });
      
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
        
        // Add period and filter information
        doc.setFontSize(10);
        doc.text(`Period: ${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`, 105, 22, { align: 'center' });
        
        // Add filter information below the title
        let filterText = '';
        if (statusFilter !== 'ALL') {
          filterText += `Status: ${statusFilter} | `;
        }
        if (locationFilter !== 'ALL') {
          const locationName = locations.find(loc => loc.id === locationFilter)?.name || locationFilter;
          filterText += `Location: ${locationName} | `;
        }
        
        // Remove trailing separator if exists
        if (filterText.endsWith(' | ')) {
          filterText = filterText.slice(0, -3);
        }
        
        // Only display filter text if filters are applied
        if (filterText) {
          doc.setFontSize(8);
          doc.text(`Filters: ${filterText}`, 105, 28, { align: 'center' });
        }
        
        // Debug the report data
        console.log('Report data received:', reportData);
        
        // Check if attendances array exists and has data
        if (!reportData.attendances || reportData.attendances.length === 0) {
          console.error('No attendance data found in the report data');
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No attendance data available for the selected period',
          });
          
          // Add a message to the PDF
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(12);
          doc.text('No attendance data available for the selected period', 105, 50, { align: 'center' });
          
          // Generate a blob from the PDF
          const pdfBlob = doc.output('blob');
          const pdfUrl = URL.createObjectURL(pdfBlob);
          window.open(pdfUrl, '_blank');
          setPdfUrl(pdfUrl);
          setPdfBlob(pdfBlob);
          return;
        }
        
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
              
              // Add filter information on subsequent pages too
              if (filterText) {
                doc.setFontSize(8);
                doc.text(`Filters: ${filterText}`, 105, 28, { align: 'center' });
              }
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
        
        // Create a download link for the PDF with filtered filename
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `${generateFilteredFilename()}.pdf`;
        
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

  // Generate a filename with filter information
  const generateFilteredFilename = () => {
    let filename = `Attendance_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}`;
    
    // Add status to filename if filtered
    if (statusFilter !== 'ALL') {
      filename += `_${statusFilter}`;
    }
    
    // Add location to filename if filtered
    if (locationFilter !== 'ALL') {
      const locationName = locations.find(loc => loc.id === locationFilter)?.name || 'Location';
      filename += `_${locationName.replace(/\s+/g, '_')}`;
    }
    
    // Add date filter to filename
    if (dateFilter !== 'all') {
      filename += `_${dateFilter}`;
    }
    
    return filename;
  };

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
    link.download = `${generateFilteredFilename()}.pdf`;
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
    
    // Create filter information for the message
    let filterInfo = '';
    
    // Add date range info
    let dateRangeText = 'Last 30 days';
    if (dateFilter === 'today') {
      dateRangeText = 'Today';
    } else if (dateFilter === 'yesterday') {
      dateRangeText = 'Yesterday';
    } else if (dateFilter === 'thisWeek') {
      dateRangeText = 'This Week';
    } else if (dateFilter === 'thisMonth') {
      dateRangeText = 'This Month';
    }
    
    filterInfo += `*Period:* ${dateRangeText}\n`;
    
    // Add status filter info if not ALL
    if (statusFilter !== 'ALL') {
      filterInfo += `*Status:* ${statusFilter}\n`;
    }
    
    // Add location filter info if not ALL
    if (locationFilter !== 'ALL') {
      const locationName = locations.find(loc => loc.id === locationFilter)?.name || 'Selected Location';
      filterInfo += `*Location:* ${locationName}\n`;
    }
    
    // Create a detailed message for WhatsApp with filter information
    const message = `📊 *Employee Attendance Report*\n\nI'm sharing an attendance report generated on ${format(new Date(), 'MMM d, yyyy h:mm a')}.\n\n${filterInfo}\nPlease check the attached PDF for details.`;
    
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