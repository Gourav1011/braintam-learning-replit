import { useEffect } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { UpdateBanner } from "@/components/update-banner";
import { AuthProvider, STAFF_TOKEN_KEY, useAuth } from "@/components/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { braintamLogo } from "@/lib/brand-assets";

import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import LiveClassesPage from "@/pages/live-classes";
import CoursesPage from "@/pages/courses";
import CourseDetailPage from "@/pages/course-detail";
import RecordingsPage from "@/pages/recordings";
import AnimatedVideosPage from "@/pages/animated-videos";
import HomeworkPage from "@/pages/homework";
import AssignmentsPage from "@/pages/assignments";
import TestsPage from "@/pages/tests";
import TestTakingPage from "@/pages/test-taking";
import ProfilePage from "@/pages/profile";
import LeaderboardPage from "@/pages/leaderboard";
import DemoBatchesPage from "@/pages/demo-batches";
import DemoBatchPage from "@/pages/demo-batch";
import LiveClassroomPage from "@/pages/live-classroom";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import OurStoryPage from "@/pages/our-story";
import MeetTheMastersPage from "@/pages/meet-the-masters";
import JoinTheMissionPage from "@/pages/join-the-mission";
import KnowledgeHubPage from "@/pages/knowledge-hub";
import NewsroomPage from "@/pages/newsroom";
import GlobalAlliancesPage from "@/pages/global-alliances";
import ConnectPage from "@/pages/connect";
import HelpPage from "@/pages/help";
import RefundPage from "@/pages/refund";
import StudentProtectionPage from "@/pages/student-protection";
import NotFound from "@/pages/not-found";
import OnboardingPage from "@/pages/onboarding";
import AdminPage from "@/pages/admin";
import TeacherPage from "@/pages/teacher";
import TeacherLoginPage from "@/pages/teacher-login";
import AdminLoginPage from "@/pages/admin-login";
import MentorPage from "@/pages/mentor";
import MentorLoginPage from "@/pages/mentor-login";
import LoginPage from "@/pages/login";
import ForgotPasswordPage from "@/pages/forgot-password";
import RegisterPage from "@/pages/register";
import EnrollPage from "@/pages/enroll";
import EnrollFullPage from "@/pages/enroll-full";
import DownloadAppPage from "@/pages/download-app";
import SpaceJourneyPage from "@/pages/space-journey";
import TasksPage from "@/pages/tasks";
import RewardsPage from "@/pages/rewards";
import { legacyStudentAuthDestination } from "@/lib/student-auth";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Route guards ──────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 0,              // always consider data stale → refetch on every mount/focus
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center">
        <div className="mb-6 animate-pulse">
          <img
            src={braintamLogo}
            alt="Braintam"
            className="w-28 h-auto object-contain"
          />
        </div>

        <h1
          className="text-4xl font-black tracking-tight"
          style={{ color: "#0B1F4D" }}
        >
          Braintam
        </h1>

        <p className="mt-3 text-lg font-semibold text-center">
          <span style={{ color: "#0B1F4D" }}>Smarter Minds.</span>{" "}
          <span style={{ color: "#F97316" }}>Brighter Futures.</span>
        </p>

        <div className="mt-8 w-56">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full animate-pulse"
              style={{
                width: "70%",
                background: "#F97316",
              }}
            />
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-500 font-medium">
          Loading...
        </p>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { student, isLoading } = useAuth();
  const [location] = useLocation();
  if (isLoading) return <LoadingScreen />;
  if (!student) return <Redirect to={`/login?redirect_url=${encodeURIComponent(location)}`} />;
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { student, role, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!student) return <Redirect to="/admin/login" />;
  if (role !== "admin" && role !== "super_admin") return <Redirect to="/dashboard" />;
  return <Component />;
}

function TeacherRoute({ component: Component }: { component: React.ComponentType }) {
  const { student, role, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  // The teacher login page navigates in-app after saving the staff token.
  // Keep this route on the loading screen for the short profile-resolution
  // handoff instead of bouncing an authenticated teacher back to login.
  if (!student && localStorage.getItem(STAFF_TOKEN_KEY)) return <LoadingScreen />;
  if (!student) return <Redirect to="/teacher/login" />;
  if (role !== "teacher" && role !== "admin") return <Redirect to="/dashboard" />;
  return <Component />;
}

function MentorRoute({ component: Component }: { component: React.ComponentType }) {
  const { student, role, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!student) return <Redirect to="/mentor/login" />;
  if (!["mentor", "academic_mentor", "sales_mentor", "admin", "super_admin"].includes(role ?? "")) return <Redirect to="/dashboard" />;
  return <Component />;
}

function StaffRoute({ component: Component }: { component: React.ComponentType }) {
  const { student, role, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!student) return <Redirect to="/login" />;
  if (!["admin", "super_admin", "teacher", "mentor", "academic_mentor", "sales_mentor"].includes(role ?? "")) return <Redirect to="/dashboard" />;
  return <Component />;
}

function GuestRoute({ component: Component }: { component: React.ComponentType }) {
  const { student, isLoading } = useAuth();
  if (isLoading) return null;
  if (student) return <Redirect to="/dashboard" />;
  return <Component />;
}

// Clears cached user data whenever a custom student or staff token changes.
function AuthQueryClientCacheInvalidator() {
  const qc = useQueryClient();

  useEffect(() => {
    function onAuthChange() {
      qc.clear();
    }

    function onStorage(event: StorageEvent) {
      if (event.key === "braintam_student_token" || event.key === "braintam_staff_token") {
        qc.clear();
      }
    }

    window.addEventListener("braintam:auth_change", onAuthChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("braintam:auth_change", onAuthChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [qc]);

  return null;
}

// ── Subdomain routing ─────────────────────────────────────────
// admin.braintam.com  → /admin portal
// teacher.braintam.com → /teacher portal
// braintam.com        → student-facing site (unchanged)
function SubdomainRedirect() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    const host = window.location.hostname; // e.g. "admin.braintam.com"
    const sub = host.split(".")[0].toLowerCase();
    if (sub === "admin" && !location.startsWith("/admin")) {
      setLocation("/admin");
    } else if (sub === "teacher" && !location.startsWith("/teacher")) {
      setLocation("/teacher");
    }
  }, []);
  return null;
}

// ── Scroll to top on every navigation ─────────────────────────
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [location]);
  return null;
}

