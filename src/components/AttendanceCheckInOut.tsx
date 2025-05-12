import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/util/supabase/component';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { FaMapMarkerAlt, FaSignInAlt, FaSignOutAlt, FaSpinner, FaExclamationTriangle, FaLocationArrow } from 'react-icons/fa';
import { 
  getCurrentPosition, 
  getLocationWithFallback, 
  checkGeolocationPermission, 
  getBrowserLocationInstructions,
  GeolocationError,
  GEOLOCATION_ERROR_CODES
} from '@/util/geofencing';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
  const [locationPermission, setLocationPermission] = useState<PermissionState | 'unsupported' | 'unknown'>('unknown');
  const [locationError, setLocationError] = useState<GeolocationError | null>(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState<boolean>(false);
  const { toast } = useToast();

  // Reference to store Supabase subscription
  const supabaseSubscription = useRef<any>(null);

  // Fetch locations and attendance data on component mount and set up real-time subscription
  useEffect(() => {
    fetchLocations();
    fetchAttendance();
    checkLocationPermission();
    setupRealtimeSubscription();

    // Cleanup subscription on component unmount
    return () => {
      if (supabaseSubscription.current) {
        supabaseSubscription.current.unsubscribe();
      }
    };
  }, []);

  // Set up real-time subscription to attendance changes
  const setupRealtimeSubscription = async () => {
    try {
      const supabase = createClient();
      
      // Subscribe to attendance table changes for the current user
      supabaseSubscription.current = supabase
        .channel('employee-attendance-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'Attendance' 
          }, 
          (payload) => {
            console.log('Real-time attendance update received:', payload);
            // Refresh attendance data when attendance changes
            fetchAttendance();
          }
        )
        .subscribe();
      
      console.log('Real-time subscription to attendance changes set up');
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
    }
  };

  // Check location permission
  const checkLocationPermission = async () => {
    const permission = await checkGeolocationPermission();
    setLocationPermission(permission);
    
    // If permission is denied, show the dialog
    if (permission === 'denied') {
      setShowPermissionDialog(true);
    }
  };

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

    // Reset any previous location errors
    setLocationError(null);
    
    try {
      setLoading(true);
      
      // Check permission first
      const permission = await checkGeolocationPermission();
      setLocationPermission(permission);
      
      if (permission === 'denied') {
        setShowPermissionDialog(true);
        throw new GeolocationError('Location permission denied. Please enable location access in your browser settings.', GEOLOCATION_ERROR_CODES.PERMISSION_DENIED);
      }
      
      // Get current position with fallback
      let position;
      try {
        position = await getLocationWithFallback();
        if (!position) {
          throw new GeolocationError('Unable to get your current location', undefined);
        }
      } catch (geoError: any) {
        console.error('Geolocation error:', geoError);
        setLocationError(geoError instanceof GeolocationError ? geoError : new GeolocationError(geoError.message, undefined));
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

    // Reset any previous location errors
    setLocationError(null);
    
    try {
      setLoading(true);
      
      // Check permission first
      const permission = await checkGeolocationPermission();
      setLocationPermission(permission);
      
      if (permission === 'denied') {
        setShowPermissionDialog(true);
        throw new GeolocationError('Location permission denied. Please enable location access in your browser settings.', GEOLOCATION_ERROR_CODES.PERMISSION_DENIED);
      }
      
      // Get current position with fallback
      let position;
      try {
        position = await getLocationWithFallback();
        if (!position) {
          throw new GeolocationError('Unable to get your current location', undefined);
        }
      } catch (geoError: any) {
        console.error('Geolocation error:', geoError);
        setLocationError(geoError instanceof GeolocationError ? geoError : new GeolocationError(geoError.message, undefined));
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

  // Handle retry after location error
  const handleRetryLocation = async () => {
    setLocationError(null);
    await checkLocationPermission();
    
    // If permission is now granted, try a test location request
    if (locationPermission === 'granted') {
      try {
        await getCurrentPosition();
        toast({
          title: 'Success',
          description: 'Location access is now working!',
        });
      } catch (error) {
        console.error('Error getting location after retry:', error);
        if (error instanceof GeolocationError) {
          setLocationError(error);
        }
      }
    }
  };

  // Get browser-specific instructions
  const locationInstructions = getBrowserLocationInstructions();

  return (
    <div className="space-y-6">
      {/* Location Permission Dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaLocationArrow className="text-primary" />
              Location Access Required
            </DialogTitle>
            <DialogDescription>
              This app needs your location to verify you're within the workplace area.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert variant="destructive">
              <FaExclamationTriangle className="h-4 w-4" />
              <AlertTitle>Location permission denied</AlertTitle>
              <AlertDescription>
                You've denied location access to this site. Please follow the instructions below to enable it.
              </AlertDescription>
            </Alert>
            
            <div className="bg-muted p-3 rounded-md">
              <h4 className="font-medium mb-2">How to enable location access:</h4>
              <div className="text-sm space-y-1 whitespace-pre-line">
                {locationInstructions}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowPermissionDialog(false)}>Close</Button>
            <Button variant="outline" onClick={handleRetryLocation}>
              I've Enabled Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Attendance Check-In/Out</CardTitle>
          <CardDescription>
            Record your attendance by checking in and out
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Error Alert */}
          {locationError && (
            <Alert variant="destructive" className="mb-4">
              <FaExclamationTriangle className="h-4 w-4" />
              <AlertTitle>Location Error</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{locationError.message}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    if (locationError.code === GEOLOCATION_ERROR_CODES.PERMISSION_DENIED) {
                      setShowPermissionDialog(true);
                    } else {
                      handleRetryLocation();
                    }
                  }}
                >
                  <FaLocationArrow className="mr-2 h-4 w-4" />
                  {locationError.code === GEOLOCATION_ERROR_CODES.PERMISSION_DENIED 
                    ? 'Show Instructions' 
                    : 'Retry Location Access'}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {currentAttendance ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <FaSignInAlt className="h-5 w-5" />
                <span>Currently checked in</span>
              </div>
              <div className="mt-2 text-sm">
                <div className="font-medium">{currentAttendance.location.name}</div>
                <p className="text-muted-foreground mt-1">
                  Since {formatDate(currentAttendance.checkInTime)}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FaMapMarkerAlt className="text-primary h-5 w-5" />
                <span className="font-medium">Select location to check in:</span>
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
                  
                  {/* Location Permission Status */}
                  {locationPermission === 'denied' && (
                    <Alert variant="destructive" className="mt-4">
                      <FaExclamationTriangle className="h-4 w-4" />
                      <AlertTitle>Location Access Denied</AlertTitle>
                      <AlertDescription className="space-y-2">
                        <p>You need to enable location access to check in.</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowPermissionDialog(true)}
                          className="mt-2"
                        >
                          <FaLocationArrow className="mr-2 h-4 w-4" />
                          Show Instructions
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {locationPermission !== 'denied' && (
                    <div className="mt-3 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
                      <p className="font-medium mb-1">Location Access Required</p>
                      <p>This app needs your location to verify you're within the workplace area.</p>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Location services are enabled on your device</li>
                        <li>You've granted location permission to this website</li>
                      </ul>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-blue-800 underline mt-2" 
                        onClick={() => setShowPermissionDialog(true)}
                      >
                        View browser-specific instructions
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No locations available. Please contact your administrator.
                </p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0">
          {currentAttendance ? (
            <Button
              onClick={handleCheckOut}
              disabled={loading}
              className="w-full py-6 text-lg"
              variant="destructive"
              size="lg"
            >
              {loading ? (
                <FaSpinner className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <FaSignOutAlt className="mr-2 h-5 w-5" />
              )}
              Check Out
            </Button>
          ) : (
            <Button
              onClick={handleCheckIn}
              disabled={loading || locations.length === 0 || locationPermission === 'denied'}
              className="w-full py-6 text-lg"
              size="lg"
            >
              {loading ? (
                <FaSpinner className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <FaSignInAlt className="mr-2 h-5 w-5" />
              )}
              Check In
            </Button>
          )}
        </CardFooter>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Recent Attendance</CardTitle>
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
            <div className="space-y-3">
              {attendanceHistory.slice(0, 5).map((attendance) => (
                <div key={attendance.id} className="border rounded-lg p-3 sm:p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium truncate max-w-[180px] sm:max-w-none">{attendance.location.name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
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
                  <div className="text-xs sm:text-sm mt-2 space-y-1 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2">
                    <div className="flex justify-between sm:block">
                      <span className="text-muted-foreground">Check-in:</span>
                      <span className="font-medium sm:font-normal">{formatDate(attendance.checkInTime)}</span>
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="text-muted-foreground">Check-out:</span>
                      <span className="font-medium sm:font-normal">{attendance.checkOutTime ? formatDate(attendance.checkOutTime) : 'In progress'}</span>
                    </div>
                    <div className="flex justify-between sm:block sm:col-span-2 pt-1 sm:pt-0 border-t sm:border-t-0 mt-1 sm:mt-0">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium sm:font-normal">{calculateDuration(attendance.checkInTime, attendance.checkOutTime)}</span>
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