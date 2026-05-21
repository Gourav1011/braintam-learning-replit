import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useRegister, useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, GraduationCap, ArrowLeft } from "lucide-react";

const grades = [1,2,3,4,5,6,7,8,9,10];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [grade, setGrade] = useState<number>(6);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");

  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.student);
        setLocation("/dashboard");
      },
      onError: () => setError("Registration failed. Please try again."),
    },
  });

  const sendOtpMutation = useSendOtp({
    mutation: {
      onSuccess: () => setStep("otp"),
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (!termsAccepted) { setError("Please accept the Terms & Conditions"); return; }

    if (phone && !email) {
      sendOtpMutation.mutate({ data: { phone } });
    } else {
      registerMutation.mutate({ data: { name, email, phone: phone || undefined, grade, password } });
    }
  };

  const handleVerifyOtp = () => {
    setError("");
    verifyOtpMutation.mutate({ data: { phone, otp, name, grade } });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-primary via-primary/90 to-secondary flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border-2 border-white"
              style={{ width: (i + 1) * 60, height: (i + 1) * 60, left: `${i * 12}%`, top: `${5 + i * 10}%` }}
              animate={{ rotate: 360 }}
              transition={{ duration: 10 + i * 2, repeat: Infinity, ease: "linear" }}
            />
          ))}
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 text-center text-white space-y-6">
          <img src={braintamLogo} alt="Braintam" className="w-28 h-auto mx-auto drop-shadow-xl" />
          <h2 className="text-3xl font-bold">Join Braintam</h2>
          <p className="text-white/80">India's smartest learning platform for grades 1-10</p>
          <div className="space-y-3 mt-6 text-left">
            {["Live classes with top teachers", "Animated concept videos", "Adaptive tests & quizzes", "Track progress & earn points", "Compete on leaderboards"].map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2"
              >
                <div className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
                <span className="text-sm font-medium">{item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-y-auto relative">
        {/* Back button */}
        <div className="absolute top-5 left-5">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
        </div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md space-y-6">
          <div className="text-center">
            <img src={braintamLogo} alt="Braintam" className="w-14 h-auto mx-auto mb-3 lg:hidden" />
            <h1 className="text-3xl font-bold text-foreground">Create Account</h1>
            <p className="text-muted-foreground mt-1">Start your learning journey today — it's free!</p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm" data-testid="register-error">
              {error}
            </div>
          )}

          {step === "details" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="name" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} className="pl-10" required data-testid="input-name" />
                </div>
              </div>

              <div>
                <Label htmlFor="reg-email">Email Address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="reg-email" type="email" placeholder="you@example.com (optional if using phone)" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" data-testid="input-reg-email" />
                </div>
              </div>

              <div>
                <Label htmlFor="reg-phone">Phone Number</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="reg-phone" type="tel" placeholder="+91 98765 43210 (optional if using email)" value={phone} onChange={e => setPhone(e.target.value)} className="pl-10" data-testid="input-reg-phone" />
                </div>
              </div>

              <div>
                <Label>Select Your Grade</Label>
                <div className="flex flex-wrap gap-2 mt-2" data-testid="grade-selector">
                  {grades.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${grade === g ? "bg-primary text-white scale-110 shadow-lg" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                      data-testid={`grade-btn-${g}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="reg-password">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="reg-password" type={showPassword ? "text" : "password"} placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" required minLength={6} data-testid="input-reg-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="confirm-password" type="password" placeholder="Re-enter password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10" required data-testid="input-confirm-password" />
                </div>
              </div>

              <div>
                <Label htmlFor="referral">Referral Code (Optional)</Label>
                <Input id="referral" placeholder="Enter referral code" value={referralCode} onChange={e => setReferralCode(e.target.value)} className="mt-1" data-testid="input-referral" />
              </div>

              <div className="flex items-start gap-3" data-testid="terms-checkbox">
                <Checkbox id="terms" checked={termsAccepted} onCheckedChange={v => setTermsAccepted(!!v)} className="mt-0.5" />
                <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary underline">Terms & Conditions</Link>
                  {" "}and{" "}
                  <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>
                </Label>
              </div>

              <Button type="submit" className="w-full h-12 text-base rounded-xl" disabled={registerMutation.isPending || sendOtpMutation.isPending} data-testid="button-register">
                {(registerMutation.isPending || sendOtpMutation.isPending) ? "Creating account..." : "Create My Account"}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-primary/10 text-primary px-4 py-3 rounded-lg text-sm text-center">
                OTP sent to {phone}. Check server logs for demo OTP.
              </div>
              <div>
                <Label htmlFor="reg-otp">Enter OTP</Label>
                <Input id="reg-otp" type="text" placeholder="6-digit OTP" value={otp} onChange={e => setOtp(e.target.value)} className="mt-1 text-center text-2xl tracking-widest" maxLength={6} data-testid="input-reg-otp" />
              </div>
              <Button onClick={handleVerifyOtp} className="w-full h-12 text-base rounded-xl" disabled={verifyOtpMutation.isPending || otp.length < 6} data-testid="button-verify-reg-otp">
                {verifyOtpMutation.isPending ? "Verifying..." : "Verify & Create Account"}
              </Button>
              <button onClick={() => setStep("details")} className="w-full text-sm text-muted-foreground underline">Go back</button>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline" data-testid="link-login">
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
