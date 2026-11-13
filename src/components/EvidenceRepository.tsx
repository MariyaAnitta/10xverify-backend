import React, { useState, useEffect, useRef } from "react";
import { Search, Database, RefreshCw, Terminal, Eye, X, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

export default function EvidenceRepository() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollMetrics, setScrollMetrics] = useState({ scrollWidth: 0, clientWidth: 0 });

  const updateScrollState = () => {
    if (tableContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      setScrollMetrics({ scrollWidth, clientWidth });

      if (topScrollRef.current && Math.abs(topScrollRef.current.scrollLeft - scrollLeft) > 1) {
        topScrollRef.current.scrollLeft = scrollLeft;
      }
    }
  };

  const handleTopScroll = () => {
    if (topScrollRef.current && tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const scrollLeft = () => {
    tableContainerRef.current?.scrollBy({ left: -350, behavior: "smooth" });
  };

  const scrollRight = () => {
    tableContainerRef.current?.scrollBy({ left: 350, behavior: "smooth" });
  };

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

  useEffect(() => {
    if (selectedLog) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setSelectedLog(null);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalStyle;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [selectedLog]);

  const filteredLogs = logs.filter(log => {
    const s = searchTerm.toLowerCase();
    return (
      (log.companyName || "").toLowerCase().includes(s) ||
      (log.apiSource || "").toLowerCase().includes(s) ||
      (log.query || "").toLowerCase().includes(s) ||
      (log.status || "").toLowerCase().includes(s)
    );
  });

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [filteredLogs, loading]);

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
        {/* Search & Horizontal Scroll Bar Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search raw transactions by vendor, registry source, query parameters or status..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm placeholder:text-slate-400"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Quick Scroll Left & Right buttons right at the top */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 hidden md:inline">
              Horizontal Scroll:
            </span>
            <button
              type="button"
              onClick={scrollLeft}
              disabled={!canScrollLeft}
              title="Scroll table left"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold text-xs rounded-lg border border-slate-200 shadow-2xs transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
              <span>Scroll Left</span>
            </button>
            <button
              type="button"
              onClick={scrollRight}
              disabled={!canScrollRight}
              title="Scroll table right"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold text-xs rounded-lg border border-slate-200 shadow-2xs transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Scroll Right</span>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Top Synchronized Horizontal Scrollbar */}
        {scrollMetrics.scrollWidth > scrollMetrics.clientWidth && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50/80 border border-slate-200/80 rounded-xl text-[11px] text-slate-500">
            <span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider shrink-0 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-slate-500" />
              Top Scroll Bar:
            </span>
            <div 
              ref={topScrollRef} 
              onScroll={handleTopScroll}
              className="overflow-x-auto flex-1 h-3.5 scrollbar-thin"
              title="Drag to scroll horizontally"
            >
              <div style={{ width: `${scrollMetrics.scrollWidth}px`, height: "1px" }} />
            </div>
          </div>
        )}

        {/* Data Grid with Floating Left/Right Scroll Controls */}
        <div className="relative group">
          {/* Floating Left Button */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={scrollLeft}
              title="Scroll table left"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-slate-700 shadow-lg border border-slate-200 flex items-center justify-center transition-all hover:scale-110 cursor-pointer backdrop-blur-xs"
            >
              <ChevronLeft className="w-4 h-4 text-slate-800" />
            </button>
          )}

          {/* Floating Right Button */}
          {canScrollRight && (
            <button
              type="button"
              onClick={scrollRight}
              title="Scroll table right"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-slate-700 shadow-lg border border-slate-200 flex items-center justify-center transition-all hover:scale-110 cursor-pointer backdrop-blur-xs"
            >
              <ChevronRight className="w-4 h-4 text-slate-800" />
            </button>
          )}

          <div 
            ref={tableContainerRef}
            onScroll={updateScrollState}
            className="overflow-x-auto border border-slate-100 rounded-xl"
          >
            <table className="w-full min-w-[1050px] text-left text-xxs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-3 whitespace-nowrap">Timestamp</th>
                <th className="p-3 max-w-[200px] whitespace-nowrap">Vetted Vendor</th>
                <th className="p-3 whitespace-nowrap">API Source / Method</th>
                <th className="p-3 max-w-xs whitespace-nowrap">Query Param / Target</th>
                <th className="p-3 text-center whitespace-nowrap">Status</th>
                <th className="p-3 text-center whitespace-nowrap">Actions</th>
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
                    <td className="p-3 font-mono text-slate-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-bold text-slate-800 max-w-[200px] truncate break-all" title={log.companyName}>{log.companyName}</td>
                    <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">{log.apiSource}</td>
                    <td className="p-3 font-mono max-w-xs truncate text-slate-650" title={log.query}>{log.query}</td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                        log.status === "200 OK" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 px-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-slate-600 hover:text-indigo-600 transition-colors inline-flex items-center gap-1 font-bold whitespace-nowrap"
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
      </div>

      {/* Payload Inspect Modal */}
      {selectedLog && (
        <div 
          onClick={() => setSelectedLog(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-950 border border-slate-800 text-slate-350 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative"
          >
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
