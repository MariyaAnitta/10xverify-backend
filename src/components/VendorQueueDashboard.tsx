import React, { useState, useEffect } from "react";
import { Shield, RefreshCw, FileText, CheckCircle, Clock, Trash2 } from "lucide-react";

interface VendorQueueDashboardProps {
  onProcessVendor: (vendor: any) => void;
}

export default function VendorQueueDashboard({ onProcessVendor }: VendorQueueDashboardProps) {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vendor-queue");
      const data = await res.json();
      setQueue(data || []);
    } catch (err) {
      console.error("Failed to fetch queue", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Vendor Self-Onboarding Queue</h2>
          </div>
          <p className="text-sm text-slate-500">Audit newly submitted supplier profiles, compliance credentials, and digital signatures.</p>
        </div>
        <button
          onClick={fetchQueue}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-500" : ""}`} /> 
          Refresh Queue
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left List */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm min-h-[400px]">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Pending Review Queue ({queue.length})</div>
          
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">Syncing with secure vault...</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-xl">
              <p className="text-sm font-semibold text-slate-500">No active self-onboarding submissions found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((sub, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedSubmission(sub)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedSubmission?.id === sub.id 
                    ? "bg-slate-900 border-slate-800 text-white shadow-md" 
                    : "bg-white border-slate-200 hover:border-indigo-300 text-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm truncate">{sub.companyName}</h4>
                    <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                      {sub.status || "Submitted"}
                    </span>
                  </div>
                  <div className={`text-[10px] mb-2 ${selectedSubmission?.id === sub.id ? "text-slate-400" : "text-slate-500"}`}>
                    {sub.industry} • {sub.country}
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] ${selectedSubmission?.id === sub.id ? "text-slate-500" : "text-slate-400"}`}>
                    <Clock className="w-3 h-3" />
                    Submitted: {new Date(sub.submittedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Details Workspace */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm min-h-[400px] flex flex-col">
          {!selectedSubmission ? (
            <div className="flex-grow flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <Shield className="w-12 h-12 mb-4 text-slate-200" strokeWidth={1} />
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Audit Details Workspace</h3>
              <p className="text-xs max-w-xs leading-relaxed">Select a vendor self-onboarding application from the left list to review their business profile and route to the multi-agent vetting pipeline.</p>
            </div>
          ) : (
            <div className="p-6 md:p-8 flex-grow flex flex-col">
              <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">{selectedSubmission.companyName}</h3>
                  <a href={`https://${selectedSubmission.website}`} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">
                    {selectedSubmission.website}
                  </a>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contact Email</div>
                  <div className="text-xs font-medium text-slate-700">{selectedSubmission.contactEmail}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 flex-grow">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Corporate Details</h4>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                    <div>
                      <div className="text-[9px] text-slate-500">Country of Reg.</div>
                      <div className="text-sm font-semibold">{selectedSubmission.country}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500">Industry</div>
                      <div className="text-sm font-semibold">{selectedSubmission.industry}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Submission Details</h4>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                    <div>
                      <div className="text-[9px] text-slate-500">Contact Email</div>
                      <div className="text-sm font-semibold">{selectedSubmission.contactEmail}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500">Official Website</div>
                      <div className="text-sm font-mono text-indigo-600 truncate">{selectedSubmission.website}</div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Digital Signature Match</h4>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold text-emerald-900">{selectedSubmission.signature}</div>
                      <div className="text-[10px] text-emerald-700">Legally bound entity representative</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={async () => {
                    const targetId = selectedSubmission._docId || selectedSubmission.contactEmail || selectedSubmission.email || selectedSubmission.id;
                    if (!window.confirm(`Are you sure you want to reject and remove the submission for ${selectedSubmission.companyName}?`)) return;
                    try {
                      const res = await fetch(`/api/vendor-queue/${encodeURIComponent(targetId)}`, { method: "DELETE" });
                      if (res.ok) {
                        setQueue(prev => prev.filter(item => (item._docId || item.contactEmail || item.email || item.id) !== targetId));
                        setSelectedSubmission(null);
                      } else {
                        alert("Failed to reject submission.");
                      }
                    } catch (e) {
                      console.error("Failed to reject vendor submission", e);
                      alert("Error rejecting vendor submission.");
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Reject / Dismiss Application</span>
                </button>

                <button 
                  onClick={() => onProcessVendor(selectedSubmission)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-indigo-500/25 text-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>Move to Active Vetting Pipeline →</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
