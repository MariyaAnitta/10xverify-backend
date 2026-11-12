import React, { useState, useEffect } from "react";
import { Play, CheckCircle, Shield, AlertTriangle, Cpu, Globe, Search, Navigation, Award, MessageSquare, DollarSign, RefreshCw, X } from "lucide-react";
import { VendorScreening } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ScreeningPortalProps {
  onScreeningComplete: (newVendor: VendorScreening) => void;
  autoStartVendor?: any;
  existingVendors?: VendorScreening[];
  onViewExistingVendor?: (vendorId: string) => void;
}

const isValidDomainOrUrl = (value: string): boolean => {
  if (!value || typeof value !== "string") return false;
  const raw = value.trim();
  let host = raw;
  if (/^https?:\/\//i.test(host)) {
    try {
      const parsed = new URL(raw);
      host = parsed.hostname;
    } catch {
      return false;
    }
  } else {
    host = host.split("/")[0].split("?")[0].split("#")[0];
  }
  const domainPattern = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63}(?<!-))*\.[a-zA-Z]{2,}$/;
  return domainPattern.test(host);
};

const STAGES = [
  { id: "corporate", name: "Company Verification Agent", icon: Shield, log: "Connecting to company registry..." },
  { id: "digital", name: "Digital Presence Agent", icon: Globe, log: "Analyzing website & domains..." },
  { id: "location", name: "Location Verification Agent", icon: Navigation, log: "Resolving GPS & address..." },
  { id: "regulatory", name: "Regulatory Compliance Agent", icon: Award, log: "Auditing compliance licenses..." },
  { id: "reputation", name: "Reputation Agent", icon: MessageSquare, log: "Scanning adverse media databases..." },
  { id: "financial", name: "Financial Assessment Agent", icon: DollarSign, log: "Calculating solvency indicators..." },
  { id: "risk", name: "Risk Intelligence Agent", icon: Cpu, log: "Consolidating risk intelligence..." }
];

