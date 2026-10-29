import React, { useState, useEffect } from "react";
import { Shield, Brain, Sparkles, Database, HelpCircle, Activity, LayoutGrid, CheckSquare, Settings, ClipboardList, ShieldCheck } from "lucide-react";
import { VendorScreening, DashboardMetrics } from "./types";
import ExecutiveDashboard from "./components/ExecutiveDashboard";
import ProcurementDashboard from "./components/ProcurementDashboard";
import ComplianceDashboard from "./components/ComplianceDashboard";
import ScreeningPortal from "./components/ScreeningPortal";
import VendorDetailDossier from "./components/VendorDetailDossier";
import AuthScreen from "./components/AuthScreen";
import VendorPortal from "./components/VendorPortal";
import VendorQueueDashboard from "./components/VendorQueueDashboard";
import EvidenceRepository from "./components/EvidenceRepository";
import MetricsDashboard from "./components/MetricsDashboard";
import ActivityLogsDashboard from "./components/ActivityLogsDashboard";

import { msalInstance } from "./authConfig";

interface UserProfile {
  email: string;
  name: string;
  role: "Compliance Officer" | "Vetting Officer" | "Vendor";
}

const DEFAULT_USERS: UserProfile[] = [
  { email: "complianceofficer@10xverify.ai", name: "Lead Compliance Officer", role: "Compliance Officer" },
  { email: "officer@10xverify.ai", name: "Senior Vetting Officer", role: "Vetting Officer" }
];

