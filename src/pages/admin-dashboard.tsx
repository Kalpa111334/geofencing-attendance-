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
  FaCalendarAlt
} from "react-icons/fa";
import AttendanceCheckInOut from "@/components/AttendanceCheckInOut";
import LocationManagement from "@/components/LocationManagement";
import UserProfile from "@/components/UserProfile";
import UserManagement from "@/components/UserManagement";
import AttendanceReports from "@/components/AttendanceReports";
import DashboardOverview from "@/components/DashboardOverview";
import AdminLeaveManagement from "@/components/AdminLeaveManagement";

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
          const response = await fetch(`/api/user`);
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
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FaUser className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{userName}</span>
              <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">Admin</span>
            </div>
            <Button
              onClick={() => signOut()}
              variant="outline"
              size="sm"
            >
              <FaSignOutAlt className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
            <p className="text-muted-foreground">
              Manage locations, employees, and system settings
            </p>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid grid-cols-4 md:grid-cols-7 lg:w-auto">
              <TabsTrigger value="overview">
                <FaTachometerAlt className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="users">
                <FaUsers className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="locations">
                <FaMapMarkerAlt className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Locations</span>
              </TabsTrigger>
              <TabsTrigger value="leave">
                <FaCalendarAlt className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Leave</span>
              </TabsTrigger>
              <TabsTrigger value="reports">
                <FaChartBar className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Reports</span>
              </TabsTrigger>
              <TabsTrigger value="attendance">
                <FaUserClock className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">My Attendance</span>
              </TabsTrigger>
              <TabsTrigger value="profile">
                <FaUserEdit className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
            </TabsList>
            
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
            
            <TabsContent value="profile" className="space-y-4">
              <UserProfile />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}