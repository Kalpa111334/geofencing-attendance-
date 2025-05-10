/**
 * Calculates the distance between two points on Earth using the Haversine formula
 * @param lat1 Latitude of the first point in decimal degrees
 * @param lon1 Longitude of the first point in decimal degrees
 * @param lat2 Latitude of the second point in decimal degrees
 * @param lon2 Longitude of the second point in decimal degrees
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Earth's radius in meters
  const R = 6371000;
  
  // Convert latitude and longitude from degrees to radians
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
  // Haversine formula
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Checks if a user is within the specified radius of a location
 * @param userLat User's latitude
 * @param userLon User's longitude
 * @param locationLat Location's latitude
 * @param locationLon Location's longitude
 * @param radius Radius in meters
 * @returns Boolean indicating if user is within the radius
 */
export function isWithinRadius(
  userLat: number,
  userLon: number,
  locationLat: number,
  locationLon: number,
  radius: number
): boolean {
  const distance = calculateDistance(userLat, userLon, locationLat, locationLon);
  return distance <= radius;
}

/**
 * Gets the current position of the user
 * @returns Promise that resolves to the user's coordinates
 */
export function getCurrentPosition(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const error = new Error('Geolocation is not supported by your browser. Please use a modern browser with location services.');
      error.name = 'GeolocationError';
      reject(error);
      return;
    }
    
    // Try to get the position with high accuracy first
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position.coords);
      },
      (error) => {
        // Provide more specific error messages based on the error code
        let errorMessage = 'Unable to get your current location.';
        let errorSolution = '';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += ' Location permission was denied.';
            errorSolution = ' Please enable location services in your browser settings by clicking the lock icon in the address bar and allowing location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += ' Location information is unavailable.';
            errorSolution = ' Please check your device\'s GPS or network connection and try again.';
            break;
          case error.TIMEOUT:
            errorMessage += ' The request to get your location timed out.';
            errorSolution = ' Please check your internet connection and try again.';
            break;
          default:
            errorSolution = ' Please ensure location services are enabled on your device.';
        }
        
        const enhancedError = new Error(errorMessage + errorSolution);
        enhancedError.name = 'GeolocationError';
        reject(enhancedError);
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}