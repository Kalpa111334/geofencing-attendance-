import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { FaMapMarkerAlt, FaSignInAlt, FaSignOutAlt, FaSpinner } from 'react-icons/fa';
import { getCurrentPosition } from '@/util/geofencing';

interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
}

interface Attendance {
  id: string;
  locationId: string;
  checkInTime: string;
  checkOutTime: string | null;
  status: string;
  location: Location;
}

const AttendanceCheckInOut: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [currentAttendance, setCurrentAttendance] = useState<Attendance | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [locationLoading, setLocationLoading] = useState<boolean>(true);
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(true);
  const { toast } = useToast();

  // Fetch locations and attendance data on component mount
  useEffect(() => {
    fetchLocations();
    fetchAttendance();
  }, []);

  // Fetch locations from API
  const fetchLocations = async () => {
    try {
      setLocationLoading(true);
      const response = await fetch('/api/locations');
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      const data = await response.json();
      setLocations(data);
      if (data.length > 0) {
        setSelectedLocationId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch locations',
      });
    } finally {
      setLocationLoading(false);
    }
  };

  // Fetch attendance records from API
  const fetchAttendance = async () => {
    try {
      setAttendanceLoading(true);
      const response = await fetch('/api/attendance');
      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }
      const data = await response.json();
      
      // Find current (open) attendance record
      const current = data.find((a: Attendance) => a.checkOutTime === null);
      setCurrentAttendance(current || null);
      
      // Set attendance history
      setAttendanceHistory(data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch attendance records',
      });
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Handle check-in
  const handleCheckIn = async () => {
    if (!selectedLocationId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a location',
      });
      return;
    }

    try {
      setLoading(true);
      
      // Get current position
      let position;
      try {
        position = await getCurrentPosition();
        if (!position) {
          throw new Error('Unable to get your current location');
        }
      } catch (geoError: any) {
        console.error('Geolocation error:', geoError);
        // Use the enhanced error message from our updated getCurrentPosition function
        throw geoError;
      }
      
      // Send check-in request
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId: selectedLocationId,
          latitude: position.latitude,
          longitude: position.longitude,
          type: 'check-in',
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('Error parsing response:', e);
        throw new Error('Invalid response from server');
      }
      
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to check in');
      }
      
      toast({
        title: 'Success',
        description: 'You have successfully checked in',
      });
      
      // Refresh attendance data
      fetchAttendance();
    } catch (error: any) {
      console.error('Error checking in:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to check in',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle check-out
  const handleCheckOut = async () => {
    if (!currentAttendance) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No active check-in found',
      });
      return;
    }

    try {
      setLoading(true);
      
      // Get current position
      let position;
      try {
        position = await getCurrentPosition();
        if (!position) {
          throw new Error('Unable to get your current location');
        }
      } catch (geoError: any) {
        console.error('Geolocation error:', geoError);
        // Use the enhanced error message from our updated getCurrentPosition function
        throw geoError;
      }
      
      // Send check-out request
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId: currentAttendance.locationId,
          latitude: position.latitude,
          longitude: position.longitude,
          type: 'check-out',
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('Error parsing response:', e);
        throw new Error('Invalid response from server');
      }
      
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to check out');
      }
      
      toast({
        title: 'Success',
        description: 'You have successfully checked out',
      });
      
      // Refresh attendance data
      fetchAttendance();
    } catch (error: any) {
      console.error('Error checking out:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to check out',
      });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Calculate duration between check-in and check-out
  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return 'In progress';
    
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    const durationMs = end - start;
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Attendance Check-In/Out</CardTitle>
          <CardDescription>
            Record your attendance by checking in and out at your workplace
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentAttendance ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <FaSignInAlt />
                <span>Currently checked in at {currentAttendance.location.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Checked in at {formatDate(currentAttendance.checkInTime)}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FaMapMarkerAlt className="text-muted-foreground" />
                <span>Select location to check in:</span>
              </div>
              
              {locationLoading ? (
                <div className="flex justify-center py-2">
                  <FaSpinner className="animate-spin h-5 w-5 text-primary" />
                </div>
              ) : locations.length > 0 ? (
                <>
                  <Select
                    value={selectedLocationId}
                    onValueChange={setSelectedLocationId}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="mt-2 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
                    <p className="font-medium mb-1">Location Access Required</p>
                    <p>This app needs your location to verify you're within the workplace area. Please ensure:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Location services are enabled on your device</li>
                      <li>You've granted location permission to this website</li>
                      <li>You're using a secure (HTTPS) connection</li>
                    </ul>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No locations available. Please contact your administrator.
                </p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          {currentAttendance ? (
            <Button
              onClick={handleCheckOut}
              disabled={loading}
              className="w-full"
              variant="destructive"
            >
              {loading ? (
                <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FaSignOutAlt className="mr-2 h-4 w-4" />
              )}
              Check Out
            </Button>
          ) : (
            <Button
              onClick={handleCheckIn}
              disabled={loading || locations.length === 0}
              className="w-full"
            >
              {loading ? (
                <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FaSignInAlt className="mr-2 h-4 w-4" />
              )}
              Check In
            </Button>
          )}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
          <CardDescription>
            Your recent attendance records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceLoading ? (
            <div className="flex justify-center py-4">
              <FaSpinner className="animate-spin h-5 w-5 text-primary" />
            </div>
          ) : attendanceHistory.length > 0 ? (
            <div className="space-y-4">
              {attendanceHistory.slice(0, 5).map((attendance) => (
                <div key={attendance.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{attendance.location.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(attendance.checkInTime)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        attendance.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                        attendance.status === 'LATE' ? 'bg-yellow-100 text-yellow-800' :
                        attendance.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {attendance.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Check-in:</span>{' '}
                      {formatDate(attendance.checkInTime)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Check-out:</span>{' '}
                      {attendance.checkOutTime ? formatDate(attendance.checkOutTime) : 'In progress'}
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Duration:</span>{' '}
                      {calculateDuration(attendance.checkInTime, attendance.checkOutTime)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">
              No attendance records found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceCheckInOut;