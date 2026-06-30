import React, { useState } from "react";
import { Check, X, ShieldAlert, Clock, ArrowRight, UserCheck, UserX, MessageSquare, Briefcase, CheckCircle } from "lucide-react";
import { VendorScreening, RiskRating } from "../types";
import { AnimatePresence } from "motion/react";

interface ProcurementDashboardProps {
  vendors: VendorScreening[];
  onVendorSelect: (vendor: VendorScreening) => void;
  onStatusChange: (id: string, status: "Approved" | "Rejected") => void;
  currentUser: { email: string; name: string; role: string } | null;
}

export default function ProcurementDashboard({ vendors, onVendorSelect, onStatusChange, currentUser }: ProcurementDashboardProps) {
  const [activeTab, setActiveTab ] = useState<"pending" | "vetted">("pending");
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  const pendingQueue = vendors.filter(v => v.status === "Pending" || v.status === "In Progress" || v.status === "Completed");
  const vettedQueue = vendors.filter(v => v.status === "Approved" || v.status === "Rejected");

  const handleAction = (id: string, action: "Approved" | "Rejected") => {
    onStatusChange(id, action);
  };

  const getRiskIcon = (rating: RiskRating) => {
    switch (rating) {
      case RiskRating.GREEN:
        return <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0" />;
      case RiskRating.AMBER:
        return <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shrink-0" />;
      case RiskRating.RED:
        return <div className="w-2.5 h-2.5 bg-red-500 rounded-full shrink-0 animate-ping" />;
      case RiskRating.BLACK:
        return <div className="w-2.5 h-2.5 bg-slate-950 rounded-full shrink-0" />;
    }
  };

  const getRiskLabel = (rating: RiskRating) => {
    switch (rating) {
      case RiskRating.GREEN: return "text-emerald-700 bg-emerald-50";
      case RiskRating.AMBER: return "text-amber-700 bg-amber-50";
      case RiskRating.RED: return "text-red-700 bg-red-50";
      case RiskRating.BLACK: return "text-slate-800 bg-slate-100";
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6" id="procurement-dashboard">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-4 mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Supply Chain & Procurement Workflows
          </h2>
          <p className="text-xs text-slate-500">Fast action onboarding gate, approval assignments, and risk screening queues</p>
        </div>

        {/* Tab triggers */}
        <div className="bg-slate-50 p-1 rounded-xl flex border border-slate-100 max-w-xs">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "pending"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Vetting Queue ({pendingQueue.length})
          </button>
          <button
            onClick={() => setActiveTab("vetted")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "vetted"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Onboard Status ({vettedQueue.length})
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "pending" ? (
          <div className="space-y-4">
            {pendingQueue.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-250 rounded-xl">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">Vetting Queue Empty!</h3>
                <p className="text-xs text-slate-400 mt-1">All screened vendors have been processed or moved to history pools.</p>
              </div>
            ) : (
              pendingQueue.map(vendor => (
                <div
                  key={vendor.id}
                  className="bg-white border border-slate-100 rounded-xl p-5 hover:shadow-xxs transition-all flex flex-col md:flex-row items-stretch justify-between gap-6"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-start justify-between">
                      <div
                        onClick={() => onVendorSelect(vendor)}
                        className="cursor-pointer group space-y-1"
                      >
                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                          {vendor.companyName}
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                        </h4>
                        <div className="text-xxs text-slate-500 flex items-center gap-3 flex-wrap">
                          <span className="font-medium text-slate-400 uppercase">{vendor.industry}</span>
                          <span>Country: {vendor.country}</span>
                          <span>Vetted: {new Date(vendor.screenedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${getRiskLabel(vendor.riskRating)}`}>
                        {getRiskIcon(vendor.riskRating)}
                        <span>Score: {vendor.riskScore}%</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-650 leading-relaxed max-w-3xl line-clamp-2">
                      <b className="text-slate-800">Executive Flag:</b> {vendor.executiveSummary}
                    </p>

                    {vendor.comments && vendor.comments.length > 0 && (
                      <div className="bg-slate-50/60 rounded-lg p-3 text-xxs leading-relaxed text-slate-600 border border-slate-100">
                        <b>Active Compliance Thread:</b> "{vendor.comments[vendor.comments.length - 1].content}"
                        <span className="text-slate-400 ml-1">— {vendor.comments[vendor.comments.length - 1].author}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions column */}
                  <div className="flex flex-row md:flex-col justify-end items-center md:items-end gap-3 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-slate-100 shrink-0">
                    <div className="text-xxs text-slate-400 font-bold uppercase tracking-widest text-left md:text-right hidden sm:block">Action Gate</div>
                    
                    <div className="flex gap-2 w-full md:w-auto">
                      <button
                        onClick={() => handleAction(vendor.id, "Approved")}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={vendor.riskRating === RiskRating.BLACK || currentUser?.role !== "Compliance Officer"}
                        title={
                          vendor.riskRating === RiskRating.BLACK 
                            ? "Sanctioned block cannot be approved" 
                            : currentUser?.role !== "Compliance Officer"
                            ? "Compliance Officer permissions required"
                            : "Approve vendor"
                        }
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Onboarding</span>
                      </button>

                      <button
                        onClick={() => handleAction(vendor.id, "Rejected")}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-150 font-semibold text-xs rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={currentUser?.role !== "Compliance Officer"}
                        title={
                          currentUser?.role !== "Compliance Officer"
                            ? "Compliance Officer permissions required"
                            : "Ban / Reject"
                        }
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Ban / Reject</span>
                      </button>
                    </div>

                    <button
                      onClick={() => onVendorSelect(vendor)}
                      className="text-xxs text-blue-600 hover:underline font-bold"
                    >
                      View Deep Evidence Logs
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {vettedQueue.map(vendor => (
              <div
                key={vendor.id}
                onClick={() => onVendorSelect(vendor)}
                className="p-4 bg-slate-50/40 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{vendor.companyName}</h4>
                    {vendor.status === "Approved" ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <UserCheck className="w-3 h-3" /> Onboard Approved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                        <UserX className="w-3 h-3" /> Rejected Shell
                      </span>
                    )}
                  </div>
                  <div className="text-xxs text-slate-400">
                    Industry: <b>{vendor.industry}</b> | Country: <b>{vendor.country}</b> | Actioned: {new Date(vendor.screenedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="text-right flex items-center gap-4 text-xs">
                  <div className="hidden sm:block">
                    <div className="text-xxs text-slate-400 font-bold uppercase">Weighted Integrity</div>
                    <div className="font-semibold text-slate-800">{vendor.riskScore}% Profile</div>
                  </div>
                  <div className={`px-2 py-1 text-center font-bold tracking-wider rounded text-[10px] uppercase ${
                    vendor.riskRating === RiskRating.GREEN 
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                      : "bg-red-50 text-red-700 border border-red-100"
                  }`}>
                    {vendor.riskRating}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
