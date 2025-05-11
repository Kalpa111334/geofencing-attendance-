import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSpinner, 
  FaClock, 
  FaCalendarDay, 
  FaUsers,
  FaExclamationTriangle
} from 'react-icons/fa';
import { format } from 'date-fns';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface WorkShift {
  id: string;
  name: string;
  description: string | null;
  startTime: string;
  endTime: string;
  days: string[];
  employees: User[];
  createdAt: string;
  updatedAt: string;
}

const daysOfWeek = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const WorkShiftManagement: React.FC = () => {
  const [workShifts, setWorkShifts] = useState<WorkShift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [selectedWorkShift, setSelectedWorkShift] = useState<WorkShift | null>(null);
  
  // Form state
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  
  const { toast } = useToast();

  // Fetch work shifts and users on component mount
  useEffect(() => {
    fetchWorkShifts();
    fetchUsers();
  }, []);

  // Fetch work shifts from API
  const fetchWorkShifts = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // Fetch users from API
  const fetchUsers = async () => {
    try {
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
    }
  };

  // Handle form submission for creating/editing work shift
  const handleSubmit = async () => {
    try {
      // Validate form
      if (!name || !startTime || !endTime || selectedDays.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: 'Please fill in all required fields',
        });
        return;
      }

      const workShiftData = {
        name,
        description,
        startTime,
        endTime,
        days: selectedDays,
        employeeIds: selectedEmployees,
      };

      let response;
      
      if (isEditing && selectedWorkShift) {
        // Update existing work shift
        response = await fetch(`/api/work-shifts/${selectedWorkShift.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(workShiftData),
        });
      } else {
        // Create new work shift
        response = await fetch('/api/work-shifts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(workShiftData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save work shift');
      }

      toast({
        title: 'Success',
        description: isEditing ? 'Work shift updated successfully' : 'Work shift created successfully',
      });

      // Reset form and refresh data
      resetForm();
      fetchWorkShifts();
    } catch (error: any) {
      console.error('Error saving work shift:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save work shift',
      });
    }
  };

  // Handle delete work shift
  const handleDelete = async () => {
    if (!selectedWorkShift) return;
    
    try {
      const response = await fetch(`/api/work-shifts/${selectedWorkShift.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete work shift');
      }

      toast({
        title: 'Success',
        description: 'Work shift deleted successfully',
      });

      // Close dialog and refresh data
      setShowDeleteDialog(false);
      setSelectedWorkShift(null);
      fetchWorkShifts();
    } catch (error: any) {
      console.error('Error deleting work shift:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete work shift',
      });
    }
  };

  // Reset form state
  const resetForm = () => {
    setName('');
    setDescription('');
    setStartTime('09:00');
    setEndTime('17:00');
    setSelectedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    setSelectedEmployees([]);
    setIsCreating(false);
    setIsEditing(false);
    setSelectedWorkShift(null);
  };

  // Set form values for editing
  const prepareEdit = (workShift: WorkShift) => {
    setSelectedWorkShift(workShift);
    setName(workShift.name);
    setDescription(workShift.description || '');
    setStartTime(workShift.startTime);
    setEndTime(workShift.endTime);
    setSelectedDays(workShift.days);
    setSelectedEmployees(workShift.employees.map(emp => emp.id));
    setIsEditing(true);
    setIsCreating(true);
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return format(date, 'h:mm a');
  };

  // Get employee name
  const getEmployeeName = (employee: User) => {
    return employee.firstName && employee.lastName 
      ? `${employee.firstName} ${employee.lastName}` 
      : employee.email;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-2">
          <div>
            <CardTitle>Work Shift Management</CardTitle>
            <CardDescription>
              Create and manage employee work shifts
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreating(true)} className="w-full sm:w-auto">
            <FaPlus className="mr-2 h-4 w-4" />
            New Work Shift
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <FaSpinner className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : workShifts.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Schedule</TableHead>
                      <TableHead className="hidden md:table-cell">Days</TableHead>
                      <TableHead className="hidden md:table-cell">Employees</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {workShifts.map((workShift) => (
                    <TableRow key={workShift.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{workShift.name}</span>
                          {workShift.description && (
                            <span className="text-xs text-muted-foreground">
                              {workShift.description}
                            </span>
                          )}
                          <div className="sm:hidden text-xs text-muted-foreground mt-1">
                            <div className="flex items-center">
                              <FaClock className="mr-1 h-3 w-3" />
                              {formatTime(workShift.startTime)} - {formatTime(workShift.endTime)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center">
                          <FaClock className="mr-2 h-3 w-3 text-muted-foreground" />
                          {formatTime(workShift.startTime)} - {formatTime(workShift.endTime)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center">
                          <FaCalendarDay className="mr-2 h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {workShift.days.length === 7 
                              ? 'All days' 
                              : workShift.days.length === 5 && workShift.days.includes('Monday') && workShift.days.includes('Friday')
                                ? 'Weekdays'
                                : workShift.days.join(', ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center">
                          <FaUsers className="mr-2 h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {workShift.employees.length} assigned
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => prepareEdit(workShift)}
                          >
                            <FaEdit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => {
                              setSelectedWorkShift(workShift);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <FaTrash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No work shifts found. Click "New Work Shift" to create one.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Work Shift Dialog */}
      <Dialog open={isCreating} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsCreating(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Work Shift' : 'Create New Work Shift'}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Update the details of the selected work shift' 
                : 'Define a new work shift schedule for your employees'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Shift Name *</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g., Morning Shift"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Optional description of this shift"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input 
                  id="startTime" 
                  type="time" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input 
                  id="endTime" 
                  type="time" 
                  value={endTime} 
                  onChange={(e) => setEndTime(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Working Days *</Label>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                {daysOfWeek.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`day-${day}`} 
                      checked={selectedDays.includes(day)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedDays([...selectedDays, day]);
                        } else {
                          setSelectedDays(selectedDays.filter(d => d !== day));
                        }
                      }}
                    />
                    <Label htmlFor={`day-${day}`}>{day}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Assign Employees</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                {users.length > 0 ? (
                  users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2 py-1">
                      <Checkbox 
                        id={`user-${user.id}`} 
                        checked={selectedEmployees.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedEmployees([...selectedEmployees, user.id]);
                          } else {
                            setSelectedEmployees(selectedEmployees.filter(id => id !== user.id));
                          }
                        }}
                      />
                      <Label htmlFor={`user-${user.id}`}>{getEmployeeName(user)}</Label>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-muted-foreground">
                    No employees found
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {isEditing ? 'Update Work Shift' : 'Create Work Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaExclamationTriangle className="text-destructive" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this work shift? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedWorkShift && (
            <div className="py-4">
              <p className="font-medium">{selectedWorkShift.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatTime(selectedWorkShift.startTime)} - {formatTime(selectedWorkShift.endTime)}, 
                {selectedWorkShift.days.join(', ')}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedWorkShift.employees.length} employees assigned to this shift
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Work Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkShiftManagement;