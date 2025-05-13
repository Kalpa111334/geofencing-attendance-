import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FaUserClock, 
  FaMapMarkerAlt, 
  FaSignOutAlt, 
  FaUser, 
  FaUserEdit, 
  FaUsers, 
  FaChartBar, 
  FaTachometerAlt,
  FaCalendarAlt,
  FaClock,
  FaCalendarWeek,
  FaEllipsisH
} from "react-icons/fa";
import AttendanceCheckInOut from "@/components/AttendanceCheckInOut";
import LocationManagement from "@/components/LocationManagement";
import UserProfile from "@/components/UserProfile";
import UserManagement from "@/components/UserManagement";
import AttendanceReports from "@/components/AttendanceReports";
import DashboardOverview from "@/components/DashboardOverview";
import AdminLeaveManagement from "@/components/AdminLeaveManagement";
import WorkShiftManagement from "@/components/WorkShiftManagement";
import RosterManagement from "@/components/RosterManagement";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [userRole, setUserRole] = useState<string>("ADMIN");
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          // Include user ID in authorization header
          const response = await fetch(`/api/user`, {
            headers: {
              'Authorization': user.id
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            
            // Redirect to employee dashboard if not admin
            if (userData.role !== "ADMIN") {
              router.push("/dashboard");
              return;
            }
            
            setUserRole(userData.role);
            setUserName(userData.firstName ? `${userData.firstName} ${userData.lastName || ''}` : user.email || '');
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
  }, [user, router]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-primary/10 sticky top-0 z-10">
        <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <FaUserClock className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">TimeTrack Admin</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <FaUser className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{userName}</span>
              <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">Admin</span>
            </div>
            <Button
              onClick={() => signOut()}
              variant="outline"
              size="sm"
              className="px-2 sm:px-3"
            >
              <FaSignOutAlt className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Log Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-col pb-16 sm:pb-0">
        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Dashboard</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage locations, employees, and system settings
            </p>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <div className="overflow-x-auto pb-2">
              <TabsList className="inline-flex min-w-full md:grid md:grid-cols-9 md:w-auto">
                <TabsTrigger value="overview" className="whitespace-nowrap">
                  <FaTachometerAlt className="mr-2 h-4 w-4" />
                  <span className="sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="whitespace-nowrap">
                  <FaUsers className="mr-2 h-4 w-4" />
                  <span className="sm:inline">Users</span>
                </TabsTrigger>
                <TabsTrigger value="locations" className="whitespace-nowrap">
                  <FaMapMarkerAlt className="mr-2 h-4 w-4" />
                  <span className="sm:inline">Locations</span>
                </TabsTrigger>
                <TabsTrigger value="leave" className="whitespace-nowrap">
                  <FaCalendarAlt className="mr-2 h-4 w-4" />
                  <span className="sm:inline">Leave</span>
                </TabsTrigger>
                <TabsTrigger value="reports" className="whitespace-nowrap">
                  <FaChartBar className="mr-2 h-4 w-4" />
                  <span className="sm:inline">Reports</span>
                </TabsTrigger>
                <TabsTrigger value="attendance" className="whitespace-nowrap">
                  <FaUserClock className="mr-2 h-4 w-4" />
                  <span className="sm:inline">My Attendance</span>
                </TabsTrigger>
                <TabsTrigger value="work-shifts" className="whitespace-nowrap">
                  <FaClock className="mr-2 h-4 w-4" />
                  <span className="sm:inline">Work Shifts</span>
                </TabsTrigger>
                <TabsTrigger value="roster" className="whitespace-nowrap">
                  <FaCalendarWeek className="mr-2 h-4 w-4" />
                  <span className="sm:inline">Roster</span>
                </TabsTrigger>
                <TabsTrigger value="profile" className="whitespace-nowrap">
                  <FaUserEdit className="mr-2 h-4 w-4" />
                  <span className="sm:inline">Profile</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="overview" className="space-y-4">
              <DashboardOverview />
            </TabsContent>
            
            <TabsContent value="users" className="space-y-4">
              <UserManagement />
            </TabsContent>
            
            <TabsContent value="locations" className="space-y-4">
              <LocationManagement />
            </TabsContent>
            
            <TabsContent value="leave" className="space-y-4">
              <AdminLeaveManagement />
            </TabsContent>
            
            <TabsContent value="reports" className="space-y-4">
              <AttendanceReports />
            </TabsContent>
            
            <TabsContent value="attendance" className="space-y-4">
              <AttendanceCheckInOut />
            </TabsContent>
            
            <TabsContent value="work-shifts" className="space-y-4">
              <WorkShiftManagement />
            </TabsContent>
            
            <TabsContent value="roster" className="space-y-4">
              <RosterManagement />
            </TabsContent>
            
            <TabsContent value="profile" className="space-y-4">
              <UserProfile />
            </TabsContent>
          </Tabs>
        </main>
        
        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t sm:hidden z-10 mobile-bottom-nav">
          <div className="grid grid-cols-5 h-16 mobile-no-select">
            <Button 
              variant="ghost" 
              className="flex flex-col items-center justify-center h-full w-full rounded-none mobile-touch-feedback haptic-feedback"
              onClick={() => document.querySelector('[data-value="overview"]')?.click()}
            >
              <FaTachometerAlt className="h-4 w-4" />
              <span className="text-xs mt-1">Overview</span>
            </Button>
            <Button 
              variant="ghost" 
              className="flex flex-col items-center justify-center h-full w-full rounded-none mobile-touch-feedback haptic-feedback"
              onClick={() => document.querySelector('[data-value="users"]')?.click()}
            >
              <FaUsers className="h-4 w-4" />
              <span className="text-xs mt-1">Users</span>
            </Button>
            <Button 
              variant="ghost" 
              className="flex flex-col items-center justify-center h-full w-full rounded-none mobile-touch-feedback haptic-feedback"
              onClick={() => document.querySelector('[data-value="leave"]')?.click()}
            >
              <FaCalendarAlt className="h-4 w-4" />
              <span className="text-xs mt-1">Leave</span>
            </Button>
            <Button 
              variant="ghost" 
              className="flex flex-col items-center justify-center h-full w-full rounded-none mobile-touch-feedback haptic-feedback"
              onClick={() => document.querySelector('[data-value="reports"]')?.click()}
            >
              <FaChartBar className="h-4 w-4" />
              <span className="text-xs mt-1">Reports</span>
            </Button>
            <Button 
              variant="ghost" 
              className="flex flex-col items-center justify-center h-full w-full rounded-none mobile-touch-feedback haptic-feedback"
              onClick={() => {
                const moreMenu = document.getElementById('more-menu');
                if (moreMenu) {
                  moreMenu.classList.toggle('hidden');
                }
              }}
            >
              <FaEllipsisH className="h-4 w-4" />
              <span className="text-xs mt-1">More</span>
            </Button>
          </div>
          
          {/* More Menu */}
          <div id="more-menu" className="hidden absolute bottom-16 left-0 right-0 bg-background border-t shadow-lg">
            <div className="grid grid-cols-4 gap-1 p-2">
              <Button 
                variant="ghost" 
                className="flex flex-col items-center justify-center p-2 h-20 mobile-touch-feedback haptic-feedback"
                onClick={() => document.querySelector('[data-value="locations"]')?.click()}
              >
                <FaMapMarkerAlt className="h-5 w-5" />
                <span className="text-xs mt-1">Locations</span>
              </Button>
              <Button 
                variant="ghost" 
                className="flex flex-col items-center justify-center p-2 h-20 mobile-touch-feedback haptic-feedback"
                onClick={() => document.querySelector('[data-value="attendance"]')?.click()}
              >
                <FaUserClock className="h-5 w-5" />
                <span className="text-xs mt-1">Attendance</span>
              </Button>
              <Button 
                variant="ghost" 
                className="flex flex-col items-center justify-center p-2 h-20 mobile-touch-feedback haptic-feedback"
                onClick={() => document.querySelector('[data-value="work-shifts"]')?.click()}
              >
                <FaClock className="h-5 w-5" />
                <span className="text-xs mt-1">Shifts</span>
              </Button>
              <Button 
                variant="ghost" 
                className="flex flex-col items-center justify-center p-2 h-20 mobile-touch-feedback haptic-feedback"
                onClick={() => document.querySelector('[data-value="roster"]')?.click()}
              >
                <FaCalendarWeek className="h-5 w-5" />
                <span className="text-xs mt-1">Roster</span>
              </Button>
              <Button 
                variant="ghost" 
                className="flex flex-col items-center justify-center p-2 h-20 mobile-touch-feedback haptic-feedback"
                onClick={() => document.querySelector('[data-value="profile"]')?.click()}
              >
                <FaUserEdit className="h-5 w-5" />
                <span className="text-xs mt-1">Profile</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}