import React, { useState, useEffect } from "react";
import { Shield, Check, Activity, FileText, UploadCloud, BrainCircuit, PenTool, Search, Lock } from "lucide-react";

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
  const [financials, setFinancials] = useState({
    taxId: "", bankName: "", iban: "", swift: ""
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
        setActiveStep(6);
        
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
        setFinancials({
          taxId: b.taxId || "",
          bankName: b.bankName || "",
          iban: b.iban || "",
          swift: b.swift || ""
        });
        setSignature(v.signature || "");
        return true;
      } else if (data.status === "Queue") {
        setSubmissionStatus("Queue");
        setDbVendor(null);
        setIsSubmitted(true);
        setActiveStep(6);
        
        // Load details from queue
        const q = data.vendor;
        setBusinessInfo({
          legalName: q.companyName || "",
          website: q.website || "",
          country: q.country || "",
          industry: q.industry || "",
          contactEmail: q.contactEmail || ""
        });
        setFinancials(q.financials || { taxId: "", bankName: "", iban: "", swift: "" });
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
          if (data.data.financials) setFinancials(data.data.financials);
          if (data.data.signature) setSignature(data.data.signature);
        }
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    };
    loadInit();
  }, [currentUser]);

  // Polling for Step 6 progress updates
  useEffect(() => {
    if (!isSubmitted || activeStep !== 6) return;
    
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
          data: { businessInfo: { ...businessInfo, country: finalCountry, industry: finalIndustry }, financials, signature }
        })
      });
      alert("Draft saved successfully to Secure Vault.");
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
            financials,
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
      setActiveStep(6);
    } catch (e) {
      console.error(e);
      alert("Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: "Business Legal Info", desc: "Profile details", icon: <FileText className="w-4 h-4" /> },
    { id: 2, title: "Financial Credentials", desc: "Tax & Bank Info", icon: <Shield className="w-4 h-4" /> },
    { id: 3, title: "Certificate Vault", desc: "Module 2: File uploads", icon: <UploadCloud className="w-4 h-4" /> },
    { id: 4, title: "10xIDP Extraction Desk", desc: "Module 3: AI Document OCR", icon: <BrainCircuit className="w-4 h-4" /> },
    { id: 5, title: "Review & Submit", desc: "Digital sign-off", icon: <PenTool className="w-4 h-4" /> },
    { id: 6, title: "Workforce Audit Status", desc: "Live agent tracking", icon: <Activity className="w-4 h-4" /> },
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
            <div className="text-[10px] text-slate-400">Self-Onboarding Credentials Desk & Document Collection Room</div>
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
              { num: 2, label: "Credentials Configured", desc: "Tax & Bank keys" },
              { num: 3, label: "10xIDP Audited", desc: "AI OCR verification" },
              { num: 4, label: "Under Board Review", desc: "Admin queue verification" },
              { num: 5, label: "Active Onboarded", desc: "TPRM clearing approved" }
            ].map(s => {
              let isDone = false;
              let isActive = false;

              if (s.num === 1) {
                isDone = activeStep > 1;
                isActive = activeStep === 1;
              } else if (s.num === 2) {
                isDone = activeStep > 2;
                isActive = activeStep === 2;
              } else if (s.num === 3) {
                isDone = activeStep > 4; 
                isActive = activeStep === 3 || activeStep === 4;
              } else if (s.num === 4) {
                isDone = isSubmitted;
                isActive = activeStep === 5 && !isSubmitted;
              } else if (s.num === 5) {
                isDone = false;
                isActive = activeStep === 6;
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

                {/* Step 2: Financial Info */}
                {activeStep === 2 && (
                  <div className="animate-fade-in space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Module 1: Regulatory Tax & Banking Profiler</h3>
                      <p className="text-xs text-slate-500">Enter depository credentials and tax identifiers for financial solvency audits.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Primary Depository Bank Name</label>
                        <input type="text" value={financials.bankName} onChange={e => setFinancials({...financials, bankName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. National Bank of Kuwait" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Corporate Tax ID / VAT Number</label>
                        <input type="text" value={financials.taxId} onChange={e => setFinancials({...financials, taxId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" placeholder="Tax Registration Number" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">SWIFT / BIC Code</label>
                        <input type="text" value={financials.swift} onChange={e => setFinancials({...financials, swift: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" placeholder="Bank SWIFT Code" />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">IBAN / Account Number</label>
                        <input type="text" value={financials.iban} onChange={e => setFinancials({...financials, iban: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" placeholder="KW76NBKU0000109283471" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Certificate Vault */}
                {activeStep === 3 && (
                  <div className="animate-fade-in space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Module 2: Certificate Vault</h3>
                      <p className="text-xs text-slate-500">Upload official corporate governance documents, licenses, and certifications.</p>
                    </div>
                    
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:bg-slate-50 transition-colors">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UploadCloud className="w-8 h-8 text-slate-400" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">Drag and drop files here</h4>
                      <p className="text-xs text-slate-500 mb-6">Support for PDF, DOCX, JPG up to 50MB</p>
                      
                      <label className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-colors cursor-pointer inline-block">
                        Browse Files
                        <input type="file" className="hidden" multiple />
                      </label>
                    </div>

                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex gap-3">
                      <Shield className="w-5 h-5 text-indigo-500 shrink-0" />
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Uploaded documents are securely encrypted at rest. Our AI OCR engine will automatically extract key metadata in the next step.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 4: 10xIDP Extraction Desk */}
                {activeStep === 4 && (
                  <div className="animate-fade-in space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Module 3: 10xIDP Intelligent Document Processing</h3>
                      <p className="text-xs text-slate-500">Deploy AI to audit your uploaded compliance certificates. The system runs real-time OCR, extracts identity keys, and verifies signatures instantly.</p>
                    </div>
                    
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="flex-1 space-y-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-2">Select Vault Certificate</div>
                        
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400">
                          <FileText className="w-6 h-6 mx-auto mb-2 opacity-50" />
                          <p className="text-xs font-semibold">No certificates uploaded yet.</p>
                          <p className="text-[10px]">Return to the Certificate Vault (Module 2) to upload files for AI OCR processing.</p>
                        </div>
                      </div>

                      <div className="flex-[1.5]">
                        <div className="bg-[#0a0f1c] rounded-2xl h-64 flex flex-col items-center justify-center p-8 relative overflow-hidden border border-slate-800">
                          <BrainCircuit className="w-10 h-10 text-indigo-500 mb-4" />
                          <h4 className="text-indigo-400 font-mono text-sm tracking-wider mb-2">10xIDP INTELLIGENCE TERMINAL</h4>
                          <p className="text-slate-400 text-xs text-center font-mono max-w-sm">
                            Run "Analyze AI OCR" on any uploaded file to retrieve validated company registry certificates in this console.
                          </p>
                          <div className="absolute bottom-4 text-[9px] font-mono text-slate-600">
                            10xIDP Parser v2.6.0-prod // Secure Sandbox Isolation Active
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Review & Submit */}
                {activeStep === 5 && (
                  <div className="animate-fade-in space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Module 1: Legal Declaration & Digital Sign-off</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Please review your completed vetting profile below. Once digitally signed, your dossier will be locked and routed directly to the Executive Compliance Board for final onboarding approval.
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex flex-col md:flex-row gap-6 md:gap-12">
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Business Identity</div>
                        <div className="text-sm font-bold text-slate-800">{businessInfo.legalName || "Not Provided"}</div>
                        <div className="text-[10px] text-slate-500">{businessInfo.website} ({businessInfo.country})</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Depository Banking Details</div>
                        <div className="text-sm font-bold text-slate-800">{financials.bankName || "Not Provided"}</div>
                        <div className="text-[10px] text-slate-500">Acct: {financials.iban}</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Certificates Vaulted</div>
                        <div className="text-sm font-bold text-slate-400 flex items-center gap-1"><FileText className="w-3.5 h-3.5 opacity-70" /> 0 Documents Attached</div>
                        <div className="text-[10px] text-slate-400">Pending upload & OCR verification</div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 font-medium">
                      I hereby declare that all submitted corporate information, tax documents, bank accounts, and compliance certifications are authentic, legitimate, and current legal records of {businessInfo.legalName || "this entity"}.
                    </p>

                    <div className="space-y-2 pt-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Type Full Legal Name As Digital Signature</label>
                      <div className="relative">
                        <PenTool className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          value={signature}
                          onChange={e => setSignature(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500" 
                          placeholder="e.g. M. Al-Mutawa" 
                          disabled={isSubmitted}
                        />
                      </div>
                    </div>

                    {isSubmitted && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <div className="text-xs font-bold text-emerald-800">
                          Dossier submitted! Currently awaiting Compliance Board verification and TPRM listing clearing.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 6: Workforce Audit Status */}
                {activeStep === 6 && (
                  <div className="animate-fade-in space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Module 4: 10xVerify AI Workforce Screening Hub</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Track the active audit processes conducted by our specialized, coordinate AI agent workforce.
                      </p>
                    </div>

                    <div className="bg-[#0a0f1c] rounded-2xl p-6 border border-slate-800 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3"></div>
                      
                      <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                          <div>
                            <div className="bg-indigo-500/20 text-indigo-300 text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-500/30 uppercase tracking-widest w-max mb-3">Secure Scry-Agent Cores Active</div>
                            <div className="text-xl font-bold mb-1 flex items-center gap-2">
                              Dossier: <span className="text-emerald-400 font-mono text-lg">{businessInfo.legalName ? `sov-${businessInfo.legalName.substring(0, 8).toLowerCase()}` : "sov-draft"}</span>
                            </div>
                            <div className="text-xs text-slate-400 font-medium">
                              Status: <span className="text-white">{submissionStatus === "Screened" ? (dbVendor?.status || "Screened") : (submissionStatus === "Queue" ? "Awaiting Vetting (In Queue)" : "Submitted")}</span> // Vetting Queue Routing: Class 1 {businessInfo.industry || "General"} Provider
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Audit Score Index</div>
                              <div className="text-2xl font-bold text-white leading-none">{submissionStatus === "Screened" ? `${dbVendor?.riskScore}%` : "--%"}</div>
                            </div>
                            {submissionStatus === "Screened" && (
                              <div className={`px-2.5 py-1 text-xxs font-bold rounded-lg uppercase ${
                                dbVendor?.riskRating === "GREEN" ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/30" :
                                dbVendor?.riskRating === "AMBER" ? "bg-amber-500/25 text-amber-300 border border-amber-500/30" :
                                dbVendor?.riskRating === "RED" ? "bg-red-500/25 text-red-300 border border-red-500/30 animate-pulse" :
                                "bg-slate-900/50 text-slate-300 border border-slate-750"
                              }`}>
                                {dbVendor?.riskRating || "PENDING"} RISK
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-slate-300">
                            <span>Diagnostic Completeness:</span>
                            <span>{submissionStatus === "Screened" ? "Completed (7/7 Nodes Checked)" : (submissionStatus === "Queue" ? "In Queue (0/7 Nodes Checked)" : "Awaiting Execution Pipeline...")}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full relative transition-all duration-500" style={{ width: submissionStatus === "Screened" ? "100%" : (submissionStatus === "Queue" ? "15%" : "8%") }}>
                               <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { title: "Company Registry Bot", key: "corporate-agent", subtitle: "CORPORATE ENTITY VERIFICATION", desc: "Validates active registrations, licensing history, and corporate officer records with regional chambers." },
                        { title: "SanctGuard Core", key: "regulatory-agent", subtitle: "GLOBAL SANCTIONS & SDN SCREENING", desc: "Fuzzy check across US OFAC, UK HMT, EU Consolidated, and UN Security Council watchlists." },
                        { title: "GeoFinder GIS", key: "location-agent", subtitle: "PHYSICAL GEOLOCATION AUDIT", desc: "Inspects physical warehouse location coordinates, zoning compliance, and satellite validity indices." },
                        { title: "10xIDP Document Audit", key: "digital-agent", subtitle: "AI DOCUMENT INTELLIGENCE & OCR", desc: "Performs OCR text extraction, domain trust registry scans, and secure SSL verification." }
                      ].map(bot => {
                        const agent = dbVendor?.agentResults?.[bot.key];
                        return (
                          <div key={bot.title} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{bot.subtitle}</div>
                                  <div className="text-sm font-bold text-slate-800">{bot.title}</div>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                  agent 
                                    ? (agent.status === "success" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100") 
                                    : "bg-slate-50 text-slate-400 border-slate-200"
                                }`}>
                                  {agent ? `SCORE: ${agent.score}%` : "PENDING"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed mb-4">{bot.desc}</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Live Core Findings:</div>
                              <div className="text-[11px] font-mono text-slate-650 leading-relaxed">
                                {agent ? agent.outputMessage : "Awaiting Agent Execution Pipeline..."}
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
                {activeStep === 6 && submissionStatus === "Screened" && (dbVendor?.status === "Approved" || dbVendor?.status === "Rejected") ? (
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
                
                {activeStep < 5 && (
                  <button 
                    onClick={() => setActiveStep(prev => prev + 1)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-6 rounded-lg transition-colors text-xs"
                  >
                    Next Step →
                  </button>
                )}
                
                {activeStep === 5 && !isSubmitted && (
                  <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-6 rounded-lg transition-colors text-xs disabled:opacity-50"
                  >
                    {loading ? "Submitting..." : "Review Sign-off"}
                  </button>
                )}
                
                {activeStep === 5 && isSubmitted && (
                  <button 
                    onClick={() => setActiveStep(6)}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors text-xs"
                  >
                    View Audit Status
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
