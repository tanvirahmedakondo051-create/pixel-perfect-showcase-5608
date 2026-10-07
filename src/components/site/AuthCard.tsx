import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo, Orbs } from "./Brand";

const errBn = (m: string) => {
  if (/invalid login/i.test(m)) return "ইমেইল বা পাসওয়ার্ড ভুল";
  if (/already registered/i.test(m)) return "এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট আছে";
  if (/not confirmed/i.test(m)) return "ইমেইল ভেরিফাই করা হয়নি। ইনবক্স দেখুন।";
  if (/password/i.test(m)) return "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে";
  return "কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন";
};

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const google = async () => {
    const h = window.location.hostname;
    const onLovable = h.endsWith(".lovable.app") || h.includes("lovableproject.com") || h === "localhost";
    setBusy(true);
    if (!onLovable) {
      // Self-hosted (VPS) domain: direct OAuth, browser redirects back to /login
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/login" },
      });
      setBusy(false);
      if (error) toast.error("গুগল লগইন ব্যর্থ হয়েছে");
      return;
    }
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/login" });
    setBusy(false);
    if (r.error) return toast.error("গুগল লগইন ব্যর্থ হয়েছে");
    if (r.redirected) return;
    nav({ to: "/dashboard" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error(errBn(error.message));
      toast.success("স্বাগতম!");
      nav({ to: "/dashboard" });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin + "/login", data: { full_name: name } },
      });
      setBusy(false);
      if (error) return toast.error(errBn(error.message));
      if (data.session) nav({ to: "/dashboard" });
      else toast.success("অ্যাকাউন্ট তৈরি হয়েছে! ইমেইলে পাঠানো লিংকে ক্লিক করে ভেরিফাই করুন।", { duration: 8000 });
    }
  };

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <Orbs />
      <div className="glass w-full max-w-md rounded-2xl p-6 sm:p-8">
        <Logo className="justify-center" />
        <h1 className="mt-6 text-center text-2xl font-bold">{mode === "login" ? "লগইন করুন" : "নতুন অ্যাকাউন্ট খুলুন"}</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">{mode === "login" ? "আপনার প্রজেক্টে ফিরে যান" : "ফ্রিতে শুরু করুন, কার্ড লাগবে না"}</p>
        <button onClick={google} disabled={busy} className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-input bg-background/40 font-medium hover:bg-accent">
          <svg className="size-5" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.7 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95S8.78 6.28 12 6.28c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.74 14.55 2.8 12 2.8 6.92 2.8 2.8 6.92 2.8 12s4.12 9.2 9.2 9.2c5.31 0 8.83-3.73 8.83-8.99 0-.6-.07-1.06-.48-1.11z"/></svg>
          গুগল দিয়ে চালিয়ে যান
        </button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />অথবা<span className="h-px flex-1 bg-border" /></div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2"><Label>আপনার নাম</Label><Input className="h-12" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          )}
          <div className="space-y-2"><Label>ইমেইল</Label><Input className="h-12" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="space-y-2"><Label>পাসওয়ার্ড</Label><Input className="h-12" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <button disabled={busy} className="min-h-12 w-full rounded-xl bg-brand font-semibold shadow-glow disabled:opacity-60">
            {busy ? "অপেক্ষা করুন..." : mode === "login" ? "লগইন" : "অ্যাকাউন্ট খুলুন"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? <>অ্যাকাউন্ট নেই? <Link to="/signup" className="text-cyan">সাইন আপ করুন</Link></> : <>আগেই অ্যাকাউন্ট আছে? <Link to="/login" className="text-cyan">লগইন করুন</Link></>}
        </p>
      </div>
    </div>
  );
}