export default function App() {
  const [vendors, setVendors] = useState<VendorScreening[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<"executive" | "procurement" | "compliance" | "screen" | "vendor-queue" | "evidence" | "metrics" | "activity-logs">("executive");
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [autoStartVendor, setAutoStartVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [backendMode, setBackendMode] = useState<"AI_ACTIVE" | "SIMULATED">("SIMULATED");

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("10xverify_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [monitoringAlerts, setMonitoringAlerts] = useState<any[]>([]);

  // Listen for Microsoft Direct Login (Redirect flow - No Popups!)
  useEffect(() => {
    async function processMsalRedirect() {
      try {
        const response = await msalInstance.handleRedirectPromise();
        if (response && response.account) {
          const account = response.account;
          const userEmail = (account.username || (account.idTokenClaims as any)?.preferred_username || (account.idTokenClaims as any)?.email || "").toLowerCase();
          const userName = account.name || userEmail.split("@")[0] || "10xDS Officer";

          const chosenRole = (localStorage.getItem("10xverify_pending_role") as any) || "Compliance Officer";
          localStorage.removeItem("10xverify_pending_role");

          const res = await fetch("/api/auth/azure-sso", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: userEmail,
              name: userName,
              role: chosenRole,
              tenantId: account.tenantId,
              homeAccountId: account.homeAccountId
            })
          });

          const data = await res.json();
          const loggedInUser: UserProfile = {
            email: data.user?.email || userEmail,
            name: data.user?.name || userName,
            role: chosenRole || data.user?.role || "Compliance Officer"
          };
          setCurrentUser(loggedInUser);
          localStorage.setItem("10xverify_user", JSON.stringify(loggedInUser));

          // Clean URL if at callback route
          if (window.location.pathname.includes("/api/auth/callback/azure-ad")) {
            window.history.replaceState({}, document.title, "/");
          }
        }
      } catch (err) {
        console.error("[MSAL Redirect Handler Error]:", err);
      }
    }
    processMsalRedirect();
  }, []);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const calculateFrontendMetrics = (vendorList: VendorScreening[], alerts: any[] = []): DashboardMetrics => {
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

    const complianceAlerts = [
      ...vendorList
        .filter(v => ["RED", "BLACK"].includes(v.riskRating))
        .map(v => ({
          id: `alert-${v.id}`,
          companyName: v.companyName,
          alertType: (v.riskRating === "BLACK" ? "sanction_link" : "adverse_media") as any,
          severity: (v.riskRating === "BLACK" ? "critical" : "high") as any,
          description: `Flagged by Risk Intelligence: ${v.recommendation}`,
          date: v.screenedAt
        })),
      ...alerts
    ];

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

      // Fetch Monitoring Alerts
      let activeAlerts: any[] = [];
      const reqAlerts = await fetch("/api/monitoring-alerts");
      if (reqAlerts.ok) {
        activeAlerts = await reqAlerts.json();
        setMonitoringAlerts(activeAlerts || []);
      }

      // Fetch Vendors list
      const reqVendors = await fetch("/api/vendors");
      if (reqVendors.ok) {
        const list: VendorScreening[] = await reqVendors.json();
        setVendors(prev => {
          const merged = [...list];
          for (const item of prev) {
            if (!merged.some(v => v.id === item.id)) {
              merged.push(item);
            }
          }
          merged.sort((a, b) => new Date(b.screenedAt).getTime() - new Date(a.screenedAt).getTime());
          setMetrics(calculateFrontendMetrics(merged, activeAlerts));
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
    setAutoStartVendor(null);
    setVendors(prev => {
      const updated = prev.some(v => v.id === newVendor.id) ? prev : [newVendor, ...prev];
      setMetrics(calculateFrontendMetrics(updated, monitoringAlerts));
      return updated;
    });
    setSelectedVendorId(newVendor.id);
    setActiveTab("executive");
    fetchState(false);
  };

  const handleQueueToScreening = (vendorData: any) => {
    setAutoStartVendor(vendorData);
    setActiveTab("screen");
  };

  const handleStatusChange = async (id: string, status: "Approved" | "Rejected") => {
    try {
      const response = await fetch(`/api/vendors/${id}/status`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Role": currentUser?.role || "",
          "X-User-Email": currentUser?.email || "",
          "X-User-Name": currentUser?.name || ""
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        const updated: VendorScreening = await response.json();
        setVendors(prev => {
          const updatedList = prev.map(v => v.id === id ? updated : v);
          setMetrics(calculateFrontendMetrics(updatedList, monitoringAlerts));
          return updatedList;
        });
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
        headers: { 
          "Content-Type": "application/json",
          "X-User-Role": currentUser?.role || "",
          "X-User-Email": currentUser?.email || ""
        },
        body: JSON.stringify(comment)
      });
      if (response.ok) {
        const updated: VendorScreening = await response.json();
        setVendors(prev => {
          const updatedList = prev.map(v => v.id === id ? updated : v);
          setMetrics(calculateFrontendMetrics(updatedList, monitoringAlerts));
          return updatedList;
        });
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
        method: "DELETE",
        headers: {
          "X-User-Role": currentUser?.role || "",
          "X-User-Email": currentUser?.email || "",
          "X-User-Name": currentUser?.name || ""
        }
      });
      if (response.ok) {
        const targetVendor = vendors.find(v => v.id === id);
        const compName = targetVendor?.companyName?.toLowerCase().trim();
        setMonitoringAlerts(prev => prev.filter(a => a.vendorId !== id && a.companyName?.toLowerCase().trim() !== compName));
        setVendors(prev => {
          const updatedList = prev.filter(v => v.id !== id);
          setMetrics(calculateFrontendMetrics(updatedList, monitoringAlerts.filter(a => a.vendorId !== id && a.companyName?.toLowerCase().trim() !== compName)));
          return updatedList;
        });
        setSelectedVendorId(null);
        fetchState(false);
      }
    } catch (err) {
      console.error("Failed to delete vendor:", err);
    }
  };

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("10xverify_user");
  };

  if (!currentUser) {
    return <AuthScreen onLogin={setCurrentUser} />;
  }

  if (currentUser.role === "Vendor") {
    return <VendorPortal currentUser={currentUser} onLogout={handleLogout} />;
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

          {/* User profile session */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-1.5 px-3 rounded-2xl shrink-0 self-start md:self-auto">
            <div className="text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight">{currentUser.name}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{currentUser.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xxs bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
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
            { id: "metrics", label: "Risk Metrics", desc: "Platform analytics", icon: Activity },
            { id: "screen", label: "Workforce Screening", desc: "Deploy AI Agents", icon: Brain },
            { id: "vendor-queue", label: "Vendor Portal Queue", desc: "Audit registrations", icon: ClipboardList },
            { id: "evidence", label: "Evidence Logs", desc: "Audit registry pack", icon: Database },
            { id: "activity-logs", label: "User Activity Logs", desc: "Audit trail & security", icon: ShieldCheck }
          ].filter(tab => {
            // Enterprise role separation: Vetting Officers focus on operational due diligence & screening.
            // Security Audit Trails and Platform Risk Metrics are reserved for Compliance Officers.
            if (currentUser.role === "Vetting Officer") {
              return tab.id !== "activity-logs" && tab.id !== "metrics";
            }
            return true;
          }).map(tab => {
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
                monitoringAlerts={monitoringAlerts}
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

                {activeTab === "metrics" && (
                  <MetricsDashboard vendors={vendors} />
                )}

                {activeTab === "screen" && (
                  <ScreeningPortal
                    onScreeningComplete={handleNewScreeningComplete}
                    autoStartVendor={autoStartVendor}
                  />
                )}

                {activeTab === "vendor-queue" && (
                  <VendorQueueDashboard
                    onProcessVendor={handleQueueToScreening}
                  />
                )}

                {activeTab === "evidence" && (
                  <EvidenceRepository />
                )}

                {activeTab === "activity-logs" && (
                  <ActivityLogsDashboard />
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
