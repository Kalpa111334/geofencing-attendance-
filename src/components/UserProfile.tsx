import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { FaUser, FaSpinner, FaSave } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import NotificationSettings from './NotificationSettings';

interface UserData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  department: string | null;
  position: string | null;
  role: string;
}

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    department: '',
    position: '',
  });
  const { toast } = useToast();

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
  }, []);

  // Fetch user data from API
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user');
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      const data = await response.json();
      setUserData(data);
      setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        department: data.department || '',
        position: data.position || '',
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch user data',
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      // Send update user request
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      
      // Update user data
      setUserData(data);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update profile',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
      {loading ? (
        <CardContent className="flex justify-center py-6">
          <FaSpinner className="animate-spin h-6 w-6 text-primary" />
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Doe"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                placeholder="Engineering"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                placeholder="Software Developer"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={userData?.role || 'EMPLOYEE'}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Your role determines your permissions in the system. Contact an administrator to change your role.
              </p>
            </div>
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
                <FaSave className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
    
    {/* Notification Settings */}
    {!loading && <NotificationSettings />}
    </div>
  );
};

export default UserProfile;