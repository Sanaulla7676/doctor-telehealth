"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Lock, Mail, Phone, User } from "lucide-react";
import { getApiUrl } from "@/lib/utils";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, login } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Input states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Switch tabs from URL search param
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "register") setActiveTab("register");
    else if (tab === "forgot") setActiveTab("forgot");
    else setActiveTab("login");
  }, [searchParams]);

  // Already logged in redirect
  useEffect(() => {
    if (isLoggedIn) {
      redirectAfterAuth();
    }
  }, [isLoggedIn]);

  const redirectAfterAuth = () => {
    const redirect = searchParams.get("redirect");
    if (redirect === "booking") {
      router.push("/#contact");
    } else {
      router.push("/portal");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      const response = await fetch(getApiUrl("/api/patient/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        login(data.token, data.full_name, data.email, data.patientAccountId);
        setSuccessMessage("Login successful! Redirecting...");
        setTimeout(() => {
          redirectAfterAuth();
        }, 1000);
      } else {
        setErrorMessage(data.error || "Invalid email or password.");
      }
    } catch (err) {
      setErrorMessage("Network error connecting to backend. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(getApiUrl("/api/patient/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email, phone, password })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        login(data.token, data.full_name, data.email, data.patientAccountId);
        setSuccessMessage("Registration successful! Welcome.");
        setTimeout(() => {
          redirectAfterAuth();
        }, 1000);
      } else {
        setErrorMessage(data.error || "Registration failed. Please check inputs.");
      }
    } catch (err) {
      setErrorMessage("Network error during registration. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(getApiUrl("/api/patient/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage("Password reset email sent. Please check your inbox.");
      } else {
        setErrorMessage(data.error || "Password reset failed.");
      }
    } catch (err) {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-24 px-4 sm:px-6 font-sans">
      {/* Tab Selectors */}
      {activeTab !== "forgot" && (
        <div className="flex border-b border-black/[0.05] mb-8 text-xs font-bold uppercase tracking-wider justify-center gap-6">
          <button
            onClick={() => setActiveTab("login")}
            className={`pb-3 transition duration-300 border-b-2 cursor-pointer ${
              activeTab === "login"
                ? "border-luxDark text-luxDark font-extrabold"
                : "border-transparent text-luxMuted hover:text-luxDark"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab("register")}
            className={`pb-3 transition duration-300 border-b-2 cursor-pointer ${
              activeTab === "register"
                ? "border-luxDark text-luxDark font-extrabold"
                : "border-transparent text-luxMuted hover:text-luxDark"
            }`}
          >
            Create Account
          </button>
        </div>
      )}

      {/* Auth Card */}
      <div className="bg-white border border-black/[0.04] p-8 rounded-[28px] shadow-sm">
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs leading-normal">
            {errorMessage}
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl text-green-700 text-xs leading-normal">
            {successMessage}
          </div>
        )}

        {/* SIGN IN FORM */}
        {activeTab === "login" && (
          <form onSubmit={handleLogin} className="space-y-6">
            <h3 className="text-xl font-extrabold text-luxDark font-serif italic text-center mb-2">Welcome Back</h3>
            <p className="text-[10px] text-luxMuted text-center mt-1">Access your patient portal and telemedicine dashboard.</p>
            
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-[9px] font-semibold text-luxMuted mb-1 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 pl-10 text-xs text-luxDark focus:outline-none"
                  required
                />
                <Mail className="absolute left-3.5 bottom-3.5 text-luxMuted w-4 h-4" />
              </div>

              <div className="relative">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[9px] font-semibold text-luxMuted uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => setActiveTab("forgot")}
                    className="text-[9px] text-luxAccent font-bold hover:text-luxDark transition cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 pl-10 text-xs text-luxDark focus:outline-none"
                  required
                />
                <Lock className="absolute left-3.5 bottom-3.5 text-luxMuted w-4 h-4" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-luxDark text-white hover:bg-luxMuted font-bold py-3.5 rounded-xl transition duration-300 uppercase text-[10px] tracking-wider cursor-pointer"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {activeTab === "register" && (
          <form onSubmit={handleRegister} className="space-y-6">
            <h3 className="text-xl font-extrabold text-luxDark font-serif italic text-center mb-2">Create Account</h3>
            <p className="text-[10px] text-luxMuted text-center mt-1">Register to schedule video calls and track clinical reports.</p>

            <div className="space-y-4">
              <div className="relative">
                <label className="block text-[9px] font-semibold text-luxMuted mb-1 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 pl-10 text-xs text-luxDark focus:outline-none"
                  required
                />
                <User className="absolute left-3.5 bottom-3.5 text-luxMuted w-4 h-4" />
              </div>

              <div className="relative">
                <label className="block text-[9px] font-semibold text-luxMuted mb-1 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 pl-10 text-xs text-luxDark focus:outline-none"
                  required
                />
                <Mail className="absolute left-3.5 bottom-3.5 text-luxMuted w-4 h-4" />
              </div>

              <div className="relative">
                <label className="block text-[9px] font-semibold text-luxMuted mb-1 uppercase tracking-wider">WhatsApp Number</label>
                <input
                  type="tel"
                  placeholder="+91XXXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 pl-10 text-xs text-luxDark focus:outline-none"
                  required
                />
                <Phone className="absolute left-3.5 bottom-3.5 text-luxMuted w-4 h-4" />
              </div>

              <div className="relative">
                <label className="block text-[9px] font-semibold text-luxMuted mb-1 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 pl-10 text-xs text-luxDark focus:outline-none"
                  required
                />
                <Lock className="absolute left-3.5 bottom-3.5 text-luxMuted w-4 h-4" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-luxDark text-white hover:bg-luxMuted font-bold py-3.5 rounded-xl transition duration-300 uppercase text-[10px] tracking-wider cursor-pointer"
            >
              {isLoading ? "Registering..." : "Register"}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {activeTab === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-6">
            <h3 className="text-xl font-extrabold text-luxDark font-serif italic text-center mb-2">Reset Password</h3>
            <p className="text-[10px] text-luxMuted text-center mt-1">Enter your registered email address to retrieve your account.</p>

            <div className="relative">
              <label className="block text-[9px] font-semibold text-luxMuted mb-1 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 pl-10 text-xs text-luxDark focus:outline-none"
                required
              />
              <Mail className="absolute left-3.5 bottom-3.5 text-luxMuted w-4 h-4" />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-luxDark text-white hover:bg-luxMuted font-bold py-3.5 rounded-xl transition duration-300 uppercase text-[10px] tracking-wider cursor-pointer"
            >
              {isLoading ? "Sending..." : "Recover Account"}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className="w-full text-center text-xs text-luxMuted hover:text-luxDark transition font-semibold flex items-center justify-center gap-1 cursor-pointer pt-2"
            >
              <span>Back to Login</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center font-sans text-xs font-bold uppercase tracking-wider text-luxMuted">
        Loading authentication portal...
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
