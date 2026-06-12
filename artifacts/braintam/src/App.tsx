import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import ImportedSignUpPage from "@/pages/sign-up";
import { ClerkProvider, SignIn, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { UpdateBanner } from "@/components/update-banner";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";

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
import EnrollPage from "@/pages/enroll";
import DownloadAppPage from "@/pages/download-app";
import SpaceJourneyPage from "@/pages/space-journey";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

// ── Clerk setup ───────────────────────────────────────────────
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: ORANGE,
    colorForeground: NAVY,
    colorMutedForeground: "#6B7280",
    colorDanger: "#EF4444",
    colorBackground: "#FFFFFF",
    colorInput: "#F8FAFC",
    colorInputForeground: NAVY,
    colorNeutral: "#D1D5DB",
    fontFamily: "Poppins, sans-serif",
    borderRadius: "12px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#0B2B6B] font-bold",
    headerSubtitle: "text-[#6B7280]",
    socialButtonsBlockButtonText: "text-[#0B2B6B] font-semibold",
    socialButtonsBlockButton: "border border-[#D1D5DB] hover:bg-gray-50",
    formFieldLabel: "text-[#0B2B6B] font-medium",
    formFieldInput: "border-[#D1D5DB] text-[#0B2B6B]",
    formButtonPrimary: "bg-[#FF6B1A] hover:bg-[#e05a0f] text-white font-bold",
    footerActionLink: "text-[#FF6B1A] font-semibold hover:text-[#e05a0f]",
    footerActionText: "text-[#6B7280]",
    dividerText: "text-[#6B7280]",
    dividerLine: "bg-[#D1D5DB]",
    identityPreviewEditButton: "text-[#FF6B1A]",
    formFieldSuccessText: "text-green-600",
    alertText: "text-[#EF4444]",
    alert: "bg-red-50 border-red-200",
    otpCodeFieldInput: "border-[#D1D5DB] text-[#0B2B6B]",
    logoBox: "mt-1",
    logoImage: "rounded-xl",
    footerAction: "bg-gray-50",
    formFieldRow: "gap-3",
    main: "gap-4",
  },
};

// ── Sign-in page ──────────────────────────────────────────────
const STATS = [
  { value: "5L+", label: "Students" },
  { value: "50+", label: "Teachers" },
  { value: "4.9★", label: "Rating" },
  { value: "98%", label: "Retention" },
];

