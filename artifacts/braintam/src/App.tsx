import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
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
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 2,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { student, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-3 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }
  if (!student) {
    return <Redirect to="/login" />;
  }
  return <Component />;
}

function GuestRoute({ component: Component }: { component: React.ComponentType }) {
  const { student, isLoading } = useAuth();
  if (isLoading) return null;
  if (student) return <Redirect to="/dashboard" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />

      {/* Guest-only routes */}
      <Route path="/login">
        <GuestRoute component={LoginPage} />
      </Route>
      <Route path="/register">
        <GuestRoute component={RegisterPage} />
      </Route>

      {/* Protected routes */}
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/live-classes">
        <ProtectedRoute component={LiveClassesPage} />
      </Route>
      <Route path="/courses">
        <ProtectedRoute component={CoursesPage} />
      </Route>
      <Route path="/courses/:id">
        <ProtectedRoute component={CourseDetailPage} />
      </Route>
      <Route path="/recordings">
        <ProtectedRoute component={RecordingsPage} />
      </Route>
      <Route path="/animated-videos">
        <ProtectedRoute component={AnimatedVideosPage} />
      </Route>
      <Route path="/homework">
        <ProtectedRoute component={HomeworkPage} />
      </Route>
      <Route path="/assignments">
        <ProtectedRoute component={AssignmentsPage} />
      </Route>
      <Route path="/tests">
        <ProtectedRoute component={TestsPage} />
      </Route>
      <Route path="/tests/:id">
        <ProtectedRoute component={TestTakingPage} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={ProfilePage} />
      </Route>
      <Route path="/leaderboard">
        <ProtectedRoute component={LeaderboardPage} />
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
