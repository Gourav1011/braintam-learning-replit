import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { SignUpPageContent } from "@/pages/sign-up";
import { ClerkProvider, SignIn, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import NotFound from "@/pages/not-found";
import OnboardingPage from "@/pages/onboarding";
import AdminPage from "@/pages/admin";
import TeacherPage from "@/pages/teacher";

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
          © 2025 Braintam Learning. All Rights Reserved.
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
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={`${basePath}/dashboard`}
      />
    } />
  );
}

function SignUpPage() {
  return <AuthPageShell form={<SignUpPageContent />} />;
}

// ── Route guards ──────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 2 } },
});

function LoadingScreen() {
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
  if (!student) return <Redirect to="/sign-in" />;
  if (role !== "admin") return <Redirect to="/dashboard" />;
  return <Component />;
}

function TeacherRoute({ component: Component }: { component: React.ComponentType }) {
  const { student, role, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!student) return <Redirect to="/sign-in" />;
  if (role !== "teacher" && role !== "admin") return <Redirect to="/dashboard" />;
  return <Component />;
}

function GuestRoute({ component: Component }: { component: React.ComponentType }) {
  const { student, isLoading } = useAuth();
  if (isLoading) return null;
  if (student) return <Redirect to="/dashboard" />;
  return <Component />;
}

// ── Cache invalidation on auth change ────────────────────────
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
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
  return null;
}

// ── Router ────────────────────────────────────────────────────
function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />

      {/* Clerk auth routes */}
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />

      {/* Old routes → redirect to Clerk pages */}
      <Route path="/login"><Redirect to="/sign-in" /></Route>
      <Route path="/register"><Redirect to="/sign-up" /></Route>

      {/* Post-signup onboarding */}
      <Route path="/onboarding" component={OnboardingPage} />

      {/* Role-specific portals */}
      <Route path="/admin"><AdminRoute component={AdminPage} /></Route>
      <Route path="/teacher"><TeacherRoute component={TeacherPage} /></Route>

      {/* Protected */}
      <Route path="/dashboard"><ProtectedRoute component={DashboardPage} /></Route>
      <Route path="/live-classes"><ProtectedRoute component={LiveClassesPage} /></Route>
      <Route path="/courses"><ProtectedRoute component={CoursesPage} /></Route>
      <Route path="/courses/:id"><ProtectedRoute component={CourseDetailPage} /></Route>
      <Route path="/recordings"><ProtectedRoute component={RecordingsPage} /></Route>
      <Route path="/animated-videos"><ProtectedRoute component={AnimatedVideosPage} /></Route>
      <Route path="/homework"><ProtectedRoute component={HomeworkPage} /></Route>
      <Route path="/assignments"><ProtectedRoute component={AssignmentsPage} /></Route>
      <Route path="/tests"><ProtectedRoute component={TestsPage} /></Route>
      <Route path="/tests/:id"><ProtectedRoute component={TestTakingPage} /></Route>
      <Route path="/profile"><ProtectedRoute component={ProfilePage} /></Route>
      <Route path="/leaderboard"><ProtectedRoute component={LeaderboardPage} /></Route>

      <Route component={NotFound} />
    </Switch>
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
    </WouterRouter>
  );
}
