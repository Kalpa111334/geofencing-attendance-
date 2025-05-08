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
      reject(new Error('Geolocation is not supported by your browser'));
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(position.coords);
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true }
      );
    }
  });
}