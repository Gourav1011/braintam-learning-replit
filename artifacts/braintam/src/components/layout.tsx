import { ReactNode } from "react";
import { useAuth } from "./auth-provider";
import { Link, useLocation } from "wouter";
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import { LayoutDashboard, Video, BookOpen, FileText, CheckSquare, Award, LogOut, PlaySquare, User } from "lucide-react";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/live-classes", icon: Video, label: "Live Classes" },
  { href: "/courses", icon: BookOpen, label: "Courses" },
  { href: "/recordings", icon: PlaySquare, label: "Recordings" },
  { href: "/animated-videos", icon: PlaySquare, label: "Animated Videos" },
  { href: "/homework", icon: FileText, label: "Homework" },
  { href: "/assignments", icon: FileText, label: "Assignments" },
  { href: "/tests", icon: CheckSquare, label: "Tests" },
  { href: "/leaderboard", icon: Award, label: "Leaderboard" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { student, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r bg-card">
          <SidebarHeader className="p-4 border-b">
            <div className="flex items-center gap-3">
              <img src={braintamLogo} alt="Braintam Logo" className="w-8 h-8 object-contain" />
              <span className="font-bold text-xl text-primary">Braintam</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location.startsWith(item.href)}
                        className="font-medium h-10"
                      >
                        <Link href={item.href} className="flex items-center gap-3 w-full cursor-pointer">
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-auto py-2">
                  <Link href="/profile" className="flex items-center gap-3 w-full cursor-pointer">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={student?.avatarUrl || ""} />
                      <AvatarFallback>{student?.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-sm">
                      <span className="font-semibold truncate w-32">{student?.name}</span>
                      <span className="text-xs text-muted-foreground">Grade {student?.grade}</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="text-destructive mt-2">
                  <LogOut className="w-5 h-5 mr-2" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 border-b flex items-center px-4 md:hidden">
            <SidebarTrigger />
          </header>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
