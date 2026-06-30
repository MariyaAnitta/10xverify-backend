import React, { useState } from "react";
import { Search, Shield, AlertTriangle, CheckCircle, TrendingUp, Ban, ArrowUpRight, HelpCircle, Trash2, Download } from "lucide-react";
import { VendorScreening, DashboardMetrics, RiskRating } from "../types";

interface ExecutiveDashboardProps {
  vendors: VendorScreening[];
  metrics: DashboardMetrics;
  onVendorSelect: (vendor: VendorScreening) => void;
  onNewScreeningClick: () => void;
  onDeleteVendor: (id: string) => void;
}

export default function ExecutiveDashboard({ vendors, metrics, onVendorSelect, onNewScreeningClick, onDeleteVendor }: ExecutiveDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>("ALL");

  const handleExportCSV = () => {
    if (vendors.length === 0) {
      alert("No vendor data available to export.");
      return;
    }

    const headers = [
      "Company Name", "Website", "Industry", "Country", "Status", 
      "Risk Score", "Risk Rating", "Registration Number", "Incorporation Date", 
      "Legal Status", "Solvency Status", "Sanctions Risk", "Adverse Press Found", 
      "Screened At", "Screened By"
    ];

    const rows = vendors.map(v => [
      v.companyName,
      v.website,
      v.industry,
      v.country,
      v.status,
      v.riskScore,
      v.riskRating,
      v.details?.registrationNumber || "",
      v.details?.incorporationDate || "",
      v.details?.legalStatus || "",
      v.details?.solvencyStatus || "",
      v.details?.sanctionsRisk || "",
      v.details?.adverseMediaFound ? "Yes" : "No",
      v.screenedAt,
      v.screenedBy
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `10xVerify_Registry_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter vendors based on search term & risk pills
  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          v.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.country.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRisk = selectedRiskFilter === "ALL" || v.riskRating === selectedRiskFilter;

    return matchesSearch && matchesRisk;
  });

  const getRiskBorder = (rating: RiskRating) => {
    switch (rating) {
      case RiskRating.GREEN: return "border-l-4 border-l-emerald-500";
      case RiskRating.AMBER: return "border-l-4 border-l-amber-500";
      case RiskRating.RED: return "border-l-4 border-l-red-500";
      case RiskRating.BLACK: return "border-l-4 border-l-slate-950";
    }
  };

  const getRiskBadge = (rating: RiskRating) => {
    switch (rating) {
      case RiskRating.GREEN:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>Low Risk (Green)</span>;
      case RiskRating.AMBER:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>Med Risk (Amber)</span>;
      case RiskRating.RED:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full animate-pulse"><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>High Risk (Red)</span>;
      case RiskRating.BLACK:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-semibold rounded-full"><span className="w-1.5 h-1.5 bg-slate-900 rounded-full"></span>Critical Block (Black)</span>;
    }
  };

  return (
    <div className="space-y-8" id="executive-dashboard">
      {/* KPI Cards Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total screened */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Screened</span>
            <span className="p-1 px-1.5 bg-slate-50 text-slate-600 rounded-md text-xxs font-bold">ALL</span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{metrics.totalScreened}</h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Vetted Entities
            </p>
          </div>
        </div>

        {/* Green count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Active Low Risk</span>
            <span className="p-1 px-1.5 bg-emerald-50 text-emerald-600 rounded-md text-xxs font-bold">GREEN</span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-emerald-600 tracking-tight">{metrics.riskDistribution.green}</h3>
            <p className="text-xs text-slate-400 mt-1">Safe for standard onboarding</p>
          </div>
        </div>

        {/* Amber count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Additional Review</span>
            <span className="p-1 px-1.5 bg-amber-50 text-amber-600 rounded-md text-xxs font-bold">AMBER</span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-amber-500 tracking-tight">{metrics.riskDistribution.amber}</h3>
            <p className="text-xs text-slate-400 mt-1">Pending physical lookup</p>
          </div>
        </div>

        {/* Red count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">High Risk Warnings</span>
            <span className="p-1 px-1.5 bg-red-50 text-red-600 rounded-md text-xxs font-bold">RED</span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-red-500 tracking-tight font-sans">{metrics.riskDistribution.red}</h3>
            <p className="text-xs text-slate-400 mt-1">Requires executive audit</p>
          </div>
        </div>

        {/* Black count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">Sanctions Blocks</span>
            <span className="p-1 px-1.5 bg-slate-900 text-white rounded-md text-xxs font-bold">BLACK</span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-950 tracking-tight">{metrics.riskDistribution.black}</h3>
            <p className="text-xs text-slate-400 mt-1 text-red-600 font-semibold animate-pulse">DO NOT ENGAGE</p>
          </div>
        </div>
      </div>

      {/* Main bento structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 cols: Search and Screening Feed */}
        <div className="lg:col-span-2 space-y-5 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Compliance Screening Registry</h3>
              <p className="text-xs text-slate-500">Search and filter evaluated partner dossiers</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-slate-105 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                <span>Export BI Dataset (CSV)</span>
              </button>

              <button
                onClick={onNewScreeningClick}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>+ Screen New Vendor</span>
              </button>
            </div>
          </div>

          {/* Search Inputs */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by company name, country, or industry..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm placeholder:text-slate-400"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Risk Sorting Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider mr-2">Filter Risk:</span>
            {[
              { id: "ALL", label: "All Categories" },
              { id: "GREEN", label: "Green (Low)" },
              { id: "AMBER", label: "Amber (Med)" },
              { id: "RED", label: "Red (High)" },
              { id: "BLACK", label: "Black (Block)" }
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setSelectedRiskFilter(pill.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedRiskFilter === pill.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Table / List representation */}
          <div className="space-y-3.5">
            {filteredVendors.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-500">No screened vendors match the selected filter parameters.</p>
                <p className="text-xs text-slate-400 mt-1">Try broadening your search or screen a new company.</p>
              </div>
            ) : (
              filteredVendors.map(vendor => (
                <div
                  key={vendor.id}
                  onClick={() => onVendorSelect(vendor)}
                  className={`p-4 bg-white hover:bg-slate-50/70 border border-slate-100 rounded-xl shadow-xxs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${getRiskBorder(vendor.riskRating)}`}
                >
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-slate-900 text-sm tracking-tight">{vendor.companyName}</h4>
                      <span className="text-xxs font-bold uppercase tracking-wider text-slate-400 px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded">
                        {vendor.industry}
                      </span>
                    </div>
                    <div className="text-xxs text-slate-500 flex items-center gap-3">
                      <span>Website: <span className="font-medium text-blue-600 underline">{vendor.website}</span></span>
                      <span>Country: <span className="font-semibold">{vendor.country}</span></span>
                      <span>Vetted: <b>{new Date(vendor.screenedAt).toLocaleDateString()}</b></span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{vendor.executiveSummary}</p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-0 pt-2 sm:pt-0 border-slate-50">
                    <div className="text-left sm:text-right">
                      <div className="text-xxs text-slate-400 uppercase tracking-widest font-semibold">Weighted Integrity</div>
                      <div className="text-lg font-bold text-slate-900">{vendor.riskScore}%</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRiskBadge(vendor.riskRating)}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteVendor(vendor.id);
                        }}
                        className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-650 rounded-lg transition-all border border-slate-100 cursor-pointer"
                        title="Delete record from system"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="p-1.5 bg-slate-50 group-hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right col: Custom SVG Charts & Critical Alerts */}
        <div className="space-y-6">
          {/* Custom SVG Donut / Risk breakdown */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Risk Distribution Index</h3>
            
            <div className="flex items-center justify-center p-3 relative">
              {/* Premium custom SVG Donut chart containing simple coordinates */}
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                
                {/* Dynamically formulated segments */}
                {(() => {
                  const total = metrics.totalScreened || 1;
                  const gPerc = (metrics.riskDistribution.green / total) * 100;
                  const aPerc = (metrics.riskDistribution.amber / total) * 100;
                  const rPerc = (metrics.riskDistribution.red / total) * 100;
                  const bPerc = (metrics.riskDistribution.black / total) * 100;

                  // Circles use stroke-dasharray & stroke-dashoffset based on 2 * PI * r (r=40 -> C=251.2)
                  const C = 251.2;
                  
                  const gOffset = 0;
                  const gDash = (gPerc / 100) * C;
                  
                  const aOffset = gDash;
                  const aDash = (aPerc / 100) * C;
                  
                  const rOffset = gDash + aDash;
                  const rDash = (rPerc / 100) * C;
                  
                  const bOffset = gDash + aDash + rDash;
                  const bDash = (bPerc / 100) * C;

                  return (
                    <>
                      {/* Green segment */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="12" 
                              strokeDasharray={`${gDash} ${C}`} strokeDashoffset={0} strokeLinecap={gPerc > 0 ? "round" : "butt"} />
                      {/* Amber segment */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="12" 
                              strokeDasharray={`${aDash} ${C}`} strokeDashoffset={-gDash} strokeLinecap={aPerc > 0 ? "round" : "butt"} />
                      {/* Red segment */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ef4444" strokeWidth="12" 
                              strokeDasharray={`${rDash} ${C}`} strokeDashoffset={-gDash - aDash} strokeLinecap={rPerc > 0 ? "round" : "butt"} />
                      {/* Black segment */}
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#0f172a" strokeWidth="12" 
                              strokeDasharray={`${bDash} ${C}`} strokeDashoffset={-gDash - aDash - rDash} strokeLinecap={bPerc > 0 ? "round" : "butt"} />
                    </>
                  );
                })()}
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-850">{metrics.totalScreened}</span>
                <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Vetted</span>
              </div>
            </div>

            {/* Chart Legend */}
            <div className="grid grid-cols-2 gap-2 text-xxs font-semibold text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Low Risk ({metrics.riskDistribution.green})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                <span>Medium Risk ({metrics.riskDistribution.amber})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                <span>High Risk ({metrics.riskDistribution.red})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block"></span>
                <span>Critical Block ({metrics.riskDistribution.black})</span>
              </div>
            </div>
          </div>

          {/* Compliance warnings */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Active Threat Indicators</h3>
              <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xxs font-bold rounded animate-pulse">{metrics.complianceAlerts.length} Flagged</span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {metrics.complianceAlerts.map(alert => (
                <div key={alert.id} className="p-3 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5 transition-all text-xxs">
                  {alert.severity === "critical" ? (
                    <Ban className="w-4.5 h-4.5 text-slate-950 shrink-0 mt-0.5" />
                  ) : alert.severity === "high" ? (
                    <AlertTriangle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                  ) : (
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900 line-clamp-1">{alert.companyName}</span>
                      <span className="text-slate-400 font-normal">{alert.date}</span>
                    </div>
                    <p className="text-slate-600 leading-normal font-medium">{alert.description}</p>
                    <span className={`inline-block px-1.5 py-0.5 text-[8px] font-bold uppercase rounded ${
                      alert.severity === "critical" 
                        ? "bg-slate-900 text-white" 
                        : alert.severity === "high" 
                        ? "bg-red-100 text-red-700" 
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {alert.alertType.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