function LegacySignInRedirect() {
  return (
    <Redirect
      to={legacyStudentAuthDestination("/login", window.location.search)}
    />
  );
}

function LegacySignUpRedirect() {
  return (
    <Redirect
      to={legacyStudentAuthDestination("/register", window.location.search)}
    />
  );
}

// ── Router ────────────────────────────────────────────────────
function Router() {
  return (
    <>
      <ScrollToTop />
      <SubdomainRedirect />
      <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/our-story" component={OurStoryPage} />
      <Route path="/meet-the-masters" component={MeetTheMastersPage} />
      <Route path="/join-the-mission" component={JoinTheMissionPage} />
      <Route path="/knowledge-hub" component={KnowledgeHubPage} />
      <Route path="/newsroom" component={NewsroomPage} />
      <Route path="/global-alliances" component={GlobalAlliancesPage} />
      <Route path="/connect" component={ConnectPage} />
      <Route path="/help" component={HelpPage} />
      <Route path="/refund" component={RefundPage} />
      <Route path="/student-protection" component={StudentProtectionPage} />
      <Route path="/enroll" component={EnrollPage} />
      <Route path="/enroll-full" component={EnrollFullPage} />
      <Route path="/download-app" component={DownloadAppPage} />

      {/* Legacy student auth URLs now use the custom phone/password flow. */}
      <Route path="/sign-in/*?" component={LegacySignInRedirect} />
      <Route path="/sign-up/*?" component={LegacySignUpRedirect} />

      {/* Canonical custom student auth routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/register" component={RegisterPage} />

      {/* Post-signup onboarding */}
      <Route path="/onboarding" component={OnboardingPage} />

      {/* Staff login pages */}
      <Route path="/teacher/login/*?" component={TeacherLoginPage} />
      <Route path="/admin/login/*?" component={AdminLoginPage} />
      <Route path="/mentor/login/*?" component={MentorLoginPage} />

      {/* Role-specific portals */}
      <Route path="/admin"><AdminRoute component={AdminPage} /></Route>
      <Route path="/teacher"><TeacherRoute component={TeacherPage} /></Route>
      <Route path="/mentor"><MentorRoute component={MentorPage} /></Route>

      {/* Protected */}
      <Route path="/dashboard"><ProtectedRoute component={DashboardPage} /></Route>
      <Route path="/live-classes" component={LiveClassesPage} />
      <Route path="/live/:sessionId"><ProtectedRoute component={LiveClassroomPage} /></Route>
      <Route path="/courses" component={CoursesPage} />
      <Route path="/courses/:id"><ProtectedRoute component={CourseDetailPage} /></Route>
      <Route path="/recordings"><Redirect to="/live-classes?tab=completed" /></Route>
      <Route path="/animated-videos"><Redirect to="/courses?section=animated-videos" /></Route>

      {/* New unified pages */}
      <Route path="/tasks"><ProtectedRoute component={TasksPage} /></Route>
      <Route path="/rewards"><ProtectedRoute component={RewardsPage} /></Route>

      {/* Legacy routes — redirect to new destinations */}
      <Route path="/homework"><Redirect to="/tasks?tab=homework" /></Route>
      <Route path="/assignments"><Redirect to="/tasks?tab=assignments" /></Route>
      <Route path="/tests"><Redirect to="/tasks?tab=tests" /></Route>
      <Route path="/tests/:id"><ProtectedRoute component={TestTakingPage} /></Route>
      <Route path="/leaderboard"><Redirect to="/rewards?tab=leaderboard" /></Route>
      <Route path="/space-journey"><Redirect to="/rewards?tab=journey" /></Route>

      <Route path="/profile"><ProtectedRoute component={ProfilePage} /></Route>
      <Route path="/demo-batches"><ProtectedRoute component={DemoBatchesPage} /></Route>
      <Route path="/demo-batches/:id"><ProtectedRoute component={DemoBatchPage} /></Route>

      <Route component={NotFound} />
    </Switch>
    </>
  );
}

function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthQueryClientCacheInvalidator />
      <TooltipProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <AppProviders />
      <PWAInstallPrompt />
      <UpdateBanner />
    </WouterRouter>
  );
}
