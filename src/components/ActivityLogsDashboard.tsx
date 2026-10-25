import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  Download, 
  UserCheck, 
  Key, 
  CheckCircle2, 
  XCircle, 
  Brain, 
  Trash2, 
  SearchCode, 
  FileText, 
  MessageSquare, 
  AlertTriangle, 
  Clock, 
  Eye, 
  X,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { ActivityLog } from "../types";

export default function ActivityLogsDashboard() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/activity-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data || []);
      }
    } catch (e) {
      console.error("Failed to load activity logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    // Action category filter
    if (selectedFilter === "LOGINS") {
      if (!log.action.includes("LOGIN") && !log.action.includes("REGISTER")) return false;
    } else if (selectedFilter === "APPROVALS") {
      if (log.action !== "VENDOR_APPROVED") return false;
    } else if (selectedFilter === "REJECTIONS") {
      if (log.action !== "VENDOR_REJECTED" && log.action !== "QUEUE_APPLICATION_DISMISSED") return false;
    } else if (selectedFilter === "SCREENINGS") {
      if (log.action !== "VENDOR_SCREENED") return false;
    } else if (selectedFilter === "SANCTIONS") {
      if (log.action !== "SANCTIONS_QUICK_CHECK") return false;
    }

    // Search query filter
    const s = searchTerm.toLowerCase();
    return (
      (log.userName || "").toLowerCase().includes(s) ||
      (log.userEmail || "").toLowerCase().includes(s) ||
      (log.userRole || "").toLowerCase().includes(s) ||
      (log.target || "").toLowerCase().includes(s) ||
      (log.action || "").toLowerCase().includes(s) ||
      (log.details || "").toLowerCase().includes(s) ||
      (log.ipAddress || "").toLowerCase().includes(s)
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "VENDOR_APPROVED":
        return {
          icon: CheckCircle2,
          color: "bg-emerald-50 text-emerald-700 border-emerald-200",
          label: "Vendor Approved"
        };
      case "VENDOR_REJECTED":
        return {
          icon: XCircle,
          color: "bg-rose-50 text-rose-700 border-rose-200",
          label: "Vendor Rejected"
        };
      case "USER_LOGIN":
        return {
          icon: Key,
          color: "bg-indigo-50 text-indigo-700 border-indigo-200",
          label: "User Login"
        };
      case "USER_REGISTER":
        return {
          icon: UserCheck,
          color: "bg-blue-50 text-blue-700 border-blue-200",
          label: "User Registered"
        };
      case "USER_LOGIN_FAILED":
        return {
          icon: ShieldAlert,
          color: "bg-amber-50 text-amber-700 border-amber-200",
          label: "Login Failed"
        };
      case "ACCESS_DENIED":
        return {
          icon: AlertTriangle,
          color: "bg-red-50 text-red-700 border-red-200",
          label: "Access Denied"
        };
      case "VENDOR_SCREENED":
        return {
          icon: Brain,
          color: "bg-sky-50 text-sky-700 border-sky-200",
          label: "AI Screening"
        };
      case "QUEUE_APPLICATION_DISMISSED":
        return {
          icon: Trash2,
          color: "bg-orange-50 text-orange-700 border-orange-200",
          label: "Queue Dismissed"
        };
      case "VENDOR_SELF_SUBMITTED":
        return {
          icon: FileText,
          color: "bg-teal-50 text-teal-700 border-teal-200",
          label: "Vendor Submitted"
        };
      case "SANCTIONS_QUICK_CHECK":
        return {
          icon: SearchCode,
          color: "bg-purple-50 text-purple-700 border-purple-200",
          label: "Sanctions Check"
        };
      case "COMMENT_ADDED":
        return {
          icon: MessageSquare,
          color: "bg-slate-50 text-slate-700 border-slate-200",
          label: "Note Attached"
        };
      case "VENDOR_DELETED":
        return {
          icon: Trash2,
          color: "bg-red-50 text-red-700 border-red-200",
          label: "Vendor Deleted"
        };
      default:
        return {
          icon: Clock,
          color: "bg-slate-50 text-slate-600 border-slate-200",
          label: action.replace(/_/g, " ")
        };
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Compliance Officer":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "Vetting Officer":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "Vendor":
        return "bg-purple-50 text-purple-700 border border-purple-200";
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  const exportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ["Timestamp", "Date", "Time", "User Email", "User Name", "User Role", "Action", "Target", "Details", "IP Address", "Status"];
    const rows = filteredLogs.map(l => [
      `"${l.timestamp || ""}"`,
      `"${l.date || ""}"`,
      `"${l.time || ""}"`,
      `"${l.userEmail || ""}"`,
      `"${l.userName || ""}"`,
      `"${l.userRole || ""}"`,
      `"${l.action || ""}"`,
      `"${(l.target || "").replace(/"/g, '""')}"`,
      `"${(l.details || "").replace(/"/g, '""')}"`,
      `"${l.ipAddress || ""}"`,
      `"${l.status || ""}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `10xVerify_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Summary Metrics
  const totalLogs = logs.length;
  const approvalsCount = logs.filter(l => l.action === "VENDOR_APPROVED").length;
  const rejectionsCount = logs.filter(l => l.action === "VENDOR_REJECTED" || l.action === "QUEUE_APPLICATION_DISMISSED").length;
  const uniqueUsers = new Set(logs.map(l => l.userEmail)).size;

  return (
    <div className="space-y-6 animate-fade-in" id="activity-logs-dashboard">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Enterprise Security & User Activity Audit Trail
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Immutable, timestamped ledger of user access, logins, queue dismissals, and compliance approvals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Audit Pack (CSV)
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            Refresh Trail
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Audit Records</div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{totalLogs}</div>
          <div className="text-xxs font-medium text-emerald-600 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Stream Active
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Active Operators</div>
          <div className="text-2xl font-black text-indigo-600 tracking-tight">{uniqueUsers}</div>
          <div className="text-xxs font-medium text-slate-400 mt-1">Unique logged-in accounts</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vendor Approvals</div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">{approvalsCount}</div>
          <div className="text-xxs font-medium text-slate-400 mt-1">Authorized by Compliance</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rejections & Dismissals</div>
          <div className="text-2xl font-black text-rose-600 tracking-tight">{rejectionsCount}</div>
          <div className="text-xxs font-medium text-slate-400 mt-1">Policy & risk rejections</div>
        </div>
      </div>

      {/* Main Filter & Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        
        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by user, email, action, vendor name, or IP address..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-xs placeholder:text-slate-400 font-medium"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Action category pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "ALL", label: "All Events" },
              { id: "LOGINS", label: "Logins / Auth" },
              { id: "APPROVALS", label: "Approvals" },
              { id: "REJECTIONS", label: "Rejections" },
              { id: "SCREENINGS", label: "Screenings" },
              { id: "SANCTIONS", label: "Sanctions" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedFilter === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xxs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-3 w-40">Date & Timestamp</th>
                <th className="p-3 w-48">Operator (Who)</th>
                <th className="p-3 w-40">Action (What)</th>
                <th className="p-3 w-48">Target Entity (To Whom)</th>
                <th className="p-3">Audit Trail Narrative</th>
                <th className="p-3 w-28 text-center">Client IP</th>
                <th className="p-3 w-16 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-400 font-medium">Fetching verified audit trail...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <ShieldCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="font-bold text-slate-600 text-xs">No activity logs matching your filter.</p>
                    <p className="text-xxs text-slate-400 mt-1">Try clearing your search terms or filter selection.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const badge = getActionBadge(log.action);
                  const Icon = badge.icon;
                  const roleBadgeClass = getRoleBadge(log.userRole);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Date & Time */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-xs">{log.date || (log.timestamp ? log.timestamp.slice(0, 10) : "N/A")}</div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-slate-300" />
                          {log.time || (log.timestamp ? log.timestamp.slice(11, 19) + " UTC" : "N/A")}
                        </div>
                      </td>

                      {/* Operator / User */}
                      <td className="p-3">
                        <div className="font-bold text-slate-800 text-xs leading-tight">{log.userName || "Operator"}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[170px]">{log.userEmail}</div>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold mt-1 uppercase tracking-wider ${roleBadgeClass}`}>
                          {log.userRole || "User"}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border ${badge.color}`}>
                          <Icon className="w-3 h-3 shrink-0" />
                          {badge.label}
                        </span>
                      </td>

                      {/* Target Entity */}
                      <td className="p-3 font-bold text-slate-800 text-xs">
                        <div className="truncate max-w-[180px]">{log.target || "N/A"}</div>
                      </td>

                      {/* Details */}
                      <td className="p-3 text-slate-600 text-xxs leading-relaxed">
                        {log.details}
                      </td>

                      {/* IP Address */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                          {log.ipAddress || "127.0.0.1"}
                        </span>
                      </td>

                      {/* Action button */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Inspect full audit record"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info banner */}
        <div className="pt-2 flex flex-col md:flex-row items-start md:items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
          <div>
            Showing <span className="font-bold text-slate-700">{filteredLogs.length}</span> of <span className="font-bold text-slate-700">{totalLogs}</span> events recorded in compliance ledger.
          </div>
          <div className="flex items-center gap-2 mt-2 md:mt-0 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            SOC 2 Type II / ISO 27001 Audit Ready Architecture
          </div>
        </div>
      </div>

      {/* Modal: Detailed Audit Record Inspector */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Audit Record Inspector</h3>
                  <p className="text-xxs text-slate-400 font-mono">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Timestamp</span>
                <span className="font-mono text-slate-800 font-bold">{selectedLog.timestamp}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date & Time</span>
                <span className="text-slate-800 font-semibold">{selectedLog.date} at {selectedLog.time}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operator</span>
                <span className="text-slate-800 font-bold">{selectedLog.userName}</span>
                <span className="block text-[10px] text-slate-500 font-mono">{selectedLog.userEmail}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Role</span>
                <span className="text-slate-800 font-bold">{selectedLog.userRole}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Action</span>
                <span className="font-mono text-xs font-bold text-indigo-600">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Client IP</span>
                <span className="font-mono text-xs text-slate-700">{selectedLog.ipAddress || "127.0.0.1"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Entity</span>
                <span className="text-slate-900 font-bold">{selectedLog.target}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Audit Narrative</span>
                <p className="text-slate-700 mt-0.5 leading-relaxed">{selectedLog.details}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
