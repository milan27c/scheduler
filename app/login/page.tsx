'use client';

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Eye, EyeOff, ArrowRight, Mail, Lock } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    const ok = login(email, password);
    if (!ok) { setError("Invalid email or password."); setLoading(false); }
  };

  return (
    <>
      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33%       { transform: translate(60px, -80px) scale(1.15); }
          66%       { transform: translate(-40px, 50px) scale(0.9); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33%       { transform: translate(-70px, 60px) scale(1.1); }
          66%       { transform: translate(50px, -40px) scale(0.95); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33%       { transform: translate(40px, 70px) scale(0.9); }
          66%       { transform: translate(-60px, -50px) scale(1.2); }
        }
        @keyframes blob4 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50%       { transform: translate(-50px, -60px) scale(1.1); }
        }
        .blob1 { animation: blob1 14s ease-in-out infinite; }
        .blob2 { animation: blob2 18s ease-in-out infinite; }
        .blob3 { animation: blob3 16s ease-in-out infinite; }
        .blob4 { animation: blob4 20s ease-in-out infinite; }
      `}</style>

      <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-[#0d0118]">
        {/* Animated blobs */}
        <div className="blob1 absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full bg-[#5231FF] opacity-40 blur-[120px]" />
        <div className="blob2 absolute bottom-[10%] right-[10%] w-[450px] h-[450px] rounded-full bg-[#7C3AED] opacity-35 blur-[100px]" />
        <div className="blob3 absolute top-[40%] right-[25%] w-[350px] h-[350px] rounded-full bg-[#3D1FE8] opacity-30 blur-[90px]" />
        <div className="blob4 absolute bottom-[20%] left-[20%] w-[300px] h-[300px] rounded-full bg-[#9A87FF] opacity-25 blur-[110px]" />
        <div className="blob1 absolute top-[5%] right-[30%] w-[250px] h-[250px] rounded-full bg-[#1a0533] opacity-60 blur-[80px]" />
        {/* Card */}
        <div className="relative z-10 w-full max-w-[420px] bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl px-10 py-10 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">

          {/* Logo mark */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center">
              <Image src="/images/logo2.png" alt="Creative Scheduler" width={36} height={36} className="object-contain brightness-0 invert" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-1.5">Welcome Back</h1>
            <p className="text-sm text-white/60">Sign in to continue to Creative Scheduler</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="relative">
              <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              <input
                type="email"
                autoFocus
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/25 focus:border-white/25 transition-all"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-11 pr-11 py-3.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/25 focus:border-white/25 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-300 bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-[#3b1278] rounded-xl px-4 py-3.5 text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(255,255,255,0.2)] mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-[#3b1278]/30 border-t-[#3b1278] rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={15} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
