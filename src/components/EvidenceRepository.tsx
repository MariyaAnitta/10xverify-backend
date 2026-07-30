import React, { useState, useEffect } from "react";
import { Search, Database, RefreshCw, Terminal, Eye, X } from "lucide-react";

export default function EvidenceRepository() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/evidence-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data || []);
      }
    } catch (e) {
      console.error("Failed to load evidence logs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const s = searchTerm.toLowerCase();
    return (
      (log.companyName || "").toLowerCase().includes(s) ||
      (log.apiSource || "").toLowerCase().includes(s) ||
      (log.query || "").toLowerCase().includes(s) ||
      (log.status || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in" id="evidence-repository">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Audit Evidence Pack Repository</h2>
          </div>
          <p className="text-sm text-slate-500">Secure, searchable database of raw API transactions, search parameters, and anchor payloads.</p>
        </div>
        
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-500" : ""}`} /> 
          Refresh Repository
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search raw transactions by vendor, registry source, query parameters or status..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm placeholder:text-slate-400"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Data Grid */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xxs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-3">Timestamp</th>
                <th className="p-3">Vetted Vendor</th>
                <th className="p-3">API Source / Method</th>
                <th className="p-3">Query Param / Target</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-3" />
                    <p className="text-slate-400">Querying secure log indexes...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <Database className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="font-bold text-slate-500">No raw transaction logs found.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Initiate a live workforce screening to write logs into this database.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-bold text-slate-800">{log.companyName}</td>
                    <td className="p-3 font-semibold text-slate-700">{log.apiSource}</td>
                    <td className="p-3 font-mono max-w-xs truncate text-slate-650" title={log.query}>{log.query}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                        log.status === "200 OK" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 px-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-slate-600 hover:text-indigo-600 transition-colors inline-flex items-center gap-1 font-bold"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Payload</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Inspect Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-950 border border-slate-800 text-slate-350 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute right-4 top-4 p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-450 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 pb-4 border-b border-slate-900 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Inspect API Transaction Payload</h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedLog.apiSource} // {selectedLog.query}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xxs font-mono">
                <div>
                  <span className="text-slate-550 block">VENDOR IDENTITY</span>
                  <span className="font-bold text-white">{selectedLog.companyName} ({selectedLog.vendorId})</span>
                </div>
                <div>
                  <span className="text-slate-550 block">AUDIT TIMESTAMP</span>
                  <span className="font-bold text-white">{new Date(selectedLog.timestamp).toISOString()}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block pl-1">Raw API Transaction Response Payload</span>
                <div className="bg-[#05070c] border border-slate-900 rounded-xl p-4 font-mono text-[10px] text-emerald-400 overflow-auto max-h-80 leading-relaxed">
                  {selectedLog.rawResponse ? (
                    <pre className="whitespace-pre-wrap">
                      {(() => {
                        try {
                          const parsed = JSON.parse(selectedLog.rawResponse);
                          return JSON.stringify(parsed, null, 2);
                        } catch {
                          return selectedLog.rawResponse;
                        }
                      })()}
                    </pre>
                  ) : "No payload recorded."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
