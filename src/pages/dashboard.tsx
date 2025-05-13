import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaUserClock, FaSignOutAlt, FaUser, FaUserEdit, FaCalendarAlt, FaTasks } from "react-icons/fa";
import AttendanceCheckInOut from "@/components/AttendanceCheckInOut";
import UserProfile from "@/components/UserProfile";
import LeaveManagement from "@/components/LeaveManagement";
import EmployeeTaskDashboard from "@/components/EmployeeTaskDashboard";

export default function Dashboard() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [userRole, setUserRole] = useState<string>("EMPLOYEE");
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
            
            // Redirect to admin dashboard if admin
            if (userData.role === "ADMIN") {
              router.push("/admin-dashboard");
              return;
            }
            
            setUserRole(userData.role || "EMPLOYEE");
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
      <header className="border-b sticky top-0 z-10 bg-background">
        <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <FaUserClock className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">TimeTrack</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <FaUser className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{userName}</span>
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
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Employee Dashboard</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your attendance and view your records
            </p>
          </div>

          <Tabs defaultValue="attendance" className="space-y-4">
            <div className="overflow-x-auto pb-2">
              <TabsList className="inline-flex w-full tabs-list mobile-scrollable">
                <TabsTrigger value="attendance" className="flex-1 whitespace-nowrap">
                  <FaUserClock className="mr-2 h-4 w-4" />
                  <span>Attendance</span>
                </TabsTrigger>
                <TabsTrigger value="leave" className="flex-1 whitespace-nowrap">
                  <FaCalendarAlt className="mr-2 h-4 w-4" />
                  <span>Leave</span>
                </TabsTrigger>
                <TabsTrigger value="tasks" className="flex-1 whitespace-nowrap">
                  <FaTasks className="mr-2 h-4 w-4" />
                  <span>Tasks</span>
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex-1 whitespace-nowrap">
                  <FaUserEdit className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="attendance" className="space-y-4">
              <AttendanceCheckInOut />
            </TabsContent>
            
            <TabsContent value="leave" className="space-y-4">
              <LeaveManagement />
            </TabsContent>
            
            <TabsContent value="tasks" className="space-y-4">
              <EmployeeTaskDashboard />
            </TabsContent>
            
            <TabsContent value="profile" className="space-y-4">
              <UserProfile />
            </TabsContent>
          </Tabs>
        </main>
        
        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t sm:hidden z-10 mobile-bottom-nav">
          <div className="grid grid-cols-4 h-16 mobile-no-select mobile-safe-bottom">
            <Button 
              variant="ghost" 
              className="flex flex-col items-center justify-center h-full w-full rounded-none mobile-touch-feedback haptic-feedback"
              onClick={() => document.querySelector('[data-value="attendance"]')?.click()}
            >
              <FaUserClock className="h-5 w-5" />
              <span className="text-xs mt-1">Attendance</span>
            </Button>
            <Button 
              variant="ghost" 
              className="flex flex-col items-center justify-center h-full w-full rounded-none mobile-touch-feedback haptic-feedback"
              onClick={() => document.querySelector('[data-value="leave"]')?.click()}
            >
              <FaCalendarAlt className="h-5 w-5" />
              <span className="text-xs mt-1">Leave</span>
            </Button>
            <Button 
              variant="ghost" 
              className="flex flex-col items-center justify-center h-full w-full rounded-none mobile-touch-feedback haptic-feedback"
              onClick={() => document.querySelector('[data-value="tasks"]')?.click()}
            >
              <FaTasks className="h-5 w-5" />
              <span className="text-xs mt-1">Tasks</span>
            </Button>
            <Button 
              variant="ghost" 
              className="flex flex-col items-center justify-center h-full w-full rounded-none mobile-touch-feedback haptic-feedback"
              onClick={() => document.querySelector('[data-value="profile"]')?.click()}
            >
              <FaUserEdit className="h-5 w-5" />
              <span className="text-xs mt-1">Profile</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}