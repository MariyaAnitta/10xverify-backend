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
  const [loginRole, setLoginRole] = useState<"Compliance Officer" | "Vetting Officer" | "Vendor">("Compliance Officer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);

  const handleMicrosoftLogin = async () => {
    setError("");
    setSsoLoading(true);
    try {
      // Direct full-page redirect to Microsoft (NO POPUP!)
      await msalInstance.loginRedirect(loginRequest);
    } catch (err: any) {
      console.error("Microsoft SSO Error:", err);
      setError(err.message || "Failed to initiate Microsoft login.");
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
        ? { email, password, role: loginRole } 
        : { email, password, name, role: "Vendor Node" };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed");

      const loggedInUser = {
        email: data.user.email,
        name: data.user.name,
        role: data.user.role || loginRole
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
          Enterprise Security Gateway
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {isLogin ? "Access Platform Workspace" : "Vendor Self-Registration Portal"}
              </h2>
              <p className="text-slate-400 text-sm">
                {isLogin 
                  ? "Sign in with corporate Microsoft SSO or enter credentials" 
                  : "Register your company to submit due diligence filings and onboarding documentation"}
              </p>
            </div>
            
            <div className="flex bg-[#121927] p-1 rounded-2xl border border-slate-800 shrink-0">
              <button 
                type="button"
                onClick={() => { setIsLogin(true); setError(""); }}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${isLogin ? 'bg-[#1e2638] text-emerald-400 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Sign In
              </button>
              <button 
                type="button"
                onClick={() => { setIsLogin(false); setError(""); }}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${!isLogin ? 'bg-[#1e2638] text-emerald-400 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Vendor Register
              </button>
            </div>
          </div>

          {/* Microsoft SSO Section (Clean, sleek, non-intrusive) */}
          {isLogin && (
            <div className="space-y-4 mb-6">
              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={ssoLoading}
                className="w-full bg-[#121927] hover:bg-[#182234] border border-slate-700/80 hover:border-slate-500 text-white font-semibold py-3.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-3 shadow-sm group cursor-pointer disabled:opacity-50"
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

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="shrink mx-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Or sign in with email & credentials
                </span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Role Selector on Sign In for seamless testing of all roles */}
              {isLogin && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Select Operating Role
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#121927] border border-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setLoginRole("Compliance Officer")}
                      className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        loginRole === "Compliance Officer"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Compliance Officer
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginRole("Vetting Officer")}
                      className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        loginRole === "Vetting Officer"
                          ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Vetting Officer
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginRole("Vendor")}
                      className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        loginRole === "Vendor"
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Vendor Portal
                    </button>
                  </div>
                </div>
              )}

              {!isLogin && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Company Legal Name & Contact Person
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Apex Global Logistics (John Doe)"
                      className="w-full bg-[#121927] border border-slate-700/60 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  {isLogin ? "Email Address" : "Official Company Work Email"}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isLogin ? "e.g. anitta.shaji@10xds.com" : "e.g. compliance@yourcompany.com"}
                    className="w-full bg-[#121927] border border-slate-700/60 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
                {!isLogin && <p className="text-[10px] text-slate-500 pl-1">This corporate email will serve as your vendor verification ID.</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-[#121927] border border-slate-700/60 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 px-4 rounded-xl transition-colors mt-4 text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/10"
            >
              {loading 
                ? "Processing..." 
                : (isLogin ? "Sign In to Workspace →" : "Create Vendor Account & Continue →")}
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
