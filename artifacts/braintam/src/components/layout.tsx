import { ReactNode } from "react";
import { useAuth } from "./auth-provider";
import { Link, useLocation } from "wouter";
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import { LayoutDashboard, Video, BookOpen, FileText, CheckSquare, Award, LogOut, PlaySquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const WA_NUMBER = "918492944473";
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=Hi%20Braintam%2C%20I%20need%20help!`;

function WhatsAppFab() {
  return (
    <a
      href={WA_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg hover:scale-110 transition-transform"
      style={{ background: "#25D366" }}
      aria-label="Chat on WhatsApp"
    >
      <svg viewBox="0 0 32 32" width="28" height="28" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.003 2C8.28 2 2 8.28 2 16.003c0 2.478.651 4.9 1.885 7.02L2 30l7.174-1.858A13.95 13.95 0 0 0 16.003 30C23.72 30 30 23.72 30 16.003 30 8.28 23.72 2 16.003 2zm0 25.538a11.564 11.564 0 0 1-5.89-1.614l-.422-.251-4.258 1.103 1.13-4.134-.277-.44a11.537 11.537 0 0 1-1.746-6.2c0-6.373 5.19-11.563 11.563-11.563 6.374 0 11.563 5.19 11.563 11.563 0 6.374-5.19 11.536-11.663 11.536zm6.34-8.645c-.347-.174-2.058-1.015-2.376-1.13-.32-.115-.551-.174-.783.173-.231.347-.898 1.13-1.101 1.362-.202.231-.405.26-.752.086-.347-.173-1.464-.54-2.789-1.72-1.03-.918-1.725-2.052-1.928-2.399-.202-.347-.022-.534.152-.707.156-.155.347-.405.52-.607.174-.203.231-.347.347-.578.115-.231.058-.434-.029-.607-.087-.174-.783-1.883-1.072-2.58-.283-.678-.57-.585-.783-.596l-.665-.012c-.231 0-.607.087-.924.434-.318.347-1.215 1.188-1.215 2.897s1.244 3.36 1.418 3.592c.173.231 2.447 3.737 5.93 5.239.829.358 1.476.572 1.98.732.832.264 1.59.227 2.188.138.668-.1 2.058-.842 2.348-1.655.29-.812.29-1.508.202-1.655-.086-.145-.318-.231-.665-.405z"/>
      </svg>
    </a>
  );
}

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
          <header className="h-14 border-b flex items-center gap-2 px-4 bg-card">
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
            <div className="flex-1" />
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-80 transition-opacity">
              <img src={braintamLogo} alt="Braintam" className="w-6 h-6 object-contain" />
              <span className="hidden sm:inline">Braintam</span>
            </Link>
          </header>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
      <WhatsAppFab />
    </SidebarProvider>
  );
}