export default function ScreeningPortal({ onScreeningComplete, autoStartVendor, existingVendors, onViewExistingVendor }: ScreeningPortalProps) {
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("United States");
  const [customCountry, setCustomCountry] = useState("");
  const [industry, setIndustry] = useState("Healthcare");
  const [customIndustry, setCustomIndustry] = useState("");
  const [duplicateMatch, setDuplicateMatch] = useState<VendorScreening | null>(null);
  const [screenedBy, setScreenedBy] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("10xverify_user") || "{}");
      return u.name || "Authorized Officer";
    } catch {
      return "Authorized Officer";
    }
  });
  
  const [email, setEmail] = useState("");

  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [tickerLogs, setTickerLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isFinalizing, setIsFinalizing] = useState(false);

  const countries = [
    "United States", "United Kingdom", "France", "Germany", 
    "Bahrain", "Saudi Arabia", "United Arab Emirates", 
    "Bahamas", "Cayman Islands", "Russia", "China", "India",
    "Other (Write-in)"
  ];

  const industries = [
    "Healthcare", "Banking", "Government", "Retail & Distribution", 
    "Manufacturing", "Investment Firms", "Technology",
    "Other (Write-in)"
  ];

  useEffect(() => {
    if (duplicateMatch) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [duplicateMatch]);

  // Auto-start if triggered from Vendor Queue
  useEffect(() => {
    if (autoStartVendor && !hasAutoStarted) {
      setCompanyName(autoStartVendor.companyName || "");
      setWebsite(autoStartVendor.website || "");
      setEmail(autoStartVendor.contactEmail || autoStartVendor.email || "");
      
      const c = countries.includes(autoStartVendor.country) ? autoStartVendor.country : "Other (Write-in)";
      setCountry(c);
      if (c === "Other (Write-in)") setCustomCountry(autoStartVendor.country);

      const i = industries.includes(autoStartVendor.industry) ? autoStartVendor.industry : "Other (Write-in)";
      setIndustry(i);
      if (i === "Other (Write-in)") setCustomIndustry(autoStartVendor.industry);

      setHasAutoStarted(true);
      setErrorMessage("");
      setIsRunning(true);
      setIsFinalizing(false);
      setCurrentStageIndex(0);
      setTickerLogs([`[SYSTEM] Digital workforce auto-initiated from Admin Queue for ${autoStartVendor.companyName}.`]);
    }
  }, [autoStartVendor, hasAutoStarted]);

  // Simulates ticker logs running in the background for active agent
  useEffect(() => {
    if (!isRunning) return;

    let logCounter = 0;
    const stage = STAGES[Math.min(currentStageIndex, STAGES.length - 1)];
    if (!stage) return;
    
    // Add initial log
    setTickerLogs(prev => [
      `[INFO] [${stage.name}] Initializing diagnostic check...`,
      `[ACTION] [${stage.name}] ${stage.log}`,
      ...prev
    ]);

    const logGenerator = setInterval(() => {
      logCounter++;
      const id = stage.id;
      let mockLog = "";

      if (id === "corporate") {
        const checkLogs = [
          `[CHECK] Querying governmental registry archives for "${companyName}"...`,
          `[REGISTRY] Legal profile matched. Pulling corporate officer list...`,
          `[OK] Registration hash matches. Status: Verified.`
        ];
        mockLog = checkLogs[logCounter % checkLogs.length];
      } else if (id === "digital") {
        const checkLogs = [
          `[WHOIS] Resolving DNS server metadata for "${website}"...`,
          `[SSL] Inspecting SSL/TLS Root CA security protocol chain...`,
          `[LINKEDIN] Querying company organizational graph and listed employees...`
        ];
        mockLog = checkLogs[logCounter % checkLogs.length];
      } else if (id === "location") {
        const checkLogs = [
          `[GEO] Validating registered postal address in ${country}...`,
          `[MAPS] Correlating geolocation coordinates using Google Maps api...`,
          `[ANALYSIS] Cross-referencing facility class suitability: Industrial / Commercial...`
        ];
        mockLog = checkLogs[logCounter % checkLogs.length];
      } else if (id === "regulatory") {
        const checkLogs = [
          `[AUDIT] Crawling national healthcare or investment licenses registries...`,
          `[SANCTIONS] Accessing OFAC SDN and Consolidated EU sanctions databases...`,
          `[PEP] Searching PEP (Politically Exposed Persons) registers...`
        ];
        mockLog = checkLogs[logCounter % checkLogs.length];
      } else if (id === "reputation") {
        const checkLogs = [
          `[MEDIA] Auditing 15,000+ worldwide financial news sites for adverse media...`,
          `[REVIEWS] Aggregating third-party directory rating benchmarks...`,
          `[OK] Media score calculated. No immediate threat alerts detected.`
        ];
        mockLog = checkLogs[logCounter % checkLogs.length];
      } else if (id === "financial") {
        const checkLogs = [
          `[CREDIT] Computing private financial model solvency benchmarks...`,
          `[RATIO] Formulating estimated quick liquidity bounds...`,
          `[OK] Solvent status certified.`
        ];
        mockLog = checkLogs[logCounter % checkLogs.length];
      } else {
        const checkLogs = [
          `[SYNTHESIS] Processing categories: Weight [Corporate: 25%, Regulatory: 20%, Financial: 20%]...`,
          `[INTELLIGENCE] Processing weights [Reputation: 15%, Location: 10%, Digital: 10%]...`,
          `[DECISION] Formulating compliance rating level...`
        ];
        mockLog = checkLogs[logCounter % checkLogs.length];
      }

      setTickerLogs(prev => [`[PROCESS] [${stage.name}] ${mockLog}`, ...prev]);

      if (logCounter >= 3) {
        clearInterval(logGenerator);
        if (currentStageIndex < STAGES.length - 1) {
          setCurrentStageIndex(prev => prev + 1);
        } else {
          // Completed all states! Run the actual backend submission.
          completeScreening();
        }
      }
    }, 1100);

    return () => clearInterval(logGenerator);
  }, [isRunning, currentStageIndex]);

  const startScreeningSequence = () => {
    setErrorMessage("");
    setIsRunning(true);
    setIsFinalizing(false);
    setCurrentStageIndex(0);
    setTickerLogs([`[SYSTEM] Digital workforce initiated for ${companyName}.`]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setErrorMessage("Please supply a valid Company Name.");
      return;
    }
    if (companyName.trim().length > 100) {
      setErrorMessage("Company Name exceeds the maximum allowable limit of 100 characters.");
      return;
    }
    if (!website.trim()) {
      setErrorMessage("Please supply a Company Website/Domain address.");
      return;
    }
    if (website.trim().length > 150) {
      setErrorMessage("Website/Domain exceeds the maximum allowable limit of 150 characters.");
      return;
    }
    if (!isValidDomainOrUrl(website)) {
      setErrorMessage("Invalid website/domain format. Please enter a valid domain (e.g. 'company.com' or 'https://company.com') with a valid extension.");
      return;
    }

    const finalCountry = country === "Other (Write-in)" ? customCountry.trim() : country;
    const finalIndustry = industry === "Other (Write-in)" ? customIndustry.trim() : industry;

    if (!finalCountry) {
      setErrorMessage("Please supply a country registry.");
      return;
    }
    if (!finalIndustry) {
      setErrorMessage("Please supply a target industry.");
      return;
    }

    // Check for existing records to prevent unintended duplicate screenings
    if (existingVendors && existingVendors.length > 0) {
      const cleanName = companyName.trim().toLowerCase();
      const cleanSite = website.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase().trim();
      const match = existingVendors.find(v => {
        const vName = (v.companyName || "").trim().toLowerCase();
        const vSite = (v.website || "").replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase().trim();
        return (cleanName && vName === cleanName) || (cleanSite && vSite && vSite === cleanSite);
      });

      if (match) {
        setDuplicateMatch(match);
        return;
      }
    }

    startScreeningSequence();
  };

  const completeScreening = async () => {
    setIsFinalizing(true);
    setTickerLogs(prev => [
      `[SYSTEM] Contacting backend orchestrator... Running Gemini Multi-Agent validation models. Please do not navigate away. This may take 60-90 seconds.`,
      ...prev
    ]);
    try {
      const finalCountry = country === "Other (Write-in)" ? customCountry.trim() : country;
      const finalIndustry = industry === "Other (Write-in)" ? customIndustry.trim() : industry;

      let userHeaders: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const savedUser = JSON.parse(localStorage.getItem("10xverify_user") || "{}");
        if (savedUser.role) userHeaders["X-User-Role"] = savedUser.role;
        if (savedUser.email) userHeaders["X-User-Email"] = savedUser.email;
        if (savedUser.name) userHeaders["X-User-Name"] = savedUser.name;
      } catch {}

      const response = await fetch("/api/screen", {
        method: "POST",
        headers: userHeaders,
        body: JSON.stringify({
          companyName,
          website,
          country: finalCountry,
          industry: finalIndustry,
          screenedBy,
          email: email || undefined
        })
      });

      if (!response.ok) {
        throw new Error("Screening execution aborted on back-end pipeline.");
      }

      const result: VendorScreening = await response.json();
      onScreeningComplete(result);
      
      // Reset State
      setIsRunning(false);
      setIsFinalizing(false);
      setCompanyName("");
      setWebsite("");
      setCustomCountry("");
      setCustomIndustry("");
      setEmail("");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Something went wrong during agent orchestration.");
      setIsRunning(false);
      setIsFinalizing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8" id="screening-portal">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
          <Cpu className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">AI Diligence Workforce Portal</h2>
          <p className="text-sm text-slate-500">Initiate live, automated multi-agent corporate screening and risk assessment</p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!isRunning ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Company Name</label>
                <span className="text-[10px] text-slate-400 font-mono">{companyName.length}/100</span>
              </div>
              <input
                type="text"
                placeholder="e.g. Novartis Pharmaceuticals"
                maxLength={100}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-850 placeholder:text-slate-400"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
              <p className="text-xxs text-slate-400">Max 100 characters. Type "Veloce" or "Uralchim" to test high-risk simulation pathways.</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Company Website/Domain</label>
                <span className="text-[10px] text-slate-400 font-mono">{website.length}/150</span>
              </div>
              <input
                type="text"
                placeholder="e.g. novartis.com"
                maxLength={150}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-850 placeholder:text-slate-400"
                value={website}
                onChange={e => setWebsite(e.target.value)}
              />
              <p className="text-xxs text-slate-400">Max 150 characters. Type "fake-phish.net" to trigger digital alert validations.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Country of Registration</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-850"
                value={country}
                onChange={e => setCountry(e.target.value)}
              >
                {countries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {country === "Other (Write-in)" && (
                <input
                  type="text"
                  placeholder="Enter custom country..."
                  className="w-full mt-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs text-slate-850"
                  value={customCountry}
                  onChange={e => setCustomCountry(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Target Industry</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-850"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
              >
                {industries.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              {industry === "Other (Write-in)" && (
                <input
                  type="text"
                  placeholder="Enter custom industry..."
                  className="w-full mt-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs text-slate-850"
                  value={customIndustry}
                  onChange={e => setCustomIndustry(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Vetting Officer Name</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-850"
                value={screenedBy}
                onChange={e => setScreenedBy(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-sm hover:shadow transition-all cursor-pointer mt-2"
          >
            <Play className="w-5 h-5 text-emerald-400 fill-emerald-400" />
            <span>Launch Digital Workforce Screening</span>
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Active Agent Statuses */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const isActive = idx === currentStageIndex;
              const isPast = idx < currentStageIndex;

              return (
                <div
                  key={stage.id}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                    isActive 
                      ? "bg-blue-50 border-blue-200 text-blue-600" 
                      : isPast 
                      ? "bg-emerald-50/50 border-emerald-100 text-emerald-600" 
                      : "bg-slate-50/50 border-slate-100 text-slate-400"
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${isActive ? "animate-pulse" : ""}`} />
                  <span className="text-xxs font-bold uppercase tracking-wider line-clamp-1">{stage.name.split(" ")[0]}</span>
                  {isActive && <span className="text-xxs text-blue-500 mt-1 font-medium animate-pulse">Running</span>}
                  {isPast && <span className="text-xxs text-emerald-600 mt-1 font-medium flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Done</span>}
                </div>
              );
            })}
          </div>

          {/* Active Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span className="text-blue-600 animate-pulse flex items-center gap-1">
                <Cpu className="w-4 h-4 animate-spin text-blue-500" />
                {isFinalizing ? "Synthesizing Agent Consensus..." : `Active Agent: ${STAGES[Math.min(currentStageIndex, STAGES.length - 1)]?.name || "Agent"}`}
              </span>
              <span>{isFinalizing ? "Consolidating Findings..." : `${Math.round(((currentStageIndex + 1) / STAGES.length) * 100)}% Complete`}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-500 rounded-full shadow-inner animate-pulse"
                style={{ width: isFinalizing ? "100%" : `${((currentStageIndex + 1) / STAGES.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Executive Real-time Audit Card (Clean & Simple) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                <h4 className="text-sm font-bold text-slate-800">
                  {isFinalizing ? "Generating Executive Audit Dossier..." : "Automated Verification in Progress"}
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                Entity: {companyName || "Vendor"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {STAGES.map((stage, idx) => {
                const Icon = stage.icon;
                const isPast = idx < currentStageIndex;
                const isActive = idx === currentStageIndex;

                let statusBadge = (
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                    Queued
                  </span>
                );

                if (isActive) {
                  statusBadge = (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md flex items-center gap-1 animate-pulse border border-blue-100">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping"></span>
                      Auditing...
                    </span>
                  );
                } else if (isPast) {
                  statusBadge = (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-100">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Verified
                    </span>
                  );
                }

                return (
                  <div
                    key={stage.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isActive
                        ? "bg-blue-50/40 border-blue-200 shadow-xs"
                        : isPast
                        ? "bg-slate-50/60 border-slate-100"
                        : "bg-white border-slate-100 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${isActive ? "bg-blue-100 text-blue-700" : isPast ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{stage.name}</span>
                    </div>
                    {statusBadge}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-center text-xs text-slate-400">
              Cross-referencing global corporate registries, trade watchlists, cybersecurity feeds, and public filings.
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Record Detection Modal */}
      {duplicateMatch && (
        <div 
          onClick={() => setDuplicateMatch(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 relative"
          >
            <button
              onClick={() => setDuplicateMatch(null)}
              className="absolute right-4 top-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Existing Company Record Detected</h3>
                <p className="text-xs text-slate-500">A screening dossier for this entity already exists in the system.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Company Name:</span>
                <span className="font-bold text-slate-900 break-all">{duplicateMatch.companyName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Registered Domain:</span>
                <span className="font-mono text-blue-600 break-all">{duplicateMatch.website}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Vetting Score / Status:</span>
                <span className="font-bold text-slate-900">{duplicateMatch.riskScore}% ({duplicateMatch.riskRating})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Screening Date:</span>
                <span className="text-slate-700">{new Date(duplicateMatch.screenedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Dossier ID:</span>
                <span className="font-mono text-slate-600">{duplicateMatch.id}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              To prevent duplicate records, you can review the existing audit dossier or proceed to perform a fresh re-audit that updates this entity's record in the registry.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDuplicateMatch(null)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {onViewExistingVendor && (
                <button
                  type="button"
                  onClick={() => {
                    const id = duplicateMatch.id;
                    setDuplicateMatch(null);
                    onViewExistingVendor(id);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  <span>Review Existing Dossier</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setDuplicateMatch(null);
                  startScreeningSequence();
                }}
                className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-Audit & Update Record</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
