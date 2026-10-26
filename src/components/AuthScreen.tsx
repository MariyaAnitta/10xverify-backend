import React, { useState } from "react";
import { Shield, Lock, User, Mail, Database } from "lucide-react";
import { msalInstance, loginRequest } from "../authConfig";

interface AuthScreenProps {
  onLogin: (user: any) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"Admin Policy" | "Auditor Desk" | "Vendor Node">("Vendor Node");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);

  const handleMicrosoftLogin = async () => {
    setError("");
    setSsoLoading(true);
    try {
      // 1. Trigger Microsoft Entra ID popup
      const response = await msalInstance.loginPopup(loginRequest);
      if (!response || !response.account) {
        throw new Error("Microsoft authentication did not return account data.");
      }

      const account = response.account;
      const userEmail = (account.username || (account.idTokenClaims as any)?.preferred_username || (account.idTokenClaims as any)?.email || "").toLowerCase();
      const userName = account.name || userEmail.split("@")[0] || "10xDS Officer";

      // 2. Register / verify session with backend
      const res = await fetch("/api/auth/azure-sso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          name: userName,
          role: "Compliance Officer",
          tenantId: account.tenantId,
          homeAccountId: account.homeAccountId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "SSO session creation failed");

      // 3. Complete login
      const loggedInUser = {
        email: data.user.email,
        name: data.user.name,
        role: data.user.role || "Compliance Officer"
      };

      onLogin(loggedInUser);
    } catch (err: any) {
      console.error("Microsoft SSO Error:", err);
      if (err.name === "BrowserAuthError" && err.errorCode === "user_cancelled") {
        setError("Microsoft login was cancelled.");
      } else {
        setError(err.message || "Microsoft Entra ID authentication failed.");
      }
    } finally {
      setSsoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin 
        ? { email, password } 
        : { email, password, name, role };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed");

      // Set user structure to match App.tsx expectations
      const loggedInUser = {
        email: data.user.email,
        name: data.user.name,
        role: data.user.role === "Admin Policy" ? "Compliance Officer" 
            : data.user.role === "Auditor Desk" ? "Vetting Officer" 
            : "Vendor"
      };

      onLogin(loggedInUser);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-100 flex p-6 font-sans">
      
      {/* Left side branding */}
      <div className="hidden lg:flex w-1/3 flex-col justify-center px-12 border-r border-slate-800/50">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full w-max mb-8 border border-emerald-500/20 uppercase tracking-widest">
          Secure Workflow Interface
        </div>
        <h1 className="text-5xl font-extrabold text-white tracking-tight mb-4 flex items-center gap-3">
          10xVerify<span className="text-emerald-400">.AI</span>
        </h1>
        <p className="text-slate-400 leading-relaxed mb-12 text-sm max-w-sm">
          Automated Digital Due Diligence & Intelligent Document Processing (10xIDP) Workforce
        </p>

        <div className="space-y-6">
          <FeatureItem 
            icon={<Database className="w-5 h-5 text-emerald-400" />}
            title="Multi-Agent Vetting"
            desc="7 specialized AI agents screen registries, financial standing, address listings, and regulatory blacklists in real-time."
          />
          <FeatureItem 
            icon={<Shield className="w-5 h-5 text-indigo-400" />}
            title="Policy Compliance Governance"
            desc="Full audit trail logging, custom override decision pathways, and executive compliance dashboards for seamless TPRM control."
          />
          <FeatureItem 
            icon={<Database className="w-5 h-5 text-blue-400" />}
            title="Vendor Self-Onboarding Vault"
            desc="Streamlined registration node, bank filing validation, tax ID verification, and document optical character processing."
          />
        </div>
      </div>

      {/* Right side form */}
      <div className="w-full lg:w-2/3 flex flex-col justify-center px-6 md:px-24">
        
        <div className="max-w-2xl w-full mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {isLogin ? "Access Platform Workspace" : "Deploy Audited Node"}
              </h2>
              <p className="text-slate-400 text-sm">
                {isLogin ? "Sign in to access your customized dashboard gateway" : "Create your official account on the distributed verification ledger"}
              </p>
            </div>
            
            <div className="flex bg-[#121927] p-1 rounded-2xl border border-slate-800">
              <button 
                type="button"
                onClick={() => setIsLogin(true)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${isLogin ? 'bg-[#1e2638] text-emerald-400 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Sign In
              </button>
              <button 
                type="button"
                onClick={() => setIsLogin(false)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${!isLogin ? 'bg-[#1e2638] text-emerald-400 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Register
              </button>
            </div>
          </div>

          {/* Microsoft SSO Section for Internal Staff */}
          {isLogin && (
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={ssoLoading}
                className="w-full bg-[#161f30] hover:bg-[#1e2a42] border border-slate-700 hover:border-slate-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-3 shadow-md group cursor-pointer disabled:opacity-50"
              >
                {/* Official Microsoft 4-Color Logo */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                </svg>
                <span>
                  {ssoLoading ? "Connecting to Microsoft Entra ID..." : "Sign in with Microsoft (10xDS SSO)"}
                </span>
              </button>
              <p className="text-[11px] text-slate-400 text-center">
                For internal 10xDS Compliance Officers, Vetting Officers, and Admins.
              </p>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="shrink mx-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Or continue with credentials / vendor portal
                </span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Username / Login ID (Email)</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. anitta_compliance@company.com"
                    className="w-full bg-[#121927] border border-slate-700/60 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
                {!isLogin && <p className="text-[10px] text-slate-500 pl-1">Your unique node identifier. Only valid emails are allowed.</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Password / Access Key</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter security passcode"
                    className="w-full bg-[#121927] border border-slate-700/60 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
                {!isLogin && <p className="text-[10px] text-slate-500 pl-1">Passwords provide node encryption.</p>}
              </div>

              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name / Company Title</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Marie Anitta"
                      className="w-full bg-[#121927] border border-slate-700/60 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </>
              )}
            </div>

            {!isLogin && (
              <div className="pt-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 block mb-3">Select Functional Node Role</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <RoleCard 
                    title="Auditor Desk" 
                    subtitle="Vetting Officer" 
                    desc="Review, run AI agents, add audit logs" 
                    active={role === "Auditor Desk"} 
                    onClick={() => setRole("Auditor Desk")} 
                  />
                  <RoleCard 
                    title="Admin Policy" 
                    subtitle="Compliance Officer" 
                    desc="Oversee metrics, approve or reject vendors" 
                    active={role === "Admin Policy"} 
                    onClick={() => setRole("Admin Policy")} 
                  />
                  <RoleCard 
                    title="Vendor Portal" 
                    subtitle="Vendor" 
                    desc="Submit bank details, tax forms, compliance docs" 
                    active={role === "Vendor Node"} 
                    onClick={() => setRole("Vendor Node")} 
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 px-4 rounded-xl transition-colors mt-6 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Processing..." : (isLogin ? "Access Workspace Terminal →" : "Deploy Audited Ledger Node →")}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex gap-4 p-4 rounded-2xl bg-[#121927]/50 border border-slate-800/50">
      <div className="w-10 h-10 rounded-xl bg-[#1e2638] flex items-center justify-center shrink-0 border border-slate-700/50">
        {icon}
      </div>
      <div>
        <h3 className="text-white font-bold text-sm mb-1">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function RoleCard({ title, subtitle, desc, active, onClick }: { title: string, subtitle: string, desc: string, active: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`cursor-pointer border p-4 rounded-xl transition-all ${active ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-[#121927] border-slate-800 hover:border-slate-600'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className={`font-bold text-sm ${active ? 'text-emerald-400' : 'text-white'}`}>{title}</h4>
        {active && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>}
      </div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{subtitle}</div>
      <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
    </div>
  )
}
