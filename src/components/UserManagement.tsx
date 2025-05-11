import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  FaUserPlus, 
  FaSpinner, 
  FaEdit, 
  FaTrash, 
  FaSearch, 
  FaFilter, 
  FaUserCog,
  FaClock
} from 'react-icons/fa';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  department: string | null;
  position: string | null;
  createdAt: string;
}

interface WorkShift {
  id: string;
  name: string;
  description: string | null;
  startTime: string;
  endTime: string;
  days: string[];
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [workShifts, setWorkShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    department: '',
    position: '',
    role: 'EMPLOYEE',
  });
  const [showAssignShiftDialog, setShowAssignShiftDialog] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedWorkShiftId, setSelectedWorkShiftId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();

  // Fetch users and work shifts on component mount
  useEffect(() => {
    fetchUsers();
    fetchWorkShifts();
  }, []);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch users',
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

  // Handle role selection
  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value }));
  };

  // Set form data when editing a user
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      department: user.department || '',
      position: user.position || '',
      role: user.role,
    });
  };

  // Fetch work shifts from API
  const fetchWorkShifts = async () => {
    try {
      const response = await fetch('/api/work-shifts');
      if (!response.ok) {
        throw new Error('Failed to fetch work shifts');
      }
      const data = await response.json();
      setWorkShifts(data);
    } catch (error) {
      console.error('Error fetching work shifts:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch work shifts',
      });
    }
  };

  // Reset form data
  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      department: '',
      position: '',
      role: 'EMPLOYEE',
    });
  };

  // Reset assign shift dialog
  const resetAssignShiftDialog = () => {
    setSelectedUserId('');
    setSelectedWorkShiftId('');
    setShowAssignShiftDialog(false);
    setSelectedUser(null);
  };

  // Handle form submission for updating a user
  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setLoading(true);
      
      // Send update user request
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }
      
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      
      // Reset form and refresh users
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update user',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle assigning a work shift to a user
  const handleAssignWorkShift = async () => {
    if (!selectedUserId || !selectedWorkShiftId) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a work shift',
      });
      return;
    }

    try {
      setLoading(true);
      
      // Get the current work shift to get its employees
      const response = await fetch(`/api/work-shifts/${selectedWorkShiftId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch work shift details');
      }
      
      const workShift = await response.json();
      
      // Check if the user is already assigned to this work shift
      const isAlreadyAssigned = workShift.employees.some((emp: any) => emp.id === selectedUserId);
      
      // Prepare the employee IDs (existing + new one if not already assigned)
      const employeeIds = isAlreadyAssigned 
        ? workShift.employees.map((emp: any) => emp.id)
        : [...workShift.employees.map((emp: any) => emp.id), selectedUserId];
      
      // Update the work shift with the new employee assignment
      const updateResponse = await fetch(`/api/work-shifts/${selectedWorkShiftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workShift.name,
          description: workShift.description,
          startTime: workShift.startTime,
          endTime: workShift.endTime,
          days: workShift.days,
          employeeIds: employeeIds,
        }),
      });
      
      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to assign work shift');
      }
      
      toast({
        title: 'Success',
        description: `Work shift assigned to ${selectedUser?.firstName || ''} ${selectedUser?.lastName || selectedUser?.email || ''}`,
      });
      
      // Reset dialog and refresh data
      resetAssignShiftDialog();
      fetchWorkShifts();
    } catch (error: any) {
      console.error('Error assigning work shift:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to assign work shift',
      });
    } finally {
      setLoading(false);
    }
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return new Intl.DateTimeFormat('en-US', { 
      hour: 'numeric', 
      minute: 'numeric', 
      hour12: true 
    }).format(date);
  };

  // Filter users based on search term and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      searchTerm === '' || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            View and manage all users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <FaSpinner className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : 'Not set'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.role === 'ADMIN' 
                            ? 'bg-primary/20 text-primary' 
                            : user.role === 'MANAGER' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>{user.department || 'Not set'}</TableCell>
                      <TableCell>{user.position || 'Not set'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setSelectedUser(user);
                              setShowAssignShiftDialog(true);
                            }}
                            title="Assign Work Shift"
                          >
                            <FaClock className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditUser(user)}
                              >
                                <FaEdit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User</DialogTitle>
                              <DialogDescription>
                                Update user information and role
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="firstName">First Name</Label>
                                  <Input
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="lastName">Last Name</Label>
                                  <Input
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
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
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="position">Position</Label>
                                <Input
                                  id="position"
                                  name="position"
                                  value={formData.position}
                                  onChange={handleInputChange}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Select 
                                  value={formData.role} 
                                  onValueChange={handleRoleChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="MANAGER">Manager</SelectItem>
                                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button 
                                variant="outline" 
                                onClick={resetForm}
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={handleUpdateUser}
                                disabled={loading}
                              >
                                {loading ? (
                                  <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <FaUserCog className="mr-2 h-4 w-4" />
                                )}
                                Update User
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your search criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Work Shift Dialog */}
      <Dialog open={showAssignShiftDialog} onOpenChange={setShowAssignShiftDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Work Shift</DialogTitle>
            <DialogDescription>
              Assign a work shift to {selectedUser?.firstName || ''} {selectedUser?.lastName || selectedUser?.email || ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workShift">Select Work Shift</Label>
              <Select 
                value={selectedWorkShiftId} 
                onValueChange={setSelectedWorkShiftId}
              >
                <SelectTrigger id="workShift">
                  <SelectValue placeholder="Select a work shift" />
                </SelectTrigger>
                <SelectContent>
                  {workShifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {shift.name} ({formatTime(shift.startTime)} - {formatTime(shift.endTime)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetAssignShiftDialog}>Cancel</Button>
            <Button onClick={handleAssignWorkShift} disabled={loading}>
              {loading ? (
                <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FaClock className="mr-2 h-4 w-4" />
              )}
              Assign Work Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;