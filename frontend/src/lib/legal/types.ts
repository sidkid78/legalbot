export enum LegalDomain {
    CORPORATE = "corporate_law",
    LITIGATION = "litigation",
    INTELLECTUAL_PROPERTY = "ip_law",
    EMPLOYMENT = "employment_law",
    REAL_ESTATE = "real_estate_law",
    TAX = "tax_law",
    CONTRACTS = "contract_law",
    REGULATORY = "regulatory_compliance",
    FAMILY = "family_law"
  }
  
  export enum JurisdictionType {
    FEDERAL = "federal",
    STATE = "state",
    INTERNATIONAL = "international",
    ADMINISTRATIVE = "administrative",
    APPELLATE = "appellate",
    DISTRICT = "district"
  }
  
  export enum LegalUrgency {
    EMERGENCY = "emergency",  // Immediate action required
    URGENT = "urgent",       // 24-48 hours
    HIGH = "high",          // Within a week
    MEDIUM = "medium",      // Within a month
    LOW = "low"           // No immediate timeline
  }
  
  export enum RiskLevel {
    CRITICAL = "critical",
    HIGH = "high",
    MODERATE = "moderate",
    LOW = "low",
    MINIMAL = "minimal"
  }
  
  export enum WorkflowState {
    RECEIVE_QUERY = "receive_query",
    ANALYZE_JURISDICTION = "analyze_jurisdiction",
    RESEARCH_LAW = "research_law",
    ASSESS_RISK = "assess_risk",
    REVIEW_PRECEDENTS = "review_precedents",
    DRAFT_ADVICE = "draft_advice",
    FINAL_REVIEW = "final_review",
    ERROR = "error"
  }
  
  export interface LegalQuery {
    id?: string;
    content: string;
    domain: LegalDomain;
    jurisdiction: JurisdictionType;
    urgency: LegalUrgency;
    priority: number;  // 1 (critical) to 5 (routine)
    requiresResearch: boolean;
    clientInfo: {
      name: string;
      matterNumber: string;
      [key: string]: string | number | boolean | { [key: string]: string };
    };
    relatedCases?: string[];
    deadline?: string; // ISO date string
    billable: boolean;
    timestamp: string;
    maxTokens?: number;
    temperature?: number;
    userId?: string;
    taskId?: string;
  }
  
  export interface LegalResponse {
    id: string;
    queryId: string;
    content: string;
    riskLevel: RiskLevel;
    jurisdictionAnalysis: {
      type: string;
      keyRequirements: string[];
      filingDeadlines: Record<string, string>;
      specialConsiderations: string[];
      [key: string]: string[] | Record<string, string> | string | number | boolean;
    };
    citations: LegalCitation[];
    recommendations: LegalRecommendation[];
    nextSteps: LegalNextStep[];
    processingTime: number;
    tokenCount: number;
    modelUsed: string;
    billingInfo: {
      aiProcessingHours?: number;
      hourlyRate?: number;
      aiTimeCharge?: number;
      tokenCount?: number;
      estimatedTokenCost?: number;
      totalEstimatedCharge?: number;
      domain?: string;
      timeTrackedSeconds?: number;
      billable?: boolean;
      [key: string]: string | number | boolean | undefined;
    };
    confidentialityNotice: string;
    legalDisclaimer: string;
    taskId?: string;
    createdAt: string;
  }
  
  export interface LegalCitation {
    type: string;
    citation: string;
    components: string[];
  }
  
  export interface LegalRecommendation {
    priority: string;
    action: string;
    timeline: string;
    details: string;
  }
  
  export interface LegalNextStep {
    step: string;
    deadline: string;
    assignee: string;
    relatedRecommendation: string;
    actionItems: string[];
  }
  
  export interface LegalHeuristicResult {
    score: number;
    reason: string;
  }
  
  export interface WorkflowTask {
    id: string;
    query: LegalQuery;
    priority: number;
    timestamp: string;
    state: WorkflowState;
    context: Record<string, string | number | boolean>;
    caseHistory: {
      timestamp: string;
      state: string;
      action: string;
      [key: string]: string | number | boolean;
    }[];
    billableTime: number;
  }