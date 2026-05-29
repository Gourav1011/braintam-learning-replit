import { ReactNode } from "react";
import { useAuth, UserRole } from "./auth-provider";
import { Link, useLocation } from "wouter";
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import { LayoutDashboard, Video, BookOpen, FileText, CheckSquare, Award, LogOut, PlaySquare, ArrowLeft, Shield, GraduationCap, Users, ClipboardList, BarChart3, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const NAVY = "#0A2342";
const GOLD = "#D4AF37";

const WA_NUMBER = "918492944473";
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=Hi%20Braintam%2C%20I%20need%20help!`;

function WhatsAppFab() {
  return (
    <a
      href={WA_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed z-50 flex items-center justify-center w-12 h-12 rounded-full shadow-lg hover:scale-110 transition-transform md:w-14 md:h-14"
      style={{ background: "#25D366", bottom: "80px", right: "16px" }}
      aria-label="Chat on WhatsApp"
    >
      <svg viewBox="0 0 32 32" width="24" height="24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.003 2C8.28 2 2 8.28 2 16.003c0 2.478.651 4.9 1.885 7.02L2 30l7.174-1.858A13.95 13.95 0 0 0 16.003 30C23.72 30 30 23.72 30 16.003 30 8.28 23.72 2 16.003 2zm0 25.538a11.564 11.564 0 0 1-5.89-1.614l-.422-.251-4.258 1.103 1.13-4.134-.277-.44a11.537 11.537 0 0 1-1.746-6.2c0-6.373 5.19-11.563 11.563-11.563 6.374 0 11.563 5.19 11.563 11.563 0 6.374-5.19 11.536-11.663 11.536zm6.34-8.645c-.347-.174-2.058-1.015-2.376-1.13-.32-.115-.551-.174-.783.173-.231.347-.898 1.13-1.101 1.362-.202.231-.405.26-.752.086-.347-.173-1.464-.54-2.789-1.72-1.03-.918-1.725-2.052-1.928-2.399-.202-.347-.022-.534.152-.707.156-.155.347-.405.52-.607.174-.203.231-.347.347-.578.115-.231.058-.434-.029-.607-.087-.174-.783-1.883-1.072-2.58-.283-.678-.57-.585-.783-.596l-.665-.012c-.231 0-.607.087-.924.434-.318.347-1.215 1.188-1.215 2.897s1.244 3.36 1.418 3.592c.173.231 2.447 3.737 5.93 5.239.829.358 1.476.572 1.98.732.832.264 1.59.227 2.188.138.668-.1 2.058-.842 2.348-1.655.29-.812.29-1.508.202-1.655-.086-.145-.318-.231-.665-.405z"/>
      </svg>
    </a>
  );
}

const studentNavItems = [
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

const bottomNavItems = [
  { href: "/dashboard",   icon: LayoutDashboard, label: "Home" },
  { href: "/courses",     icon: BookOpen,         label: "Courses" },
  { href: "/live-classes",icon: Video,            label: "Live" },
  { href: "/homework",    icon: FileText,         label: "Homework" },
  { href: "/profile",     icon: User,             label: "Profile" },
];

const teacherNavItems = [
  { href: "/teacher", icon: LayoutDashboard, label: "Teacher Portal" },
  { href: "/teacher?tab=courses", icon: BookOpen, label: "My Courses" },
  { href: "/teacher?tab=live", icon: Video, label: "Live Classes" },
  { href: "/teacher?tab=homework", icon: FileText, label: "Homework" },
  { href: "/teacher?tab=assignments", icon: ClipboardList, label: "Assignments" },
  { href: "/teacher?tab=tests", icon: CheckSquare, label: "Tests" },
  { href: "/teacher?tab=submissions", icon: ClipboardList, label: "Grade Work" },
  { href: "/teacher?tab=attendance", icon: CheckSquare, label: "Attendance" },
];

const adminNavItems = [
  { href: "/admin", icon: BarChart3, label: "Analytics" },
  { href: "/admin?tab=users", icon: Users, label: "Manage Users" },
  { href: "/admin?tab=assignments", icon: GraduationCap, label: "Assign Teachers" },
  { href: "/admin?tab=enrollments", icon: BookOpen, label: "Enrollments" },
  { href: "/admin?tab=announcements", icon: FileText, label: "Announcements" },
  { href: "/admin?tab=banners", icon: Shield, label: "Banners" },
];

function getNavItems(role: UserRole | null) {
  if (role === "admin") return adminNavItems;
  if (role === "teacher") return teacherNavItems;
  return studentNavItems;
}

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  admin:   { label: "Admin",   color: "bg-red-100 text-red-700" },
  teacher: { label: "Teacher", color: "bg-blue-100 text-blue-700" },
  student: { label: "Student", color: "bg-green-100 text-green-700" },
};

function MobileBottomNav({ location }: { location: string }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-stretch"
      style={{
        background: NAVY,
        boxShadow: "0 -2px 16px rgba(0,0,0,0.25)",
        height: "60px",
      }}
    >
      {bottomNavItems.map(({ href, icon: Icon, label }) => {
        const isActive = location === href || (href !== "/dashboard" && location.startsWith(href));
        return (
          <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all relative">
            <div
              className="flex flex-col items-center justify-center gap-0.5 w-full py-1"
              style={{ color: isActive ? GOLD : "rgba(255,255,255,0.45)" }}
            >
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: GOLD }}
                />
              )}
              <Icon
                className="w-5 h-5"
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { student, role, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const navItems = getNavItems(role);
  const roleBadge = ROLE_BADGE[role ?? "student"];
  const isStudent = !role || role === "student";

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
                        isActive={location === item.href || location.startsWith(item.href.split("?")[0]) && item.href === item.href.split("?")[0]}
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
                      <span className="font-semibold truncate w-28">{student?.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium mt-0.5 ${roleBadge?.color}`}>
                        {roleBadge?.label ?? role}
                        {role === "student" && student?.grade ? ` · Grade ${student.grade}` : ""}
                      </span>
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
          {/* Header */}
          <header
            className="h-14 border-b flex items-center gap-2 px-4"
            style={{ background: "white" }}
          >
            <SidebarTrigger />
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            {/* Mobile greeting */}
            {isStudent && student?.name && (
              <div className="flex-1 md:hidden px-1">
                <p className="text-xs font-semibold truncate" style={{ color: NAVY }}>
                  Hey, {student.name.split(" ")[0]} 👋
                </p>
              </div>
            )}

            <div className="flex-1 hidden md:block" />

            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-80 transition-opacity">
              <img src={braintamLogo} alt="Braintam" className="w-6 h-6 object-contain" />
              <span className="hidden sm:inline">Braintam</span>
            </Link>
          </header>

          {/* Main content — extra bottom padding on mobile for the bottom nav */}
          <div className={`flex-1 overflow-y-auto ${isStudent ? "pb-16 md:pb-0" : ""}`}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav — students only */}
      {isStudent && <MobileBottomNav location={location} />}

      {/* WhatsApp FAB — sits above bottom nav on mobile */}
      <WhatsAppFab />
    </SidebarProvider>
  );
}
