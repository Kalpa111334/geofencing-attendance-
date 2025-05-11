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
    
    // Create a proper PDF using jsPDF
    // First, we need to import jsPDF dynamically
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then(() => {
        try {
          // Create a new PDF document
          const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
          });
          
          // Add company header with logo placeholder
          doc.setFillColor(41, 98, 255); // Primary blue color
          doc.rect(0, 0, 210, 30, 'F');
          
          // Add company name
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          doc.setTextColor(255, 255, 255);
          doc.text(pdfData.companyInfo?.name || 'Employee Management System', 10, 12);
          
          // Add report title
          doc.setFontSize(14);
          doc.text('ATTENDANCE REPORT', 10, 20);
          
          // Add report period
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(`Period: ${format(parseISO(pdfData.summary.startDate), 'MMM d, yyyy')} to ${format(parseISO(pdfData.summary.endDate), 'MMM d, yyyy')}`, 10, 26);
          
          // Add document title section
          doc.setDrawColor(200, 200, 200);
          doc.setFillColor(245, 245, 245);
          doc.roundedRect(10, 35, 190, 40, 3, 3, 'FD');
          
          // Add employee information
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text('EMPLOYEE INFORMATION', 15, 43);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          
          // Left column
          doc.text('Name:', 15, 50);
          doc.text('Department:', 15, 56);
          doc.text('Position:', 15, 62);
          doc.text('User ID:', 15, 68);
          
          // Right column - values
          doc.setFont('helvetica', 'bold');
          doc.text(pdfData.employeeInfo.name, 45, 50);
          doc.text(pdfData.employeeInfo.department, 45, 56);
          doc.text(pdfData.employeeInfo.position, 45, 62);
          doc.text(pdfData.employeeInfo.employeeId || 'N/A', 45, 68);
          
          // Email on right side
          doc.setFont('helvetica', 'normal');
          doc.text('Email:', 110, 50);
          doc.setFont('helvetica', 'bold');
          doc.text(pdfData.employeeInfo.email, 130, 50);
          
          // Add attendance summary section
          doc.setFillColor(245, 245, 245);
          doc.roundedRect(10, 80, 190, 65, 3, 3, 'FD');
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text('ATTENDANCE SUMMARY', 15, 88);
          
          // Create a visual attendance rate indicator with label
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text('Attendance Rate:', 15, 96);
          
          const attendanceRate = parseFloat(pdfData.summary.attendanceRate);
          
          // Draw attendance rate progress bar
          doc.setFillColor(230, 230, 230); // Background gray
          doc.roundedRect(15, 98, 100, 8, 1, 1, 'F');
          
          // Set color based on rate
          const rateColor = 
            attendanceRate < 70 ? [255, 77, 79] :  // Red
            attendanceRate < 80 ? [255, 173, 51] : // Orange
            attendanceRate < 90 ? [255, 236, 61] : // Yellow
            [76, 217, 100];                        // Green
          
          doc.setFillColor(rateColor[0], rateColor[1], rateColor[2]);
          doc.roundedRect(15, 98, Math.min(attendanceRate, 100), 8, 1, 1, 'F');
          
          // Add percentage text
          doc.setFont('helvetica', 'bold');
          doc.text(`${pdfData.summary.attendanceRate}%`, 120, 103);
          
          // Add performance status
          doc.setFont('helvetica', 'normal');
          doc.text('Performance Status:', 15, 112);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(
            pdfData.summary.performanceStatus === 'Needs Improvement' ? 255 : 
            pdfData.summary.performanceStatus === 'Average' ? 255 : 
            pdfData.summary.performanceStatus === 'Good' ? 76 : 76,
            
            pdfData.summary.performanceStatus === 'Needs Improvement' ? 77 : 
            pdfData.summary.performanceStatus === 'Average' ? 173 : 
            pdfData.summary.performanceStatus === 'Good' ? 175 : 217,
            
            pdfData.summary.performanceStatus === 'Needs Improvement' ? 79 : 
            pdfData.summary.performanceStatus === 'Average' ? 51 : 
            pdfData.summary.performanceStatus === 'Good' ? 80 : 100
          );
          doc.text(pdfData.summary.performanceStatus, 70, 112);
          doc.setTextColor(0, 0, 0);
          
          // Add key metrics in a visually appealing format with boxes
          // Present days
          doc.setFillColor(235, 247, 235);
          doc.roundedRect(15, 118, 55, 22, 2, 2, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.text(`${pdfData.summary.presentDays}`, 42, 128);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text('Present Days', 30, 136);
          
          // Late days
          doc.setFillColor(255, 248, 227);
          doc.roundedRect(75, 118, 55, 22, 2, 2, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.text(`${pdfData.summary.lateDays}`, 102, 128);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text('Late Days', 92, 136);
          
          // Absent days
          doc.setFillColor(255, 235, 235);
          doc.roundedRect(135, 118, 55, 22, 2, 2, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.text(`${pdfData.summary.absentDays}`, 162, 128);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text('Absent Days', 150, 136);
          
          // Add additional metrics section
          doc.setFillColor(245, 245, 245);
          doc.roundedRect(10, 150, 190, 30, 3, 3, 'FD');
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text('ADDITIONAL METRICS', 15, 158);
          
          // Add metrics in two columns
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          
          // Left column
          doc.text('Total Working Days:', 15, 166);
          doc.text('Punctuality Rate:', 15, 173);
          
          // Right column
          doc.text('Average Work Hours:', 110, 166);
          doc.text('Punctuality Status:', 110, 173);
          
          // Values - left column
          doc.setFont('helvetica', 'bold');
          doc.text(`${pdfData.summary.totalDays} days`, 70, 166);
          doc.text(`${pdfData.summary.punctualityRate}%`, 70, 173);
          
          // Values - right column
          doc.text(`${pdfData.summary.averageWorkHours} hours/day`, 170, 166);
          doc.text(pdfData.summary.punctualityStatus, 170, 173);
          
          // Add attendance details table
          if (pdfData.attendances.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('ATTENDANCE DETAILS', 15, 190);
            
            // Prepare table data
            const tableColumn = ["Date", "Location", "Check In", "Check Out", "Duration", "Status"];
            const tableRows = pdfData.attendances.map(att => [
              att.date,
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
              startY: 195,
              theme: 'grid',
              styles: { fontSize: 8, cellPadding: 2 },
              headStyles: { fillColor: [41, 98, 255], textColor: [255, 255, 255] },
              columnStyles: {
                5: { // Status column
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
              didDrawPage: function(data: any) {
                // Add page number at the bottom of each page
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(8);
                doc.text(`Page ${data.pageNumber} of ${data.pageCount}`, 180, 287);
              }
            });
          }
          
          // Add footer
          const finalY = (doc as any).lastAutoTable?.finalY || 200;
          
          // Add a footer section
          doc.setFillColor(245, 245, 245);
          doc.rect(0, 277, 210, 20, 'F');
          
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.text(`Generated at: ${pdfData.generatedAt}`, 10, 283);
          doc.text(`Generated by: ${pdfData.generatedBy}`, 10, 288);
          
          // Add company info in footer
          doc.setFont('helvetica', 'normal');
          doc.text(pdfData.companyInfo?.contact || '', 120, 283);
          doc.text(pdfData.companyInfo?.website || '', 120, 288);
          
          // Save the PDF with a descriptive filename
          const employeeName = pdfData.employeeInfo.name.replace(/\s+/g, '_');
          const startDateStr = format(parseISO(pdfData.summary.startDate), 'yyyyMMdd');
          const endDateStr = format(parseISO(pdfData.summary.endDate), 'yyyyMMdd');
          
          doc.save(`Attendance_${employeeName}_${startDateStr}-${endDateStr}.pdf`);
          
          toast({
            title: 'Success',
            description: 'Enhanced attendance report downloaded successfully',
          });
        } catch (error) {
          console.error('Error generating PDF:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to generate PDF. Please try again.',
          });
        }
      });
    }).catch(error => {
      console.error('Error loading jsPDF:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load PDF generation library. Please try again.',
      });
    });
  };

  // Share via WhatsApp
  const shareViaWhatsApp = () => {
    if (!pdfData) return;
    
    // Create a more visually structured and informative summary text for WhatsApp
    const summaryText = `
📊 *${pdfData.reportTitle}* 📊

👤 *EMPLOYEE DETAILS*
📝 Name: ${pdfData.employeeInfo.name}
📧 Email: ${pdfData.employeeInfo.email}
🏢 Department: ${pdfData.employeeInfo.department}
👔 Position: ${pdfData.employeeInfo.position}

📈 *ATTENDANCE SUMMARY*
📅 Period: ${format(parseISO(pdfData.summary.startDate || selectedDateRange.start.toISOString()), 'MMM d, yyyy')} to ${format(parseISO(pdfData.summary.endDate || selectedDateRange.end.toISOString()), 'MMM d, yyyy')}
⏱️ Total Working Days: ${pdfData.summary.totalDays}

✅ Present: ${pdfData.summary.presentDays} days
⚠️ Late: ${pdfData.summary.lateDays} days
❌ Absent: ${pdfData.summary.absentDays} days

📊 *KEY METRICS*
🎯 Attendance Rate: ${pdfData.summary.attendanceRate}%
⏰ Punctuality Rate: ${pdfData.summary.punctualityRate}%
⌚ Average Work Hours: ${pdfData.summary.averageWorkHours} hours/day

${pdfData.attendances.length > 0 ? `
📋 *RECENT ATTENDANCE*
${pdfData.attendances.slice(0, 3).map((att: any) => 
  `${att.date}: ${att.status} (${att.checkIn} - ${att.checkOut})`
).join('\n')}
${pdfData.attendances.length > 3 ? `\n...and ${pdfData.attendances.length - 3} more records` : ''}` : ''}

🕒 Generated: ${format(new Date(pdfData.generatedAt), 'MMM d, yyyy h:mm a')}

💡 *Note:* This is a summary report. For complete details, please refer to the full PDF report.
    `.trim();
    
    // Encode the text for a URL
    const encodedText = encodeURIComponent(summaryText);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    
    // Open WhatsApp in a new window
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: 'WhatsApp Share',
      description: 'Attendance report summary ready to share via WhatsApp',
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
              {/* Header section with company info */}
              <div className="bg-primary text-white p-4 rounded-t-md">
                <h3 className="text-lg font-semibold">{pdfData.companyInfo?.name || 'Employee Management System'}</h3>
                <p className="text-sm font-medium">ATTENDANCE REPORT</p>
                <p className="text-xs mt-1">
                  Period: {format(parseISO(pdfData.summary.startDate || selectedDateRange.start.toISOString()), 'MMM d, yyyy')} to {format(parseISO(pdfData.summary.endDate || selectedDateRange.end.toISOString()), 'MMM d, yyyy')}
                </p>
              </div>
              
              {/* Employee Information */}
              <div className="border rounded-md p-4 bg-muted/30">
                <h4 className="font-medium text-sm uppercase text-primary mb-2">Employee Information</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>Name: <span className="font-medium">{pdfData.employeeInfo.name}</span></div>
                  <div>Email: <span className="font-medium">{pdfData.employeeInfo.email}</span></div>
                  <div>Department: <span className="font-medium">{pdfData.employeeInfo.department}</span></div>
                  <div>Position: <span className="font-medium">{pdfData.employeeInfo.position}</span></div>
                  <div>User ID: <span className="font-medium">{pdfData.employeeInfo.employeeId || 'N/A'}</span></div>
                </div>
              </div>
              
              {/* Attendance Summary */}
              <div className="border rounded-md p-4 bg-muted/30">
                <h4 className="font-medium text-sm uppercase text-primary mb-2">Attendance Summary</h4>
                
                {/* Attendance Rate Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm">Attendance Rate:</span>
                    <span className="text-sm font-bold">{pdfData.summary.attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        parseFloat(pdfData.summary.attendanceRate) < 70 ? 'bg-red-500' : 
                        parseFloat(pdfData.summary.attendanceRate) < 80 ? 'bg-orange-500' : 
                        parseFloat(pdfData.summary.attendanceRate) < 90 ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`} 
                      style={{ width: `${Math.min(parseFloat(pdfData.summary.attendanceRate), 100)}%` }}
                    ></div>
                  </div>
                  <div className="mt-1 text-xs">
                    Performance Status: 
                    <span className={`ml-1 font-medium ${
                      pdfData.summary.performanceStatus === 'Needs Improvement' ? 'text-red-600' : 
                      pdfData.summary.performanceStatus === 'Average' ? 'text-orange-600' : 
                      pdfData.summary.performanceStatus === 'Good' ? 'text-yellow-600' : 
                      'text-green-600'
                    }`}>
                      {pdfData.summary.performanceStatus}
                    </span>
                  </div>
                </div>
                
                {/* Attendance Metrics Cards */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-green-50 p-2 rounded-md text-center">
                    <div className="text-lg font-bold text-green-700">{pdfData.summary.presentDays}</div>
                    <div className="text-xs text-green-800">Present Days</div>
                  </div>
                  <div className="bg-yellow-50 p-2 rounded-md text-center">
                    <div className="text-lg font-bold text-yellow-700">{pdfData.summary.lateDays}</div>
                    <div className="text-xs text-yellow-800">Late Days</div>
                  </div>
                  <div className="bg-red-50 p-2 rounded-md text-center">
                    <div className="text-lg font-bold text-red-700">{pdfData.summary.absentDays}</div>
                    <div className="text-xs text-red-800">Absent Days</div>
                  </div>
                </div>
                
                {/* Additional Metrics */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>Total Working Days: <span className="font-medium">{pdfData.summary.totalDays}</span></div>
                  <div>Average Work Hours: <span className="font-medium">{pdfData.summary.averageWorkHours} hours/day</span></div>
                  <div>Punctuality Rate: <span className="font-medium">{pdfData.summary.punctualityRate}%</span></div>
                  <div>Punctuality Status: 
                    <span className={`ml-1 font-medium ${
                      pdfData.summary.punctualityStatus === 'Needs Improvement' ? 'text-red-600' : 
                      pdfData.summary.punctualityStatus === 'Average' ? 'text-orange-600' : 
                      pdfData.summary.punctualityStatus === 'Good' ? 'text-yellow-600' : 
                      'text-green-600'
                    }`}>
                      {pdfData.summary.punctualityStatus}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Attendance Details */}
              {pdfData.attendances.length > 0 && (
                <div className="border rounded-md p-4 bg-muted/30">
                  <h4 className="font-medium text-sm uppercase text-primary mb-2">Attendance Details</h4>
                  <div className="text-xs text-muted-foreground mb-2">
                    Showing first 5 of {pdfData.attendances.length} records
                  </div>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-primary text-white">
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
              
              {/* Footer */}
              <div className="bg-muted/30 p-3 rounded-b-md text-xs text-muted-foreground">
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <div>
                    Generated at: {pdfData.generatedAt} • Generated by: {pdfData.generatedBy}
                  </div>
                  <div>
                    {pdfData.companyInfo?.contact} • {pdfData.companyInfo?.website}
                  </div>
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