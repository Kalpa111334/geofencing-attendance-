import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { 
  PlayIcon, 
  CheckIcon, 
  CameraIcon, 
  ClockIcon, 
  CalendarIcon, 
  MessageSquareIcon,
  SendIcon,
  UserIcon,
  FileTextIcon
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedToId: string;
  assignedById: string;
  assignedBy: User;
  startDate: string;
  deadline: string;
  duration: number;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
  proofImageUrl?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskMessage {
  id: string;
  taskId: string;
  userId: string;
  user: User;
  message: string;
  createdAt: string;
}

export default function EmployeeTaskDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const [availableCameras, setAvailableCameras] = useState<boolean>(false);
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [taskStats, setTaskStats] = useState({
    total: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    approved: 0,
    rejected: 0
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Fetch tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, []);

  // Update task statistics whenever tasks change
  useEffect(() => {
    updateTaskStats();
  }, [tasks]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch tasks
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tasks');
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Update task statistics
  const updateTaskStats = () => {
    const stats = {
      total: tasks.length,
      assigned: tasks.filter(task => task.status === 'ASSIGNED').length,
      inProgress: tasks.filter(task => task.status === 'IN_PROGRESS').length,
      completed: tasks.filter(task => task.status === 'COMPLETED').length,
      approved: tasks.filter(task => task.status === 'APPROVED').length,
      rejected: tasks.filter(task => task.status === 'REJECTED').length
    };
    
    setTaskStats(stats);
  };

  // View task details
  const viewTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch task details');
      }
      
      const data = await response.json();
      setCurrentTask(data);
      setIsViewDialogOpen(true);
    } catch (error) {
      console.error('Error fetching task details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load task details. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Start a task (mark as in progress)
  const startTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'IN_PROGRESS',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start task');
      }
      
      // Refresh tasks
      fetchTasks();
      
      toast({
        title: 'Success',
        description: 'Task started successfully.',
      });
    } catch (error) {
      console.error('Error starting task:', error);
      toast({
        title: 'Error',
        description: 'Failed to start task. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Open upload proof dialog
  const openUploadDialog = (task: Task) => {
    setCurrentTask(task);
    setCapturedImage(null);
    setIsCapturing(false);
    setIsUploadDialogOpen(true);
    
    // Start camera when dialog opens
    setTimeout(() => {
      startCamera();
    }, 500);
  };

  // Check for multiple cameras
  const checkForCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices.length > 1);
    } catch (error) {
      console.error('Error checking for cameras:', error);
      setAvailableCameras(false);
    }
  };

  // Start camera for proof capture
  const startCamera = async () => {
    try {
      if (!videoRef.current) return;
      
      await checkForCameras();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: cameraFacingMode } 
      });
      
      videoRef.current.srcObject = stream;
      setIsCapturing(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Camera Error',
        description: 'Could not access your camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  };
  
  // Switch camera between front and back
  const switchCamera = async () => {
    // Stop current camera
    stopCamera();
    
    // Toggle camera mode
    setCameraFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    
    // Small delay to ensure camera is fully stopped
    setTimeout(() => {
      startCamera();
    }, 300);
  };

  // Stop camera
  const stopCamera = () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    
    const stream = videoRef.current.srcObject as MediaStream;
    const tracks = stream.getTracks();
    
    tracks.forEach(track => track.stop());
    videoRef.current.srcObject = null;
    setIsCapturing(false);
  };

  // Capture image from camera
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageDataUrl);
      
      // Stop camera after capture
      stopCamera();
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  // Upload proof and complete task
  const uploadProofAndComplete = async () => {
    if (!currentTask || !capturedImage) return;
    
    try {
      const response = await fetch('/api/tasks/upload-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: currentTask.id,
          image: capturedImage,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload proof');
      }
      
      // Close dialog and refresh tasks
      setIsUploadDialogOpen(false);
      fetchTasks();
      
      toast({
        title: 'Success',
        description: 'Proof uploaded and task marked as completed.',
      });
    } catch (error) {
      console.error('Error uploading proof:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload proof. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Open chat dialog
  const openChatDialog = async (task: Task) => {
    setCurrentTask(task);
    setNewMessage('');
    setIsChatDialogOpen(true);
    
    // Fetch messages for this task
    await fetchMessages(task.id);
  };

  // Fetch messages for a task
  const fetchMessages = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/messages?taskId=${taskId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Send a new message
  const sendMessage = async () => {
    if (!currentTask || !newMessage.trim()) return;
    
    try {
      const response = await fetch('/api/tasks/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: currentTask.id,
          message: newMessage,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      
      // Add new message to the list
      setMessages([...messages, data]);
      
      // Clear input
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Clean up camera when dialog closes
  useEffect(() => {
    if (!isUploadDialogOpen) {
      stopCamera();
    }
  }, [isUploadDialogOpen]);

  // Get filtered tasks based on selected tab
  const getFilteredTasks = () => {
    switch (selectedTab) {
      case 'assigned':
        return tasks.filter(task => task.status === 'ASSIGNED');
      case 'in-progress':
        return tasks.filter(task => task.status === 'IN_PROGRESS');
      case 'completed':
        return tasks.filter(task => task.status === 'COMPLETED');
      case 'approved':
        return tasks.filter(task => task.status === 'APPROVED');
      case 'rejected':
        return tasks.filter(task => task.status === 'REJECTED');
      default:
        return tasks;
    }
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return <Badge variant="outline">Assigned</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'COMPLETED':
        return <Badge variant="default">Completed</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format duration from minutes to hours and minutes
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Calculate days remaining until deadline
  const getDaysRemaining = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    
    // Reset time part for accurate day calculation
    deadlineDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Get deadline status and color
  const getDeadlineStatus = (deadline: string) => {
    const daysRemaining = getDaysRemaining(deadline);
    
    if (daysRemaining < 0) {
      return { text: 'Overdue', color: 'text-red-500' };
    } else if (daysRemaining === 0) {
      return { text: 'Due Today', color: 'text-orange-500' };
    } else if (daysRemaining <= 2) {
      return { text: `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`, color: 'text-orange-500' };
    } else {
      return { text: `${daysRemaining} days left`, color: 'text-green-500' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">My Tasks</h2>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.assigned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Tabs and List */}
      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
          <CardDescription>
            View and manage your assigned tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="assigned">Assigned</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            
            <TabsContent value={selectedTab}>
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <p>Loading tasks...</p>
                </div>
              ) : getFilteredTasks().length === 0 ? (
                <div className="flex justify-center items-center h-40">
                  <p>No tasks found in this category.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredTasks().map((task) => (
                    <Card key={task.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                          {getStatusBadge(task.status)}
                        </div>
                        <CardDescription>
                          Assigned by: {task.assignedBy.firstName} {task.assignedBy.lastName}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              Deadline: {new Date(task.deadline).toLocaleDateString()}
                            </span>
                            <span className={`text-sm font-medium ${getDeadlineStatus(task.deadline).color}`}>
                              ({getDeadlineStatus(task.deadline).text})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ClockIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              Duration: {formatDuration(task.duration)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {task.description.length > 50 
                                ? `${task.description.substring(0, 50)}...` 
                                : task.description}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between pt-0">
                        <Button variant="outline" onClick={() => viewTask(task.id)}>
                          View Details
                        </Button>
                        <div className="flex gap-2">
                          {task.status === 'ASSIGNED' && (
                            <Button onClick={() => startTask(task.id)}>
                              <PlayIcon className="mr-2 h-4 w-4" />
                              Start Task
                            </Button>
                          )}
                          {task.status === 'IN_PROGRESS' && (
                            <Button onClick={() => openUploadDialog(task)}>
                              <CameraIcon className="mr-2 h-4 w-4" />
                              Complete & Upload Proof
                            </Button>
                          )}
                          <Button variant="outline" onClick={() => openChatDialog(task)}>
                            <MessageSquareIcon className="mr-2 h-4 w-4" />
                            Chat
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* View Task Dialog */}
      {currentTask && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{currentTask.title}</DialogTitle>
              <DialogDescription>
                Task details and status
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Status:</span>
                {getStatusBadge(currentTask.status)}
              </div>
              <div>
                <span className="font-semibold">Assigned By:</span>
                <p>{currentTask.assignedBy.firstName} {currentTask.assignedBy.lastName} ({currentTask.assignedBy.role})</p>
              </div>
              <div>
                <span className="font-semibold">Description:</span>
                <p className="mt-1">{currentTask.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold">Start Date:</span>
                  <p>{new Date(currentTask.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="font-semibold">Deadline:</span>
                  <p className="flex items-center gap-2">
                    {new Date(currentTask.deadline).toLocaleDateString()}
                    <span className={getDeadlineStatus(currentTask.deadline).color}>
                      ({getDeadlineStatus(currentTask.deadline).text})
                    </span>
                  </p>
                </div>
              </div>
              <div>
                <span className="font-semibold">Duration:</span>
                <p>{formatDuration(currentTask.duration)}</p>
              </div>
              {currentTask.proofImageUrl && (
                <div>
                  <span className="font-semibold">Proof of Completion:</span>
                  <div className="mt-2">
                    <img 
                      src={currentTask.proofImageUrl} 
                      alt="Proof of completion" 
                      className="max-w-full h-auto rounded-md border border-gray-200"
                    />
                  </div>
                </div>
              )}
              {currentTask.status === 'REJECTED' && currentTask.rejectionReason && (
                <div>
                  <span className="font-semibold">Rejection Reason:</span>
                  <p className="mt-1 text-red-500">{currentTask.rejectionReason}</p>
                </div>
              )}
              {currentTask.reviewedAt && (
                <div>
                  <span className="font-semibold">Reviewed On:</span>
                  <p>{new Date(currentTask.reviewedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
              <div className="flex gap-2">
                {currentTask.status === 'ASSIGNED' && (
                  <Button onClick={() => {
                    setIsViewDialogOpen(false);
                    startTask(currentTask.id);
                  }}>
                    <PlayIcon className="mr-2 h-4 w-4" />
                    Start Task
                  </Button>
                )}
                {currentTask.status === 'IN_PROGRESS' && (
                  <Button onClick={() => {
                    setIsViewDialogOpen(false);
                    openUploadDialog(currentTask);
                  }}>
                    <CameraIcon className="mr-2 h-4 w-4" />
                    Complete & Upload Proof
                  </Button>
                )}
                <Button variant="outline" onClick={() => {
                  setIsViewDialogOpen(false);
                  openChatDialog(currentTask);
                }}>
                  <MessageSquareIcon className="mr-2 h-4 w-4" />
                  Chat
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Upload Proof Dialog */}
      {currentTask && (
        <Dialog open={isUploadDialogOpen} onOpenChange={(open) => {
          if (!open) stopCamera();
          setIsUploadDialogOpen(open);
        }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Upload Proof of Completion</DialogTitle>
              <DialogDescription>
                Take a photo of the completed task as proof
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <span className="font-semibold">Task:</span>
                <p>{currentTask.title}</p>
              </div>
              
              <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                {isCapturing && !capturedImage && (
                  <>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                    {availableCameras && (
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="absolute top-2 right-2 rounded-full p-2 h-10 w-10"
                        onClick={switchCamera}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 3h5v5"></path>
                          <path d="M8 3H3v5"></path>
                          <path d="M3 16v5h5"></path>
                          <path d="M16 21h5v-5"></path>
                          <path d="M21 16V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8"></path>
                        </svg>
                      </Button>
                    )}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                      <Button 
                        size="lg" 
                        className="rounded-full h-16 w-16 bg-white text-primary hover:bg-gray-100"
                        onClick={captureImage}
                      >
                        <CameraIcon className="h-8 w-8" />
                      </Button>
                    </div>
                  </>
                )}
                {capturedImage && (
                  <img 
                    src={capturedImage} 
                    alt="Captured proof" 
                    className="w-full h-full object-cover"
                  />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              
              <div className="flex justify-center gap-4">
                {capturedImage && (
                  <>
                    <Button variant="outline" onClick={retakePhoto}>
                      Retake Photo
                    </Button>
                    <Button onClick={uploadProofAndComplete}>
                      <CheckIcon className="mr-2 h-4 w-4" />
                      Submit Proof
                    </Button>
                  </>
                )}
                {!isCapturing && !capturedImage && (
                  <Button onClick={startCamera}>
                    <CameraIcon className="mr-2 h-4 w-4" />
                    Start Camera
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Chat Dialog */}
      {currentTask && (
        <Dialog open={isChatDialogOpen} onOpenChange={setIsChatDialogOpen}>
          <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Task Chat</DialogTitle>
              <DialogDescription>
                Chat with your supervisor about this task
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="bg-muted/50 p-3 rounded-md mb-4">
                <h4 className="font-semibold">{currentTask.title}</h4>
                <p className="text-sm text-muted-foreground">
                  Status: {currentTask.status}
                </p>
              </div>
              
              <ScrollArea className="flex-1 pr-4" ref={chatScrollRef}>
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquareIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`flex ${msg.userId === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex gap-2 max-w-[80%] ${msg.userId === user?.id ? 'flex-row-reverse' : 'flex-row'}`}>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {msg.user.firstName?.[0] || msg.user.email[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className={`rounded-lg px-3 py-2 ${
                              msg.userId === user?.id 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}>
                              <p className="text-sm">{msg.message}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {' • '}
                              {msg.user.firstName} {msg.user.lastName}
                              {msg.user.role === 'ADMIN' && ' (Admin)'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                <SendIcon className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}