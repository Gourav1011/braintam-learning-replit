import { ReactNode, useState, useRef, useEffect } from "react";
import { useAuth, UserRole } from "./auth-provider";
import { DemoPaywall } from "./demo-paywall";
import { Link, useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider,
  SidebarTrigger, SidebarGroup, SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Video, BookOpen, FileText, CheckSquare, Award,
  LogOut, PlaySquare, ArrowLeft, Shield, GraduationCap, Users,
  ClipboardList, BarChart3, User, MessageCircle, Phone, Ticket, X,
  Home, ClipboardCheck, Trophy, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";

const NAVY = "#0A2342";
const GOLD = "#D4AF37";

const WA_NUMBER = "918492944473";

const STUDENT_NAV = [
  { href: "/dashboard",    icon: Home,           label: "Home",    color: "#7257f5" },
  { href: "/live-classes", icon: Video,          label: "Classes", color: "#ff6077" },
  { href: "/courses",      icon: BookOpen,       label: "Learn",   color: "#18b96b" },
  { href: "/tasks",        icon: ClipboardCheck, label: "Tasks",   color: "#ff970f" },
  { href: "/rewards",      icon: Trophy,         label: "Rewards", color: "#f6bc16" },
];

function isNavActive(href: string, location: string) {
  if (href === "/dashboard") return location === "/dashboard" || location === "/";
  return location.startsWith(href);
}

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

function StudentSidebar() {
  const [location] = useLocation();
  const { student, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  function handleLogout() {
    logout();
    setLocation("/");
  }

  return (
    <div
      className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-white border-r border-gray-100"
      style={{ width: 176, boxShadow: "2px 0 16px rgba(0,0,0,0.06)" }}
    >
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 flex-shrink-0">
        <Link href="/dashboard">
          <img src={braintamLogo} alt="Braintam" className="h-9 w-auto object-contain cursor-pointer" />
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {STUDENT_NAV.map(({ href, icon: Icon, label, color }) => {
          const active = isNavActive(href, location);
          return (
            <Link key={href} href={href}>
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all hover:bg-gray-50"
                style={active ? { background: color + "12" } : {}}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ background: active ? color : "#F3F4F6" }}
                >
                  <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" style={{ color: active ? "white" : "#9CA3AF" }} />
                </div>
                <span
                  className="text-sm font-bold transition-colors"
                  style={{ color: active ? color : "#6B7280" }}
                >
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Profile section */}
      <div className="px-3 pb-5 flex-shrink-0 relative" ref={profileRef}>
        <button
          onClick={() => setProfileOpen(o => !o)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl hover:bg-gray-50 transition-all"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0B2B6B, #1a4a9b)" }}
          >
            {student?.name?.charAt(0)?.toUpperCase() ?? "S"}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-bold text-gray-800 truncate">{student?.name?.split(" ")[0] ?? "Student"}</p>
            <p className="text-[10px] text-gray-400 font-medium">
              {student?.grade ? `Grade ${student.grade}` : "Student"}
            </p>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-3 right-3 mb-1 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden"
            >
              <Link href="/profile" onClick={() => setProfileOpen(false)}>
                <div className="px-4 py-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2.5 transition-colors">
                  <User className="w-3.5 h-3.5" />
                  My Profile
                </div>
              </Link>
              <div className="h-px bg-gray-100" />
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StudentMobileNav() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-stretch"
      style={{
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 -1px 0 rgba(0,0,0,0.06), 0 -4px 24px rgba(0,0,0,0.08)",
        height: 60,
      }}
    >
      {STUDENT_NAV.map(({ href, icon: Icon, label, color }) => {
        const active = isNavActive(href, location);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{ background: active ? color + "20" : "transparent" }}
            >
              <Icon
                className="w-[19px] h-[19px] transition-all"
                style={{ color: active ? color : "#9CA3AF" }}
                strokeWidth={active ? 2.5 : 1.8}
              />
            </div>
            <span
              className="text-[9px] font-bold leading-none transition-colors"
              style={{ color: active ? color : "#9CA3AF" }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// ── Staff layout (teacher / admin / mentor) — unchanged ────────────────────

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

const studentNavItemsLegacy = [
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

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  admin:   { label: "Admin",   color: "bg-red-100 text-red-700" },
  teacher: { label: "Teacher", color: "bg-blue-100 text-blue-700" },
  student: { label: "Student", color: "bg-green-100 text-green-700" },
};

function StaffLayout({ children }: { children: ReactNode }) {
  const { student, role, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = () => { logout(); setLocation("/"); };

  const navItems =
    role === "admin" || role === "super_admin" ? adminNavItems :
    role === "teacher" ? teacherNavItems :
    studentNavItemsLegacy;

  const roleBadge = ROLE_BADGE[role ?? "student"];

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
          <header className="h-14 border-b flex items-center gap-2 px-3 md:px-4" style={{ background: "white" }}>
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
            <div className="flex-1" />
            <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
              <img src={braintamLogo} alt="Braintam" className="h-9 w-auto object-contain" />
            </Link>
          </header>

          <div className="flex-1 overflow-y-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}

// ── Student layout — new 5-section design ─────────────────────────────────

function StudentLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <>
      {/* Desktop sidebar */}
      <StudentSidebar />

      {/* Main content */}
      <div className="md:ml-[176px] min-h-screen">
        <div className="pb-[60px] md:pb-4 min-h-screen">
          <DemoPaywall>{children}</DemoPaywall>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <StudentMobileNav />

      {/* Help FAB */}
      <HelpFab />
    </>
  );
}

// ── Public export ──────────────────────────────────────────────────────────

export function AppLayout({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const isStudent = !role || role === "student";

  if (isStudent) return <StudentLayout>{children}</StudentLayout>;
  return <StaffLayout>{children}</StaffLayout>;
}
