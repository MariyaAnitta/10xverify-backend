import React, { useState, useEffect } from "react";
import { Shield, Brain, Sparkles, Database, HelpCircle, Activity, LayoutGrid, CheckSquare, Settings } from "lucide-react";
import { VendorScreening, DashboardMetrics } from "./types";
import ExecutiveDashboard from "./components/ExecutiveDashboard";
import ProcurementDashboard from "./components/ProcurementDashboard";
import ComplianceDashboard from "./components/ComplianceDashboard";
import ScreeningPortal from "./components/ScreeningPortal";
import VendorDetailDossier from "./components/VendorDetailDossier";

interface UserProfile {
  email: string;
  name: string;
  role: "Compliance Officer" | "Vetting Officer";
}

const DEFAULT_USERS: UserProfile[] = [
  { email: "complianceofficer@10xverify.ai", name: "M. Anitta", role: "Compliance Officer" },
  { email: "officer@10xverify.ai", name: "V. Officer", role: "Vetting Officer" }
];

export default function App() {
  const [vendors, setVendors] = useState<VendorScreening[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<"executive" | "procurement" | "compliance" | "screen">("executive");
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendMode, setBackendMode] = useState<"AI_ACTIVE" | "SIMULATED">("SIMULATED");

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("10xverify_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const calculateFrontendMetrics = (vendorList: VendorScreening[]): DashboardMetrics => {
    const total = vendorList.length;
    const green = vendorList.filter(v => v.riskRating === "GREEN").length;
    const amber = vendorList.filter(v => v.riskRating === "AMBER").length;
    const red = vendorList.filter(v => v.riskRating === "RED").length;
    const black = vendorList.filter(v => v.riskRating === "BLACK").length;

    const pending = vendorList.filter(v => ["Pending", "In Progress", "Pending Review"].includes(v.status)).length;
    const approved = vendorList.filter(v => v.status === "Approved").length;
    const rejected = vendorList.filter(v => v.status === "Rejected").length;

    const indMap: Record<string, number> = {};
    vendorList.forEach(v => {
      const ind = v.industry || "Other";
      indMap[ind] = (indMap[ind] || 0) + 1;
    });
    const industryBreakdown = Object.entries(indMap).map(([name, count]) => ({ name, count }));

    const complianceAlerts = vendorList
      .filter(v => ["RED", "BLACK"].includes(v.riskRating))
      .map(v => ({
        id: `alert-${v.id}`,
        companyName: v.companyName,
        alertType: (v.riskRating === "BLACK" ? "sanction_link" : "adverse_media") as any,
        severity: (v.riskRating === "BLACK" ? "critical" : "high") as any,
        description: `Flagged by Risk Intelligence: ${v.recommendation}`,
        date: v.screenedAt
      }));

    return {
      totalScreened: total,
      riskDistribution: { green, amber, red, black },
      pendingVerifications: pending,
      approvedCount: approved,
      rejectedCount: rejected,
      industryBreakdown,
      complianceAlerts
    };
  };

  const fetchState = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      
      // Fetch health mode
      const reqHealth = await fetch("/api/health");
      if (reqHealth.ok) {
        const body = await reqHealth.json();
        setBackendMode(body.mode);
      }

      // Fetch Vendors list
      const reqVendors = await fetch("/api/vendors");
      if (reqVendors.ok) {
        const list: VendorScreening[] = await reqVendors.json();
        setVendors(prev => {
          // Merge lists: keep items in prev that aren't in list yet
          const merged = [...list];
          for (const item of prev) {
            if (!merged.some(v => v.id === item.id)) {
              merged.push(item);
            }
          }
          // Sort descending screenedAt
          merged.sort((a, b) => new Date(b.screenedAt).getTime() - new Date(a.screenedAt).getTime());
          // Update metrics reactively based on the fully merged state
          setMetrics(calculateFrontendMetrics(merged));
          return merged;
        });
      }

    } catch (err) {
      console.error("Critical error sync state from node backend:", err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchState(true);
  }, []);

  const handleNewScreeningComplete = (newVendor: VendorScreening) => {
    // Append locally immediately so the selected vendor is guaranteed to exist in the list
    setVendors(prev => {
      const updated = prev.some(v => v.id === newVendor.id) ? prev : [newVendor, ...prev];
      // Update metrics reactively
      setMetrics(calculateFrontendMetrics(updated));
      return updated;
    });
    // Automatically transition to the Executive Dashboard and open the newly screened dossier
    setSelectedVendorId(newVendor.id);
    setActiveTab("executive");
    // Refresh metrics & list in the background
    fetchState(false);
  };

  const handleStatusChange = async (id: string, status: "Approved" | "Rejected") => {
    try {
      const response = await fetch(`/api/vendors/${id}/status`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Role": currentUser?.role || ""
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        const updated: VendorScreening = await response.json();
        setVendors(prev => {
          const updatedList = prev.map(v => v.id === id ? updated : v);
          setMetrics(calculateFrontendMetrics(updatedList));
          return updatedList;
        });
        // Refresh everything
        fetchState(false);
      } else if (response.status === 403) {
        alert("Action Forbidden: Only a Compliance Officer can approve or reject onboarding status.");
      }
    } catch (err) {
      console.error("Failed to commit status change:", err);
    }
  };

  const handleAddComment = async (id: string, comment: { author: string; content: string }) => {
    try {
      const response = await fetch(`/api/vendors/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(comment)
      });
      if (response.ok) {
        const updated: VendorScreening = await response.json();
        setVendors(prev => {
          const updatedList = prev.map(v => v.id === id ? updated : v);
          setMetrics(calculateFrontendMetrics(updatedList));
          return updatedList;
        });
        // Refresh metrics as well
        fetchState(false);
      }
    } catch (err) {
      console.error("Failed to post audit comment:", err);
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this vendor record?")) return;
    try {
      const response = await fetch(`/api/vendors/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        setVendors(prev => {
          const updatedList = prev.filter(v => v.id !== id);
          setMetrics(calculateFrontendMetrics(updatedList));
          return updatedList;
        });
        setSelectedVendorId(null);
        fetchState(false);
      }
    } catch (err) {
      console.error("Failed to delete vendor:", err);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    // Simulate password check (since we aren't changing the backend DB)
    const user = DEFAULT_USERS.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());
    
    let isPasswordCorrect = false;
    if (user) {
      const emailLower = user.email.toLowerCase();
      if (emailLower === "complianceofficer@10xverify.ai" && loginPassword === "admin123") {
        isPasswordCorrect = true;
      } else if (emailLower === "officer@10xverify.ai" && loginPassword === "verify123") {
        isPasswordCorrect = true;
      }
    }

    if (user && isPasswordCorrect) {
      setCurrentUser(user);
      localStorage.setItem("10xverify_user", JSON.stringify(user));
      // Clear form
      setLoginEmail("");
      setLoginPassword("");
    } else {
      setLoginError("Invalid email or password.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("10xverify_user");
  };

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700/60 rounded-3xl p-8 shadow-2xl space-y-8 animate-fade-in">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/25">
              <Shield className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-4">10xVerify.AI</h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Secure Corporate Due Diligence and Compliance Gateway. Select your role profile to access the ledger.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 text-center animate-fade-in">
                {loginError}
              </div>
            )}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block pl-1">Email Address</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="e.g. anitta@10xverify.ai"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block pl-1">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-500/25 mt-2 text-sm cursor-pointer"
            >
              Sign In to Ledger
            </button>
            
          </form>

          <div className="text-center text-[10px] text-slate-500 font-mono">
            Blockchain Audit Locks Active • #HCL-9382-7721C
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="applet-root">
      
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 px-6 py-4 shadow-xxs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo Name */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-md rotate-3-disabled">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight font-sans">10xVerify.AI</span>
              </div>
              <p className="text-xxs font-medium text-slate-400 mt-0.5">AI-Powered Vendor, Partner & Business Due Diligence Platform</p>
            </div>
          </div>

          {/* User profile session switcher */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-1.5 px-3 rounded-2xl shrink-0 self-start md:self-auto">
            <div className="text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight">{currentUser.name}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{currentUser.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xxs bg-slate-200 hover:bg-slate-350 text-slate-650 hover:text-slate-900 font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Rails */}
      <nav className="bg-white border-b border-slate-100 px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "executive", label: "Executive Dashboard", desc: "Board overview", icon: LayoutGrid },
            { id: "procurement", label: "Procurement Workflows", desc: "Fast triage desk", icon: CheckSquare },
            { id: "compliance", label: "Compliance & Blacklists", desc: "SDN & regulatory logs", icon: Shield },
            { id: "screen", label: "Workforce Screening", desc: "Deploy AI Agents", icon: Brain }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && !selectedVendorId;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedVendorId(null);
                  setActiveTab(tab.id as any);
                  fetchState(false); // Background refresh state on tab switch
                }}
                className={`px-4 py-2 text-left rounded-xl transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="text-xs font-bold leading-none">{tab.label}</div>
                    <div className="text-[9px] font-semibold opacity-70 mt-0.5 hidden md:block">{tab.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Body */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {loading && (
          <div className="flex flex-col items-center justify-center p-24 text-center space-y-4">
            <Activity className="w-10 h-10 text-indigo-600 animate-spin" />
            <div>
              <h3 className="font-semibold text-slate-850">Syncing platform state</h3>
              <p className="text-xs text-slate-400 mt-1">Downloading screened archives and rebuilding analytics...</p>
            </div>
          </div>
        )}

        {!loading && metrics && (
          <>
            {/* If a deep dossier detail is currently loaded, prioritize rendering it over dashboard tabs */}
            {selectedVendor ? (
              <VendorDetailDossier
                vendor={selectedVendor}
                onBack={() => {
                  setSelectedVendorId(null);
                  setActiveTab("executive"); // Route to dashboard upon return
                  fetchState();
                }}
                onAddComment={(comment) => handleAddComment(selectedVendor.id, comment)}
                onDeleteVendor={handleDeleteVendor}
                currentUser={currentUser}
              />
            ) : (
              /* Regular workspace tabs */
              <>
                {activeTab === "executive" && (
                  <ExecutiveDashboard
                    vendors={vendors}
                    metrics={metrics}
                    onVendorSelect={(vendor) => setSelectedVendorId(vendor.id)}
                    onNewScreeningClick={() => setActiveTab("screen")}
                    onDeleteVendor={handleDeleteVendor}
                  />
                )}

                {activeTab === "procurement" && (
                  <ProcurementDashboard
                    vendors={vendors}
                    onVendorSelect={(vendor) => setSelectedVendorId(vendor.id)}
                    onStatusChange={handleStatusChange}
                    currentUser={currentUser}
                  />
                )}

                {activeTab === "compliance" && (
                  <ComplianceDashboard
                    vendors={vendors}
                    metrics={metrics}
                    onVendorSelect={(vendor) => setSelectedVendorId(vendor.id)}
                  />
                )}

                {activeTab === "screen" && (
                  <ScreeningPortal
                    onScreeningComplete={handleNewScreeningComplete}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Portal Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 px-6 mt-12 text-center text-xxs tracking-wider text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:justify-between items-center gap-4">
          <p>© 2026 10xVerify.AI Inc. Certified Digital Due Diligence Workforce. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#applet-root" className="hover:text-slate-650 transition-colors">Vetting Standards</a>
            <span>•</span>
            <a href="#applet-root" className="hover:text-slate-650 transition-colors">Audit Ledger Security</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
