import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaUserClock, FaSignOutAlt, FaUser, FaUserEdit, FaCalendarAlt } from "react-icons/fa";
import AttendanceCheckInOut from "@/components/AttendanceCheckInOut";
import UserProfile from "@/components/UserProfile";
import LeaveManagement from "@/components/LeaveManagement";

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
          const response = await fetch(`/api/user`);
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
      <header className="border-b">
        <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <FaUserClock className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">TimeTrack</h1>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FaUser className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{userName}</span>
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

      <div className="flex flex-col">
        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight">Employee Dashboard</h2>
            <p className="text-muted-foreground">
              Manage your attendance and view your records
            </p>
          </div>

          <Tabs defaultValue="attendance" className="space-y-4">
            <div className="overflow-x-auto pb-2">
              <TabsList className="inline-flex w-full">
                <TabsTrigger value="attendance" className="flex-1 whitespace-nowrap">
                  <FaUserClock className="mr-2 h-4 w-4" />
                  <span className="sm:inline">Attendance</span>
                </TabsTrigger>
                <TabsTrigger value="leave" className="flex-1 whitespace-nowrap">
                  <FaCalendarAlt className="mr-2 h-4 w-4" />
                  <span className="sm:inline">Leave</span>
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex-1 whitespace-nowrap">
                  <FaUserEdit className="mr-2 h-4 w-4" />
                  <span className="sm:inline">Profile</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="attendance" className="space-y-4">
              <AttendanceCheckInOut />
            </TabsContent>
            
            <TabsContent value="leave" className="space-y-4">
              <LeaveManagement />
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