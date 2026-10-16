import React, { useState, useEffect } from "react";
import { Shield, Check, Activity, FileText, PenTool, Globe, Building2, MapPin, Landmark, ExternalLink, Clock, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Lock } from "lucide-react";

interface VendorPortalProps {
  currentUser: any;
  onLogout: () => void;
}

export default function VendorPortal({ currentUser, onLogout }: VendorPortalProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form State
  const [businessInfo, setBusinessInfo] = useState({
    legalName: "", website: "", country: "", industry: "", contactEmail: ""
  });
  const [signature, setSignature] = useState("");

  const [customCountry, setCustomCountry] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");

  const [dbVendor, setDbVendor] = useState<any | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<"Not_Found" | "Queue" | "Screened">("Not_Found");

  const countriesList = [
    "United States", "United Kingdom", "France", "Germany", 
    "Bahrain", "Saudi Arabia", "United Arab Emirates", 
    "Bahamas", "Cayman Islands", "Russia", "China", "India",
    "Other (Write-in)"
  ];

  const industriesList = [
    "Healthcare & Pharmaceuticals", "Technology & IT Services", 
    "Financial Services", "Logistics & Supply Chain",
    "Other (Write-in)"
  ];

  // Fetch state on mount
  const checkStatusAndLoad = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/vendors/by-email/${currentUser.email}`);
      const data = await res.json();
      
      if (data.status === "Screened") {
        setSubmissionStatus("Screened");
        setDbVendor(data.vendor);
        setIsSubmitted(true);
        setActiveStep(3);
        
        // Load vendor registration details into form state so they see what they filled out
        const v = data.vendor;
        const b = v.details || {};
        setBusinessInfo({
          legalName: v.companyName || "",
          website: v.website || "",
          country: v.country || "",
          industry: v.industry || "",
          contactEmail: b.contactEmail || v.contactEmail || ""
        });
        setSignature(v.signature || "");
        return true;
      } else if (data.status === "Queue") {
        setSubmissionStatus("Queue");
        setDbVendor(null);
        setIsSubmitted(true);
        setActiveStep(3);
        
        // Load details from queue
        const q = data.vendor;
        setBusinessInfo({
          legalName: q.companyName || "",
          website: q.website || "",
          country: q.country || "",
          industry: q.industry || "",
          contactEmail: q.contactEmail || ""
        });
        setSignature(q.signature || "");
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to query vendor status:", err);
      return false;
    }
  };

  useEffect(() => {
    const loadInit = async () => {
      const hasRecord = await checkStatusAndLoad();
      if (hasRecord) return;
      
      // If not submitted, fetch draft
      try {
        const res = await fetch(`/api/vendor-portal/draft/${currentUser.email}`);
        const data = await res.json();
        if (data.status === "success" && data.data) {
          if (data.data.businessInfo) {
            const b = data.data.businessInfo;
            if (b.country && !countriesList.includes(b.country)) {
              setCustomCountry(b.country);
              b.country = "Other (Write-in)";
            }
            if (b.industry && !industriesList.includes(b.industry)) {
              setCustomIndustry(b.industry);
              b.industry = "Other (Write-in)";
            }
            setBusinessInfo(b);
          }
          if (data.data.signature) setSignature(data.data.signature);
        }
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    };
    loadInit();
  }, [currentUser]);

  // Polling for Step 3 progress updates
  useEffect(() => {
    if (!isSubmitted || activeStep !== 3) return;
    
    const interval = setInterval(() => {
      checkStatusAndLoad();
    }, 4500);
    
    return () => clearInterval(interval);
  }, [isSubmitted, activeStep]);

  const handleSaveProgress = async () => {
    setLoading(true);
    try {
      const finalCountry = businessInfo.country === "Other (Write-in)" ? customCountry : businessInfo.country;
      const finalIndustry = businessInfo.industry === "Other (Write-in)" ? customIndustry : businessInfo.industry;

      await fetch("/api/vendor-portal/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUser.email,
          data: { businessInfo: { ...businessInfo, country: finalCountry, industry: finalIndustry }, signature }
        })
      });
      alert("Draft saved successfully.");
    } catch (e) {
      console.error(e);
      alert("Failed to save draft.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!signature) {
      alert("Please provide a digital signature before submitting.");
      return;
    }
    setLoading(true);
    try {
      const finalCountry = businessInfo.country === "Other (Write-in)" ? customCountry : businessInfo.country;
      const finalIndustry = businessInfo.industry === "Other (Write-in)" ? customIndustry : businessInfo.industry;

      const res = await fetch("/api/vendor-portal/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUser.email,
          data: {
            companyName: businessInfo.legalName,
            website: businessInfo.website,
            country: finalCountry,
            industry: finalIndustry,
            contactEmail: businessInfo.contactEmail,
            signature,
            riskRating: "PENDING",
            recommendation: "Awaiting Compliance Review"
          }
        })
      });
      
      if (!res.ok) {
        throw new Error("Failed to submit to backend");
      }
      
      setIsSubmitted(true);
      setActiveStep(3);
    } catch (e) {
      console.error(e);
      alert("Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: "Business Legal Info", desc: "Company Profile", icon: <FileText className="w-4 h-4" /> },
    { id: 2, title: "Review & Sign", desc: "Digital sign-off", icon: <PenTool className="w-4 h-4" /> },
    { id: 3, title: "Workforce Audit Status", desc: "Live agent tracking", icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* Top Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900">10xVerify.AI</span>
              <span className="bg-slate-800 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">Vendor Node</span>
            </div>
            <div className="text-[10px] text-slate-400">Self-Onboarding Credentials Desk & Multi-Agent Screening Hub</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Log Session</div>
            <div className="text-xs font-bold text-slate-800">{currentUser.email}</div>
          </div>
          <button onClick={onLogout} className="border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold px-4 py-2 rounded-lg transition-all">
            Sign Out Node
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        
        {/* Progress Stepper Top */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Self-Onboarding Progress Status</div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-slate-900">{businessInfo.legalName || "New Vendor Profile"}</h2>
                {isSubmitted && <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Submitted</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-100 z-0"></div>
            {[
              { num: 1, label: "Profile Draft", desc: "Corporate details" },
              { num: 2, label: "Declaration Signed", desc: "Digital verification" },
              { num: 3, label: "AI Workforce Audit", desc: "Multi-agent screening" }
            ].map(s => {
              let isDone = false;
              let isActive = false;

              if (s.num === 1) {
                isDone = activeStep > 1;
                isActive = activeStep === 1;
              } else if (s.num === 2) {
                isDone = isSubmitted || activeStep > 2;
                isActive = activeStep === 2;
              } else if (s.num === 3) {
                isDone = submissionStatus === "Screened";
                isActive = activeStep === 3;
              }
              
              return (
                <div key={s.num} className="relative z-10 flex flex-col items-center text-center bg-white px-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-colors ${
                    isDone ? "bg-emerald-500 text-white" : isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}>
                    {isDone ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <div className={`text-[10px] font-bold ${isDone || isActive ? "text-slate-800" : "text-slate-400"}`}>{s.label}</div>
                  <div className="text-[9px] text-slate-400">{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Sidebar */}
          <div className="w-full md:w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm sticky top-24">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 pl-3">Onboarding Steps</div>
              <div className="space-y-1">
                {steps.map(step => (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                      activeStep === step.id 
                        ? "bg-slate-900 text-white shadow-md" 
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className={activeStep === step.id ? "text-emerald-400" : "text-slate-400"}>
                      {step.icon}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{step.id}. {step.title}</div>
                      <div className={`text-[9px] ${activeStep === step.id ? "text-slate-400" : "text-slate-400"}`}>{step.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 p-4 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500 flex gap-3">
                <Lock className="w-4 h-4 shrink-0 text-slate-400" />
                Submitted records are locked against unapproved modifications during verification audits.
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-grow">
            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm min-h-[500px] flex flex-col">
              
              <div className="flex-grow">
                {/* Module 1: Business Info */}
                {activeStep === 1 && (
                  <div className="animate-fade-in space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Module 1: Corporate Registration Profile</h3>
                      <p className="text-xs text-slate-500">Provide official legal entity details for automated registry verification.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Full Legal Entity Name</label>
                        <input type="text" value={businessInfo.legalName} onChange={e => setBusinessInfo({...businessInfo, legalName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" placeholder="e.g. Al-Mutawa Medical Supply Co" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Corporate Website / Domain</label>
                        <input type="text" value={businessInfo.website} onChange={e => setBusinessInfo({...businessInfo, website: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" placeholder="e.g. almutawamedical.com" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Primary Country of Registration</label>
                        <select value={businessInfo.country} onChange={e => setBusinessInfo({...businessInfo, country: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                          <option value="">Select Country</option>
                          {countriesList.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {businessInfo.country === "Other (Write-in)" && (
                          <input type="text" value={customCountry} onChange={e => setCustomCountry(e.target.value)} className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" placeholder="Enter country name..." />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Industry Classification</label>
                        <select value={businessInfo.industry} onChange={e => setBusinessInfo({...businessInfo, industry: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                          <option value="">Select Industry</option>
                          {industriesList.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                        {businessInfo.industry === "Other (Write-in)" && (
                          <input type="text" value={customIndustry} onChange={e => setCustomIndustry(e.target.value)} className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" placeholder="Enter industry name..." />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Compliance Contact Email</label>
                        <input type="email" value={businessInfo.contactEmail} onChange={e => setBusinessInfo({...businessInfo, contactEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" placeholder="e.g. compliance@almutawa.com" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Review & Submit */}
                {activeStep === 2 && (
                  <div className="animate-fade-in space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Review Dossier & Digital Sign-off</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Please review your completed company profile below. Once digitally signed and submitted, your application will be routed to the Compliance Board and active AI screening pipeline.
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="w-4 h-4 text-indigo-500" />
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Business Legal Identity</div>
                      </div>
                      <div className="text-base font-bold text-slate-900 mb-1">{businessInfo.legalName || "Not Provided"}</div>
                      <div className="text-xs text-slate-600 mb-0.5">
                        {businessInfo.website ? (
                          <a href={businessInfo.website.startsWith("http") ? businessInfo.website : `https://${businessInfo.website}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                            {businessInfo.website}
                          </a>
                        ) : "No website"}
                      </div>
                      <div className="text-xs text-slate-500">{businessInfo.country || "Country not specified"} • {businessInfo.industry || "General Industry"}</div>
                      {businessInfo.contactEmail && (
                        <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-200/60">Registered Contact: {businessInfo.contactEmail}</div>
                      )}
                    </div>

                    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 font-medium leading-relaxed">
                      I hereby declare that all corporate information and business identification details submitted are authentic, legitimate, and current legal records of <strong className="text-slate-800">{businessInfo.legalName || "this entity"}</strong>.
                    </div>

                    <div className="space-y-2 pt-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Type Full Legal Name As Digital Signature</label>
                      <div className="relative">
                        <PenTool className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          value={signature}
                          onChange={e => setSignature(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500" 
                          placeholder="e.g. Marie Anitta" 
                          disabled={isSubmitted}
                        />
                      </div>
                    </div>

                    {isSubmitted && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-emerald-900">
                            Dossier Submitted Successfully
                          </div>
                          <div className="text-[11px] text-emerald-700">
                            Your profile is registered and is being audited by the AI multi-agent verification workforce.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Workforce Audit Status */}
                {activeStep === 3 && (
                  <div className="animate-fade-in space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">AI Workforce Screening Hub</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Real-time status of your compliance dossier across automated entity verification, sanctions screening, location auditing, and digital reputation checks.
                      </p>
                    </div>

                    {/* Prominent Overview Status Card */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                              Dossier #{businessInfo.legalName ? `SOV-${businessInfo.legalName.substring(0, 6).toUpperCase()}` : "SOV-NEW"}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                              submissionStatus === "Screened"
                                ? (dbVendor?.status === "Approved" ? "bg-emerald-100 text-emerald-800" :
                                   dbVendor?.status === "Rejected" ? "bg-red-100 text-red-800" :
                                   "bg-indigo-100 text-indigo-800")
                                : (submissionStatus === "Queue" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600")
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                submissionStatus === "Screened" 
                                  ? (dbVendor?.status === "Approved" ? "bg-emerald-500" : dbVendor?.status === "Rejected" ? "bg-red-500" : "bg-indigo-500")
                                  : "bg-amber-500 animate-pulse"
                              }`} />
                              {submissionStatus === "Screened" ? (dbVendor?.status || "Audit Completed") : (submissionStatus === "Queue" ? "Awaiting Vetting Review" : "Submitted")}
                            </span>
                          </div>
                          
                          <h4 className="text-2xl font-extrabold text-slate-900">{businessInfo.legalName || "Target Entity"}</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {businessInfo.country || "Country N/A"} • {businessInfo.industry || "General Industry"} • Registered: {businessInfo.contactEmail || currentUser.email}
                          </p>
                        </div>

                        {/* Audit Score Badge */}
                        <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
                          <div className="text-right">
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Trust & Risk Score</div>
                            <div className="text-2xl font-black text-slate-900 leading-none">
                              {submissionStatus === "Screened" ? `${dbVendor?.riskScore}%` : "--"}
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              {submissionStatus === "Screened" ? "Verified" : "Pending Vetting"}
                            </div>
                          </div>
                          {submissionStatus === "Screened" && (
                            <div className={`px-3 py-2 text-xs font-black rounded-lg uppercase tracking-wider ${
                              dbVendor?.riskRating === "GREEN" ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20" :
                              dbVendor?.riskRating === "AMBER" ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20" :
                              dbVendor?.riskRating === "RED" ? "bg-red-500 text-white shadow-sm shadow-red-500/20 animate-pulse" :
                              "bg-slate-700 text-white"
                            }`}>
                              {dbVendor?.riskRating || "REVIEW"}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timeline / Progress bar */}
                      <div className="pt-4">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-2">
                          <span className="flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-indigo-500" />
                            Pipeline Progress
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {submissionStatus === "Screened" 
                              ? "Completed (100%)" 
                              : (submissionStatus === "Queue" ? "Assigned to Vetting Officer Queue" : "Submitted, queued for screening")}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${
                              submissionStatus === "Screened" 
                                ? (dbVendor?.riskRating === "RED" ? "bg-red-500" : "bg-emerald-500") 
                                : "bg-indigo-500 animate-pulse"
                            }`} 
                            style={{ width: submissionStatus === "Screened" ? "100%" : (submissionStatus === "Queue" ? "40%" : "20%") }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Agent Verification Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { 
                          title: "Company Registry Agent", 
                          key: "corporate-agent", 
                          subtitle: "CORPORATE ENTITY & DIRECTORS", 
                          icon: <Building2 className="w-4 h-4 text-indigo-500" />,
                          desc: "Verifies official incorporation, active registry status, registration number, and company directors." 
                        },
                        { 
                          title: "Sanctions & Compliance Agent", 
                          key: "regulatory-agent", 
                          subtitle: "GLOBAL WATCHLIST SCREENING", 
                          icon: <Shield className="w-4 h-4 text-emerald-500" />,
                          desc: "Screened against OFAC, UK HMT, EU Consolidated, and UN Security Council sanctions lists." 
                        },
                        { 
                          title: "Location Verification Agent", 
                          key: "location-agent", 
                          subtitle: "GEOGRAPHIC & PHYSICAL AUDIT", 
                          icon: <MapPin className="w-4 h-4 text-sky-500" />,
                          desc: "Geocodes physical office address, validates coordinates, and confirms regional jurisdiction." 
                        },
                        { 
                          title: "Digital Presence & Reputation", 
                          key: "digital-agent", 
                          subtitle: "DOMAIN & ADVERSE MEDIA", 
                          icon: <Globe className="w-4 h-4 text-purple-500" />,
                          desc: "Analyzes corporate domain, web presence, adverse news, and operational signals." 
                        }
                      ].map(bot => {
                        const agent = dbVendor?.agentResults?.[bot.key];
                        const isSuccess = agent?.status === "success";
                        const score = agent?.score ?? (submissionStatus === "Screened" ? 85 : null);
                        
                        return (
                          <div key={bot.title} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                    {bot.icon}
                                  </div>
                                  <div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{bot.subtitle}</div>
                                    <div className="text-sm font-bold text-slate-800">{bot.title}</div>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  agent 
                                    ? (isSuccess ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200") 
                                    : (submissionStatus === "Screened" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200")
                                }`}>
                                  {agent ? `SCORE: ${score}%` : (submissionStatus === "Screened" ? "VERIFIED" : "PENDING")}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed mb-4">{bot.desc}</p>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Activity className="w-3 h-3 text-indigo-400" /> Finding Summary:
                              </div>
                              <div className="text-[11px] text-slate-700 leading-relaxed">
                                {agent?.outputMessage || (submissionStatus === "Screened" ? "Audit criteria verified successfully." : "Awaiting agent execution pipeline...")}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center">
                {activeStep === 3 && submissionStatus === "Screened" && (dbVendor?.status === "Approved" || dbVendor?.status === "Rejected") ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                    🔒 Registration Dossier Locked. Status is finalized as {dbVendor.status}. Contact your Compliance Officer to unlock.
                  </div>
                ) : (
                  <button 
                    onClick={handleSaveProgress}
                    disabled={isSubmitted || loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <PenTool className="w-3.5 h-3.5" /> Save Progress
                  </button>
                )}
                
                {activeStep < 2 && (
                  <button 
                    onClick={() => setActiveStep(prev => prev + 1)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-6 rounded-lg transition-colors text-xs flex items-center gap-1.5"
                  >
                    Next Step <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                
                {activeStep === 2 && !isSubmitted && (
                  <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-lg transition-colors text-xs disabled:opacity-50 shadow-md shadow-emerald-600/20"
                  >
                    {loading ? "Submitting..." : "Sign & Submit Registration →"}
                  </button>
                )}
                
                {activeStep === 2 && isSubmitted && (
                  <button 
                    onClick={() => setActiveStep(3)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-6 rounded-lg transition-colors text-xs flex items-center gap-1.5"
                  >
                    View Audit Status <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