function AuthPageShell({ form }: { form: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a7a 60%, #0d2260 100%)` }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: ORANGE }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: "#3b5fc0" }} />

        {/* Logo */}
        <div className="relative z-10">
          <img src={braintamLogo} alt="Braintam" className="w-44 h-auto object-contain" />
        </div>

        {/* Headline */}
        <div className="space-y-6 relative z-10">
          <div>
            <h1 className="text-white font-black text-4xl leading-tight mb-3">
              India's #1 Learning<br />
              <span style={{ color: ORANGE }}>Platform for Students</span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              Live classes, adaptive tests, animated videos and more — built for Grades 1–10.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {STATS.map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <div className="text-white font-black text-lg leading-none">{s.value}</div>
                <div className="text-white/50 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Trust quote */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-white/80 text-sm italic leading-relaxed">
              "Braintam transformed the way my daughter studies. Her grades improved by 40% in just 3 months!"
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                style={{ background: ORANGE }}>P</div>
              <div>
                <div className="text-white text-xs font-semibold">Priya Nair</div>
                <div className="text-white/50 text-xs">Parent, Chennai</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="text-white/30 text-xs relative z-10">
          © 2026 Braintam Learning LLP. All Rights Reserved.
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 bg-gray-50 min-h-screen lg:min-h-0 relative">
        {/* Back button */}
        <a
          href="/"
          className="absolute top-5 left-5 flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity"
          style={{ color: NAVY }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </a>
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <img src={braintamLogo} alt="Braintam" className="w-10 h-10 object-contain" />
          <span className="font-black text-xl" style={{ color: NAVY }}>Braintam</span>
        </div>
        {form}
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthPageShell form={
      <div className="w-full max-w-md">
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          forceRedirectUrl={`${basePath}/dashboard`}
        />
      </div>
    } />
  );
}

const SignUpPage = ImportedSignUpPage;

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
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-lg"
            style={{ background: "#0B1F4D" }}
          >
            🧠
          </div>
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
  if (!student) return <Redirect to={`/sign-in?redirect_url=${encodeURIComponent(location)}`} />;
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
  if (!student) return <Redirect to="/teacher/login" />;
  if (role !== "teacher" && role !== "admin") return <Redirect to="/dashboard" />;
  return <Component />;
}

function MentorRoute({ component: Component }: { component: React.ComponentType }) {
  const { student, role, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!student) return <Redirect to="/mentor/login" />;
  if (role !== "mentor" && role !== "admin") return <Redirect to="/dashboard" />;
  return <Component />;
}

function GuestRoute({ component: Component }: { component: React.ComponentType }) {
  const { student, isLoading } = useAuth();
  if (isLoading) return null;
  if (student) return <Redirect to="/dashboard" />;
  return <Component />;
}

// ── Cache invalidation on auth change ────────────────────────
// Clears React Query cache whenever EITHER the Clerk user OR the custom
// braintam_student_token/braintam_staff_token changes — prevents stale data
// from a previous user bleeding into the new session.
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const prevTokenRef  = useRef<string | null>(
    localStorage.getItem("braintam_student_token") ?? localStorage.getItem("braintam_staff_token")
  );

  // Watch Clerk user changes
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const uid = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== uid) {
        qc.clear();
      }
      prevUserIdRef.current = uid;
    });
    return unsub;
  }, [addListener, qc]);

  // Watch custom token changes (email/password students & staff).
  // Uses a custom "braintam:auth_change" event because the native "storage"
  // event only fires in OTHER tabs, not the same tab where the write happens.
  useEffect(() => {
    function onAuthChange() { qc.clear(); }
    window.addEventListener("braintam:auth_change", onAuthChange);
    return () => window.removeEventListener("braintam:auth_change", onAuthChange);
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
      <Route path="/download-app" component={DownloadAppPage} />

      {/* Clerk auth routes (Google SSO / email students) */}
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />

      {/* Custom login page with email/password + forgot password */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register"><Redirect to="/sign-up" /></Route>

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
      <Route path="/courses" component={CoursesPage} />
      <Route path="/courses/:id"><ProtectedRoute component={CourseDetailPage} /></Route>
      <Route path="/recordings"><ProtectedRoute component={RecordingsPage} /></Route>
      <Route path="/animated-videos"><ProtectedRoute component={AnimatedVideosPage} /></Route>
      <Route path="/homework"><ProtectedRoute component={HomeworkPage} /></Route>
      <Route path="/assignments"><ProtectedRoute component={AssignmentsPage} /></Route>
      <Route path="/tests"><ProtectedRoute component={TestsPage} /></Route>
      <Route path="/tests/:id"><ProtectedRoute component={TestTakingPage} /></Route>
      <Route path="/profile"><ProtectedRoute component={ProfilePage} /></Route>
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/demo-batches"><ProtectedRoute component={DemoBatchesPage} /></Route>
      <Route path="/demo-batches/:id"><ProtectedRoute component={DemoBatchPage} /></Route>
      <Route path="/space-journey"><ProtectedRoute component={SpaceJourneyPage} /></Route>

      <Route component={NotFound} />
    </Switch>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back to Braintam", subtitle: "Sign in to continue learning" } },
        signUp: { start: { title: "Join Braintam today", subtitle: "India's #1 platform for Grades 1–10" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
      <PWAInstallPrompt />
      <UpdateBanner />
    </WouterRouter>
  );
}
