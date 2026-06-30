import React, { useState, useEffect } from "react";
import { Play, CheckCircle, Shield, AlertTriangle, Cpu, Globe, Search, Navigation, Award, MessageSquare, DollarSign } from "lucide-react";
import { VendorScreening } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ScreeningPortalProps {
  onScreeningComplete: (newVendor: VendorScreening) => void;
}

const STAGES = [
  { id: "corporate", name: "Company Verification Agent", icon: Shield, log: "Connecting to company registry..." },
  { id: "digital", name: "Digital Presence Agent", icon: Globe, log: "Analyzing website & domains..." },
  { id: "location", name: "Location Verification Agent", icon: Navigation, log: "Resolving GPS & address..." },
  { id: "regulatory", name: "Regulatory Compliance Agent", icon: Award, log: "Auditing compliance licenses..." },
  { id: "reputation", name: "Reputation Agent", icon: MessageSquare, log: "Scanning adverse media databases..." },
  { id: "financial", name: "Financial Assessment Agent", icon: DollarSign, log: "Calculating solvency indicators..." },
  { id: "risk", name: "Risk Intelligence Agent", icon: Cpu, log: "Consolidating risk intelligence..." }
];

export default function ScreeningPortal({ onScreeningComplete }: ScreeningPortalProps) {
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("United States");
  const [customCountry, setCustomCountry] = useState("");
  const [industry, setIndustry] = useState("Healthcare");
  const [customIndustry, setCustomIndustry] = useState("");
  const [screenedBy, setScreenedBy] = useState("M. Anitta");

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

  // Simulates ticker logs running in the background for active agent
  useEffect(() => {
    if (!isRunning) return;

    let logCounter = 0;
    const stage = STAGES[currentStageIndex];
    
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !website.trim()) {
      setErrorMessage("Please supply a valid Company Name and Domain/Website address.");
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

    setErrorMessage("");
    setIsRunning(true);
    setIsFinalizing(false);
    setCurrentStageIndex(0);
    setTickerLogs([`[SYSTEM] Digital workforce initiated for ${companyName}.`]);
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

      const response = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          website,
          country: finalCountry,
          industry: finalIndustry,
          screenedBy
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
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Company Name</label>
              <input
                type="text"
                placeholder="e.g. Novartis Pharmaceuticals"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-850 placeholder:text-slate-400"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
              <p className="text-xxs text-slate-400">Type "Veloce" or "Uralchim" to test high-risk simulation pathways.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Company Website/Domain</label>
              <input
                type="text"
                placeholder="e.g. novartis.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-850 placeholder:text-slate-400"
                value={website}
                onChange={e => setWebsite(e.target.value)}
              />
              <p className="text-xxs text-slate-400">Type "fake-phish.net" to trigger digital alert validations.</p>
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
                {isFinalizing ? "Synthesizing Agent Consensus..." : `Active Agent: ${STAGES[currentStageIndex].name}`}
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

          {/* Real-time Agent Log Terminal */}
          <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 border border-slate-800 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-slate-400 text-xxs flex items-center gap-1">
                <span className="w-2 justify-center h-2 bg-red-500 rounded-full inline-block animate-pulse"></span>
                LIVE AGENT TELEMETRY FEED
              </span>
              <span className="text-xxs text-slate-500">Node: Sandbox-Ingress-Primary</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto flex flex-col-reverse">
              {tickerLogs.map((log, idx) => {
                let color = "text-slate-300";
                if (log.includes("[INFO]")) color = "text-blue-400";
                if (log.includes("[OK]")) color = "text-emerald-400";
                if (log.includes("[PROCESS]")) color = "text-indigo-300";
                if (log.includes("[ACTION]")) color = "text-amber-300";
                if (log.includes("[SYSTEM]")) color = "text-purple-300";

                return (
                  <div key={idx} className={`${color} leading-relaxed break-all`}>
                    <span className="text-slate-600 mr-1.5">[{new Date().toLocaleTimeString()}]</span>
                    {log}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
