import { ReactNode, useState } from "react";
import { useAuth, UserRole } from "./auth-provider";
import { DemoPaywall } from "./demo-paywall";
import { Link, useLocation } from "wouter";
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import { LayoutDashboard, Video, BookOpen, FileText, CheckSquare, Award, LogOut, PlaySquare, ArrowLeft, Shield, GraduationCap, Users, ClipboardList, BarChart3, User, MessageCircle, Phone, Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const NAVY = "#0A2342";
const GOLD = "#D4AF37";

const WA_NUMBER = "918492944473";

function HelpFab() {
  const [open, setOpen] = useState(false);

  const options = [
    { icon: MessageCircle, label: "WhatsApp",     color: "#25D366", action: () => window.open(`https://wa.me/${WA_NUMBER}?text=Hi%20Braintam%2C%20I%20need%20help!`, "_blank") },
    { icon: Phone,         label: "Call Support", color: NAVY,      action: () => window.open("tel:+918492944473") },
    { icon: Ticket,        label: "Raise Ticket", color: "#7c3aed", action: () => window.open(`https://wa.me/${WA_NUMBER}?text=I%20want%20to%20raise%20a%20support%20ticket`, "_blank") },
  ];

  return (
    <div className="fixed z-50 bottom-20 right-4 md:bottom-6 md:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{   opacity: 0, y: 10,  scale: 0.9 }}
            className="mb-3 flex flex-col gap-2 items-end"
          >
            {options.map(({ icon: Icon, label, color, action }) => (
              <button
                key={label}
                onClick={() => { action(); setOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 rounded-full text-white text-xs font-semibold shadow-lg hover:opacity-90 transition-opacity"
                style={{ background: color }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-3 rounded-full text-white text-xs font-bold shadow-xl hover:scale-105 transition-transform"
        style={{ background: open ? "#64748b" : NAVY }}
      >
        {open ? <X className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
        {open ? "Close" : "Need Help?"}
      </button>
    </div>
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
  { href: "/leaderboard", icon: Award,             label: "Ranks" },
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
            <div className="flex items-center">
              <img src={braintamLogo} alt="Braintam Logo" className="h-10 w-auto object-contain" />
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
            className="h-14 border-b flex items-center gap-2 px-3 md:px-4"
            style={{ background: "white" }}
          >
            <SidebarTrigger
              className="h-10 w-10 rounded-xl text-white shadow-md hover:opacity-90 transition-opacity"
              style={{ background: NAVY, color: "white" }}
            />
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

            <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
              <img src={braintamLogo} alt="Braintam" className="h-9 w-auto object-contain" />
            </Link>
          </header>

          {/* Main content — extra bottom padding on mobile for the bottom nav */}
          <div className={`flex-1 overflow-y-auto ${isStudent ? "pb-16 md:pb-4" : ""}`}>
            {isStudent && !location.startsWith("/demo-batch")
              ? <DemoPaywall>{children}</DemoPaywall>
              : children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav — students only */}
      {isStudent && <MobileBottomNav location={location} />}

      {/* Help FAB — available on all student pages */}
      {isStudent && <HelpFab />}
    </SidebarProvider>
  );
}
