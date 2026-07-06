import React, { useState } from "react";
import { ArrowLeft, MapPin, Globe, Shield, Calendar, CreditCard, ChevronDown, ChevronUp, Printer, MessageSquare, Send, CheckCircle, HelpCircle, Trash2 } from "lucide-react";
import { VendorScreening, RiskRating } from "../types";

interface VendorDetailDossierProps {
  vendor: VendorScreening;
  onBack: () => void;
  onAddComment: (comment: { author: string; content: string }) => void;
  onDeleteVendor: (id: string) => void;
  currentUser: { email: string; name: string; role: string } | null;
}

export default function VendorDetailDossier({ vendor, onBack, onAddComment, onDeleteVendor, currentUser }: VendorDetailDossierProps) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>("risk-intelligence-agent");
  const [commentText, setCommentText] = useState("");
  const [pdfMode, setPdfMode] = useState(false);

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment({
      author: currentUser?.name || "M. Anitta",
      content: commentText.trim()
    });
    setCommentText("");
  };

  const getRiskBorder = (rating: RiskRating) => {
    switch (rating) {
      case RiskRating.GREEN: return "border-l-8 border-emerald-500 bg-emerald-50/20";
      case RiskRating.AMBER: return "border-l-8 border-amber-500 bg-amber-50/20";
      case RiskRating.RED: return "border-l-8 border-red-500 bg-red-50/20";
      case RiskRating.BLACK: return "border-l-8 border-slate-950 bg-slate-50";
    }
  };

  const getRiskBadgeClass = (rating: RiskRating) => {
    switch (rating) {
      case RiskRating.GREEN: return "bg-emerald-500 text-white";
      case RiskRating.AMBER: return "bg-amber-500 text-white";
      case RiskRating.RED: return "bg-red-500 text-white animate-pulse";
      case RiskRating.BLACK: return "bg-slate-950 text-white";
      default: return "bg-slate-900 text-white";
    }
  };

  const getAgentColor = (status: "success" | "warning" | "danger" | "critical") => {
    switch (status) {
      case "success": return "bg-emerald-50 text-emerald-800 border-emerald-250";
      case "warning": return "bg-amber-50 text-amber-800 border-amber-250";
      case "danger": return "bg-red-50 text-red-800 border-red-250";
      case "critical": return "bg-slate-900 text-white border-slate-950";
    }
  };

  return (
    <div className={`space-y-6 ${pdfMode ? "max-w-4xl mx-auto bg-white p-10 border shadow-md font-sans" : ""}`} id="vendor-dossier">
      {/* Navigation and PDF trigger */}
      {!pdfMode && (
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to screening registry</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDeleteVendor(vendor.id)}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-red-200"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Vendor</span>
            </button>

            <button
              onClick={() => setPdfMode(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-slate-200"
            >
              <Printer className="w-4 h-4" />
              <span>Toggle PDF Print Layout</span>
            </button>

            <button
              onClick={() => {
                setPdfMode(true);
                setTimeout(() => {
                  window.print();
                }, 300);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm border border-slate-900"
            >
              <Printer className="w-4 h-4 text-emerald-450 fill-emerald-450/20" />
              <span>Download PDF Report</span>
            </button>
          </div>
        </div>
      )}

      {pdfMode && (
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 mb-6 print:hidden">
          <span className="text-xxs text-slate-500 font-mono">
            🖨️ EMULATED BOARD PRINT PREVIEW. (To print this document, click your browser Print / File action command).
          </span>
          <button
            onClick={() => setPdfMode(false)}
            className="px-3 py-1 bg-slate-900 text-white text-xxs font-bold rounded-lg hover:bg-slate-800"
          >
            Return to Dynamic Web Console
          </button>
        </div>
      )}

      {/* Main header block */}
      <div className={`p-6 md:p-8 border border-slate-100 rounded-2xl ${getRiskBorder(vendor.riskRating)} space-y-6`}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-2">
            <div className="space-y-1">
              <span className="text-xxs uppercase tracking-widest font-bold text-slate-400">Board Vetting Dossier</span>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{vendor.companyName}</h1>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xxs text-slate-500 font-medium">
              <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-blue-500" /> {vendor.website}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-red-500" /> {vendor.country}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-purple-500" /> Screened: {new Date(vendor.screenedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-left md:text-right">
              <div className="text-xxs font-bold text-slate-400 uppercase tracking-widest">Weighted Score</div>
              <div className="text-4xl font-extrabold text-slate-950">{vendor.riskScore}%</div>
            </div>

            <div className={`text-center font-bold px-4 py-2 ${getRiskBadgeClass(vendor.riskRating)} rounded-xl text-xs uppercase tracking-wider shadow`}>
              {vendor.riskRating} RISK
            </div>
          </div>
        </div>

        {/* Executive summary details */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Executive Risk Summary</h3>
          <p className="text-xs text-slate-650 leading-relaxed font-sans">{vendor.executiveSummary}</p>
          <div className="pt-3 border-t border-slate-50 text-xxs text-slate-500 flex items-start gap-2">
            <b className="uppercase text-slate-800 shrink-0 mt-0.5">Primary Directive:</b>
            <span className="italic">"{vendor.recommendation}"</span>
          </div>
        </div>
      </div>

      {/* Grid of basic metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Registry Card */}
        <div className="bg-white border p-5 rounded-2xl border-slate-100 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest pb-1 border-b">Legal Incorporations</h3>
          <div className="space-y-2.5 text-xxs">
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">REG NUMBER:</span>
              <span className="font-bold text-slate-800">{vendor.details.registrationNumber || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">INCORPORATED:</span>
              <span className="font-bold text-slate-800">{vendor.details.incorporationDate || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">LEGAL STATUS:</span>
              <span className="font-bold text-slate-800">{vendor.details.legalStatus || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">INDUSTRY TYPE:</span>
              <span className="font-bold text-slate-800">{vendor.details.typeOfBusiness || "N/A"}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block uppercase">Directors:</span>
              <p className="font-bold text-slate-800 leading-normal pl-2 border-l border-slate-200">
                {Array.isArray(vendor.details.directors) ? vendor.details.directors.join(", ") : String(vendor.details.directors || "No directors parsed")}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block uppercase">Shareholders & UBOs:</span>
              <p className="font-bold text-slate-800 leading-normal pl-2 border-l border-slate-200">
                {Array.isArray(vendor.details.shareholders) ? vendor.details.shareholders.join(", ") : String(vendor.details.shareholders || "Opaque holdings profile")}
              </p>
            </div>
          </div>
        </div>

        {/* Digital & Address validation Card */}
        <div className="bg-white border p-5 rounded-2xl border-slate-100 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest pb-1 border-b">Physical & Digital Audit</h3>
          <div className="space-y-2.5 text-xxs">
            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block">REGISTERED REGISTERED OFFICE:</span>
              <span className="font-bold text-slate-800">{vendor.details.registeredAddress || "N/A"}</span>
            </div>
            <div className="space-y-1 bg-slate-50 p-2 rounded">
              <span className="text-slate-400 font-semibold block">MAP VALIDATION:</span>
              <span className="font-bold text-slate-800">{vendor.details.validatedAddress || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">DOMAIN AGE:</span>
              <span className="font-bold text-slate-800">
                {typeof vendor.details.domainAgeDays === "number"
                  ? `${vendor.details.domainAgeDays} Days (${Math.round(vendor.details.domainAgeDays / 365)} years)`
                  : String(vendor.details.domainAgeDays || "N/A")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">DOMAIN REGISTRAR:</span>
              <span className="font-bold text-slate-800">{vendor.details.domainRegistrar || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">SSL SECURITY:</span>
              <span className={`font-bold uppercase ${vendor.details.sslSecure ? "text-emerald-600" : "text-red-500"}`}>
                {vendor.details.sslSecure ? "Secure / active" : "Unencrypted"}
              </span>
            </div>
          </div>
        </div>

        {/* Compliance clearances Card */}
        <div className="bg-white border p-5 rounded-2xl border-slate-100 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest pb-1 border-b">Compliance Checklists</h3>
          <div className="space-y-2.5 text-xxs">
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">SOLVENCY INDEX:</span>
              <span className={`font-bold uppercase ${vendor.details.solvencyStatus === "Solvent" ? "text-emerald-600" : "text-red-500"}`}>
                {vendor.details.solvencyStatus || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">CREDIT TIER EST:</span>
              <span className="font-bold text-slate-800">{vendor.details.creditScoreEst || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">SANCTIONS SDN STATUS:</span>
              <span className={`font-bold uppercase ${vendor.details.sanctionsRisk === "None" ? "text-emerald-600" : "text-red-500 animate-pulse"}`}>
                {vendor.details.sanctionsRisk || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">ADVERSE PRESS FOUND:</span>
              <span className={`font-bold uppercase ${vendor.details.adverseMediaFound ? "text-red-500" : "text-emerald-600"}`}>
                {vendor.details.adverseMediaFound ? "ALERT REVIEWS DETECTED" : "None"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block uppercase">Licenses Audited:</span>
              <p className="font-bold text-slate-850 pl-2 border-l border-slate-205">
                {Array.isArray(vendor.details.complianceLicenses) ? vendor.details.complianceLicenses.join(" • ") : String(vendor.details.complianceLicenses || "None")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion folders for active agents findings */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6  space-y-4 shadow-sm">
        <div className="border-b pb-2">
          <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider">Agents Execution Findings dossier</h3>
          <p className="text-xxs text-slate-400 font-medium">Click on individual agent dossiers to reveal complete evidence chains</p>
        </div>

        <div className="space-y-3">
          {Object.entries(vendor.agentResults).map(([agentKey, results]) => {
            const isExpanded = pdfMode || expandedAgent === agentKey;
            return (
              <div key={agentKey} className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                {/* Header/trigger */}
                <div
                  onClick={() => !pdfMode && setExpandedAgent(isExpanded ? null : agentKey)}
                  className={`bg-slate-50/50 hover:bg-slate-50 px-4 py-3 ${pdfMode ? "" : "cursor-pointer"} flex items-center justify-between transition-colors gap-3`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getAgentColor(results.status)}`}>
                      Score: {results.score}%
                    </div>
                    <span className="font-bold text-slate-800">{results.agentName}</span>
                  </div>
 
                  {!pdfMode && (
                    <div className="flex items-center gap-2">
                      <span className="text-xxs text-slate-400 uppercase tracking-widest font-semibold hidden sm:inline">Folder dossier</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="p-4 space-y-4 bg-white border-t border-slate-50">
                    <div className="space-y-1">
                      <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Agent Assessment Ledger</span>
                      <p className="text-slate-700 leading-relaxed font-sans">{results.outputMessage}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Evidence registry */}
                      <div className="bg-slate-50/40 p-3 rounded-lg border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-450 uppercase block mb-1">Evidence Records</span>
                        <ul className="space-y-1">
                          {Array.isArray(results.evidence) ? results.evidence.map((ev, i) => (
                            <li key={i} className="text-xxs text-slate-650 flex items-start gap-1.5">
                              <span className="text-indigo-500">•</span>
                              <span className="font-semibold leading-relaxed font-mono">{ev}</span>
                            </li>
                          )) : <li className="text-xxs text-slate-550">{String(results.evidence || "")}</li>}
                        </ul>
                      </div>

                      {/* Code findings */}
                      <div className="bg-slate-5 limit border p-3 rounded-lg border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-450 uppercase block mb-1">Core Audit Findings</span>
                        <ul className="space-y-1">
                          {Array.isArray(results.keyFindings) ? results.keyFindings.map((kf, i) => (
                            <li key={i} className="text-xxs text-slate-650 flex items-start gap-1.5 font-sans">
                              <span className="text-rose-500">✓</span>
                              <span className="font-medium">{kf}</span>
                            </li>
                          )) : <li className="text-xxs text-slate-550">{String(results.keyFindings || "")}</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Compliance comments and Audit timeline */}
      {!pdfMode && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 md:col-span-2 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider pb-2 border-b flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              Compliance Log Comment thread
            </h3>

            {/* Existing comments */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {!vendor.comments || vendor.comments.length === 0 ? (
                <div className="text-center py-6 text-xxs text-slate-400">
                  No actions or comments written regarding this review. Sign and post comment below.
                </div>
              ) : (
                vendor.comments.map(c => (
                  <div key={c.id} className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100 text-xxs">
                    <div className="flex justify-between items-center bg-white px-2 py-0.5 rounded border border-slate-100 font-semibold">
                      <span className="text-slate-800 font-bold">{c.author}</span>
                      <span className="text-slate-400 font-normal">{new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed font-sans font-medium pl-1">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment input form */}
            <form onSubmit={handlePostComment} className="pt-2 border-t space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signing Officer</label>
                  <input
                    type="text"
                    disabled
                    className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 text-xxs cursor-not-allowed font-bold"
                    value={currentUser?.name || "M. Anitta"}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit Observation Note</label>
                <div className="flex gap-2">
                  <textarea
                    placeholder="Certify the manual audits audit standard or post verification notices..."
                    rows={2}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 text-xxs placeholder:text-slate-400 font-sans"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="self-end px-3.5 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-850 text-slate-300 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="text-[10px] text-indigo-400 font-black uppercase tracking-wider">Security Certificate</div>
              <h4 className="font-bold text-white text-sm tracking-tight">Vetting Credential Encrypted</h4>
              <p className="text-xxs text-slate-400 font-mono leading-relaxed">
                This report is authenticated under Blockchain anchor hash #HCL-9382-7721C. Evidence collections are locked on localized Sandboxed cloud repositories.
              </p>
            </div>

            <div className="border-t border-slate-800 pt-3 space-y-2 text-xxs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Registry lock authenticated</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 font-sans font-medium">
                <Shield className="w-4 h-4 shrink-0" />
                <span>Audit hash logged in legal files</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
