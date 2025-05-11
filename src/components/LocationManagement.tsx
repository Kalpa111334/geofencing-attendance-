import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { FaMapMarkerAlt, FaPlus, FaSpinner, FaTrash } from 'react-icons/fa';
import { getCurrentPosition } from '@/util/geofencing';

interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
}

const LocationManagement: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radius: '50',
  });
  const { toast } = useToast();

  // Fetch locations on component mount
  useEffect(() => {
    fetchLocations();
  }, []);

  // Fetch locations from API
  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/locations');
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch locations',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Use current location
  const useCurrentLocation = async () => {
    try {
      const position = await getCurrentPosition();
      setFormData((prev) => ({
        ...prev,
        latitude: position.latitude.toString(),
        longitude: position.longitude.toString(),
      }));
      toast({
        title: 'Success',
        description: 'Current location coordinates set',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to get current location',
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.address || !formData.latitude || !formData.longitude) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in all required fields',
      });
      return;
    }

    try {
      setSubmitting(true);
      
      // Send create location request
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          radius: parseFloat(formData.radius),
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create location');
      }
      
      toast({
        title: 'Success',
        description: 'Location created successfully',
      });
      
      // Reset form
      setFormData({
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        radius: '50',
      });
      
      // Refresh locations
      fetchLocations();
    } catch (error: any) {
      console.error('Error creating location:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create location',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Location</CardTitle>
          <CardDescription>
            Create a new office location for attendance tracking
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Headquarters"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="123 Main St, City, Country"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  placeholder="37.7749"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  placeholder="-122.4194"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="radius">Geofence Radius (meters)</Label>
              <Input
                id="radius"
                name="radius"
                type="number"
                min="10"
                max="1000"
                value={formData.radius}
                onChange={handleInputChange}
                placeholder="50"
                required
              />
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={useCurrentLocation}
              className="w-full"
            >
              <FaMapMarkerAlt className="mr-2 h-4 w-4" />
              Use Current Location
            </Button>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? (
                <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FaPlus className="mr-2 h-4 w-4" />
              )}
              Add Location
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
          <CardDescription>
            Manage your office locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <FaSpinner className="animate-spin h-5 w-5 text-primary" />
            </div>
          ) : locations.length > 0 ? (
            <div className="space-y-4">
              {locations.map((location) => (
                <div key={location.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{location.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {location.address}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Coordinates:</span>{' '}
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Radius:</span>{' '}
                      {location.radius} meters
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">
              No locations found. Add your first location above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationManagement;