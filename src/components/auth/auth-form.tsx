"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Lock, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

type Mode = "signin" | "signup";

// Email regex — basic format validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm() {
  const signIn = useStore((s) => s.signIn);
  const signUp = useStore((s) => s.signUp);
  const authLoading = useStore((s) => s.authLoading);
  const justSignedUp = useStore((s) => s.justSignedUp);

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validateSignup(): boolean {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      newErrors.password = "Password must include uppercase, lowercase, and a number";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validateSignin(): boolean {
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = "Email is required";
    else if (!EMAIL_REGEX.test(email)) newErrors.email = "Please enter a valid email";
    if (!password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const valid = mode === "signin" ? validateSignin() : validateSignup();
    if (!valid) return;

    try {
      if (mode === "signin") {
        await signIn(email, password);
        toast({
          title: "Welcome back!",
          description: "You're now signed in.",
        });
      } else {
        await signUp(email, password);
        if (!justSignedUp) {
          toast({
            title: "Account created!",
            description: "Welcome to Tulkit.",
          });
        }
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  // If user just signed up and email confirmation is required
  if (justSignedUp) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background:
            "linear-gradient(135deg, #B0E0E6 0%, #E6F2F5 50%, #F0F7FA 100%)",
        }}
      >
        <div className="w-full max-w-md">
          <Card className="shadow-lg border-0">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to <strong>{email}</strong>.
                Click the link in the email to activate your account.
              </p>
              <p className="text-xs text-muted-foreground">
                After confirming, return here and sign in with your email and password.
              </p>
              <div className="pt-4 space-y-2">
                <Button
                  onClick={() => {
                    useStore.setState({ justSignedUp: false });
                    setMode("signin");
                  }}
                  className="w-full bg-[#0E7C9C] hover:bg-[#0A6582] text-white"
                >
                  I&apos;ve confirmed — sign in
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    useStore.setState({ justSignedUp: false });
                    setEmail("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                >
                  Use a different email
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pt-4 border-t mt-4">
                Didn&apos;t get the email? Check your spam folder.
              </p>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-neutral-500 mt-6">
            Powered by{" "}
            <a
              href="https://brandweaver.co.za"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-neutral-700 hover:underline"
            >
              Brandweaver
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, #B0E0E6 0%, #E6F2F5 50%, #F0F7FA 100%)",
      }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Logo + branding */}
        <div className="text-center space-y-3">
          <div
            className="inline-flex items-center justify-center rounded-xl px-4 py-3"
            style={{ backgroundColor: "#B0E0E6" }}
          >
            <img src="/tulkit.png" alt="Tulkit" className="h-12 w-auto" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Tulkit</h1>
            <p className="text-sm text-neutral-600">
              Invoices & Quotes made easy
            </p>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Sign in to access your invoices and quotes"
                : "Start creating professional invoices in minutes"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {submitError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex gap-2 items-start">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: "" });
                    }}
                    className={`pl-9 ${errors.email ? "border-red-400" : ""}`}
                    autoComplete="email"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: "" });
                    }}
                    className={`pl-9 pr-9 ${errors.password ? "border-red-400" : ""}`}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600">{errors.password}</p>
                )}
                {mode === "signup" && !errors.password && (
                  <p className="text-xs text-muted-foreground">
                    Min 8 characters, with uppercase, lowercase, and a number
                  </p>
                )}
              </div>

              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" });
                      }}
                      className={`pl-9 ${errors.confirmPassword ? "border-red-400" : ""}`}
                      autoComplete="new-password"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={authLoading}
                className="w-full bg-[#0E7C9C] hover:bg-[#0A6582] text-white"
              >
                {authLoading ? (
                  "Please wait..."
                ) : (
                  <>
                    {mode === "signin" ? "Sign in" : "Create account"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => {
                      setMode("signup");
                      setErrors({});
                      setSubmitError(null);
                    }}
                    className="text-[#0E7C9C] hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setMode("signin");
                      setErrors({});
                      setSubmitError(null);
                    }}
                    className="text-[#0E7C9C] hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-neutral-500">
          Powered by{" "}
          <a
            href="https://brandweaver.co.za"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-neutral-700 hover:underline"
          >
            Brandweaver
          </a>
        </div>
      </div>
    </div>
  );
}
