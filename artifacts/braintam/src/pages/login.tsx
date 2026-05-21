import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLogin, useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { Mail, Phone, Lock, ArrowRight, Eye, EyeOff, ArrowLeft, ChevronUp } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 200);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.student);
        setLocation("/dashboard");
      },
      onError: () => setError("Invalid email/phone or password"),
    },
  });

  const sendOtpMutation = useSendOtp({
    mutation: {
      onSuccess: () => setOtpSent(true),
      onError: () => setError("Failed to send OTP"),
    },
  });

  const verifyOtpMutation = useVerifyOtp({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.student);
        setLocation("/dashboard");
      },
      onError: () => setError("Invalid OTP"),
    },
  });

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ data: { email, password } });
  };

  const handleSendOtp = () => {
    setError("");
    sendOtpMutation.mutate({ data: { phone } });
  };

  const handleVerifyOtp = () => {
    setError("");
    verifyOtpMutation.mutate({ data: { phone, otp } });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-secondary via-secondary/90 to-primary/80 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/5"
              style={{ width: (i + 1) * 80, height: (i + 1) * 80, left: `${20 + i * 10}%`, top: `${10 + i * 12}%` }}
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3 + i, repeat: Infinity }}
            />
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center text-white space-y-6">
          <img src={braintamLogo} alt="Braintam" className="w-32 h-auto mx-auto drop-shadow-xl" />
          <h2 className="text-4xl font-bold">Welcome Back!</h2>
          <p className="text-xl text-white/80 max-w-sm">Your learning journey continues. Let's pick up where you left off.</p>
          <div className="grid grid-cols-2 gap-4 mt-8">
            {[
              { label: "Live Classes", value: "500+" },
              { label: "Courses", value: "200+" },
              { label: "Students", value: "5L+" },
              { label: "Avg Score Boost", value: "40%" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background relative">
        {/* Back button */}
        <div className="absolute top-5 left-5">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
        </div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md space-y-8">
          <div className="text-center">
            <img src={braintamLogo} alt="Braintam" className="w-16 h-auto mx-auto mb-4 lg:hidden" />
            <h1 className="text-3xl font-bold text-foreground">Sign in</h1>
            <p className="text-muted-foreground mt-2">Access your Braintam account</p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm" data-testid="login-error">
              {error}
            </div>
          )}

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="email" data-testid="tab-email">Email / Password</TabsTrigger>
              <TabsTrigger value="phone" data-testid="tab-phone">Phone OTP</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-email"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base rounded-xl"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="phone">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      data-testid="input-phone"
                    />
                  </div>
                </div>
                {!otpSent ? (
                  <Button
                    onClick={handleSendOtp}
                    className="w-full h-12 text-base rounded-xl"
                    disabled={sendOtpMutation.isPending || !phone}
                    data-testid="button-send-otp"
                  >
                    {sendOtpMutation.isPending ? "Sending..." : "Send OTP"}
                  </Button>
                ) : (
                  <>
                    <div className="bg-primary/10 text-primary px-4 py-3 rounded-lg text-sm">
                      OTP sent! (Check server logs for demo OTP)
                    </div>
                    <div>
                      <Label htmlFor="otp">Enter OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="mt-1 text-center text-2xl tracking-widest"
                        maxLength={6}
                        data-testid="input-otp"
                      />
                    </div>
                    <Button
                      onClick={handleVerifyOtp}
                      className="w-full h-12 text-base rounded-xl"
                      disabled={verifyOtpMutation.isPending || otp.length < 6}
                      data-testid="button-verify-otp"
                    >
                      {verifyOtpMutation.isPending ? "Verifying..." : "Verify & Login"}
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline" data-testid="link-register">
              Create one free
            </Link>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-primary">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>

      {/* Scroll-to-top button — visible on mobile when scrolled down */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-50 lg:hidden w-11 h-11 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-transform"
            aria-label="Scroll to top"
          >
            <ChevronUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
