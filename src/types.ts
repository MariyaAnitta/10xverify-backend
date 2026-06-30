export enum RiskRating {
  GREEN = "GREEN",
  AMBER = "AMBER",
  RED = "RED",
  BLACK = "BLACK"
}

export interface VerificationAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  weight: number; // e.g. 0.25 (25%)
}

export interface AgentResult {
  agentId: string;
  agentName: string;
  score: number; // 0 to 100
  status: "success" | "warning" | "danger" | "critical";
  outputMessage: string;
  evidence: string[]; // List of collected links, text snippets, details
  keyFindings: string[];
}

export interface VendorDetails {
  registrationNumber?: string;
  incorporationDate?: string;
  legalStatus?: string;
  typeOfBusiness?: string;
  directors?: string[];
  shareholders?: string[];
  registeredAddress?: string;
  validatedAddress?: string;
  locationSuitability?: string;
  domainAgeDays?: number;
  domainRegistrar?: string;
  sslSecure?: boolean;
  socialLinks?: string[];
  complianceLicenses?: string[];
  sanctionsRisk?: "None" | "Medium" | "High";
  solvencyStatus?: "Solvent" | "High Risk" | "Insolvent";
  creditScoreEst?: string; // e.g. "A+", "B", "C-"
  adverseMediaFound?: boolean;
}

export interface VendorScreening {
  id: string;
  companyName: string;
  website: string;
  country: string;
  industry: string;
  screenedAt: string;
  screenedBy: string;
  status: "Pending" | "In Progress" | "Completed" | "Approved" | "Rejected";
  riskScore: number; // Weighted average (0 - 100)
  riskRating: RiskRating;
  agentResults: Record<string, AgentResult>;
  details: VendorDetails;
  executiveSummary: string;
  recommendation: string;
  comments: ScreeningComment[];
  isRealTimeResult?: boolean;
}

export interface ScreeningComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totalScreened: number;
  riskDistribution: {
    green: number;
    amber: number;
    red: number;
    black: number;
  };
  pendingVerifications: number;
  approvedCount: number;
  rejectedCount: number;
  industryBreakdown: { name: string; count: number }[];
  complianceAlerts: {
    id: string;
    companyName: string;
    alertType: "license_expiring" | "adverse_media" | "sanction_link" | "location_mismatch";
    severity: "medium" | "high" | "critical";
    description: string;
    date: string;
  }[];
}
