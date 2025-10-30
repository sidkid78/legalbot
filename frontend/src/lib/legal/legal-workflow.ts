// lib/legal/legal-workflow.ts
// Using crypto.randomUUID() instead of uuid package for Next.js compatibility
function generateUUID(): string {
  return crypto.randomUUID();
}
import { 
  LegalQuery, 
  LegalResponse, 
  WorkflowState,
  WorkflowTask,
  LegalDomain,
  JurisdictionType,
  RiskLevel,
  LegalCitation,
  LegalRecommendation,
  LegalNextStep,
} from './types';
import { getLegalGoogleGenAIClient } from './google-genai-client';
import { getLegalHeuristics } from './heuristics';

export class LegalWorkflowService {
  private taskQueue: WorkflowTask[] = [];
  private heuristics = getLegalHeuristics();
  private concurrentLimit = 5; // Maximum concurrent tasks
  private activeTasks = 0; // Track number of active tasks
  
  constructor() {
    console.log('Legal Workflow Service initialized');
  }
  
  addTask(query: LegalQuery): string {
    // Generate ID if not provided
    const taskId = query.taskId || `LT-${Date.now()}-${this.taskQueue.length + 1}`;
    const queryWithId = { ...query, taskId };
    
    const task: WorkflowTask = {
      id: taskId,
      query: queryWithId,
      priority: queryWithId.priority,
      timestamp: queryWithId.timestamp,
      state: WorkflowState.RECEIVE_QUERY,
      context: { task_id: taskId },
      caseHistory: [
        {
          timestamp: new Date().toISOString(),
          state: WorkflowState.RECEIVE_QUERY,
          action: "Query received"
        }
      ],
      billableTime: 0
    };
    
    this.taskQueue.push(task);
    
    // Sort the queue by priority and urgency
    this.sortTaskQueue();
    
    console.log(`Added legal task ${taskId} to queue. Current queue size: ${this.taskQueue.length}`);
    return taskId;
  }

  private sortTaskQueue(): void {
    this.taskQueue.sort((a, b) => {
      // First compare urgency level
      if (a.query.urgency !== b.query.urgency) {
        const urgencyOrder: Record<string, number> = {
          'emergency': 0,
          'urgent': 1,
          'high': 2,
          'medium': 3,
          'low': 4
        };
        return urgencyOrder[a.query.urgency] - urgencyOrder[b.query.urgency];
      }
      
      // If same urgency, compare priority
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // If same priority, compare timestamp
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }

  async processNextTask(): Promise<LegalResponse | null> {
    if (this.taskQueue.length === 0 || this.activeTasks >= this.concurrentLimit) {
      return null;
    }
    
    const task = this.taskQueue.shift();
    if (!task) return null;
    
    this.activeTasks++;
    
    try {
      // Process the task
      const response = await this.processTask(task);
      return response;
    } catch (error) {
      console.error(`Error processing legal task ${task.id}:`, error);
      return null;
    } finally {
      this.activeTasks--;
    }
  }
  
  async processAllTasks(): Promise<LegalResponse[]> {
    const responses: LegalResponse[] = [];
    const processingPromises: Promise<LegalResponse | null>[] = [];
    
    // Start processing tasks up to the concurrent limit
    while (this.taskQueue.length > 0 && processingPromises.length < this.concurrentLimit) {
      const task = this.taskQueue.shift();
      if (task) {
        processingPromises.push(this.processTask(task));
      }
    }
    
    // Wait for all tasks to complete
    const results = await Promise.all(processingPromises);
    
    // Filter out null responses
    for (const result of results) {
      if (result) {
        responses.push(result);
      }
    }
    
    return responses;
  }
  
  private async processTask(task: WorkflowTask): Promise<LegalResponse | null> {
    const taskId = task.id;
    console.log(`Starting processing for legal task ${taskId}`);
    
    try {
      // Update task context
      task.context = {
        ...task.context,
        query_content: task.query.content,
        domain: task.query.domain,
        jurisdiction: task.query.jurisdiction,
        timestamp: task.query.timestamp,
        task_id: taskId
      };
      
      // Add to case history
      task.caseHistory.push({
        timestamp: new Date().toISOString(),
        state: WorkflowState.ANALYZE_JURISDICTION,
        action: "Analysis initiated"
      });
      
      // Apply heuristics
      task.state = WorkflowState.ANALYZE_JURISDICTION;
      console.log(`[Task ${taskId}] Applying legal heuristics`);
      
      const heuristicPromises = this.heuristics.map(h => h.evaluate(task.context));
      const heuristicResults = await Promise.all(heuristicPromises);
      
      const heuristicScores: Record<string, number> = {};
      const riskReasons: string[] = [];
      
      for (let i = 0; i < heuristicResults.length; i++) {
        const { score, reason } = heuristicResults[i];
        heuristicScores[this.heuristics[i].name] = score;
        riskReasons.push(reason);
      }
      
      // Determine risk level
      const riskScore = Object.values(heuristicScores).reduce((sum, score) => sum + score, 0) / 
                        Object.values(heuristicScores).length;
      
      let riskLevel: RiskLevel;
      if (riskScore > 0.75) {
        riskLevel = RiskLevel.CRITICAL;
      } else if (riskScore > 0.55) {
        riskLevel = RiskLevel.HIGH;
      } else if (riskScore > 0.35) {
        riskLevel = RiskLevel.MODERATE;
      } else if (riskScore > 0.15) {
        riskLevel = RiskLevel.LOW;
      } else {
        riskLevel = RiskLevel.MINIMAL;
      }
      
      console.log(`[Task ${taskId}] Risk score: ${riskScore.toFixed(2)}, Risk level: ${riskLevel}`);
      task.context.calculated_risk = riskLevel;
      
      // Process with Azure OpenAI
      task.state = WorkflowState.RESEARCH_LAW;
      task.caseHistory.push({
        timestamp: new Date().toISOString(),
        state: WorkflowState.RESEARCH_LAW,
        action: "Legal research initiated"
      });
      
      console.log(`[Task ${taskId}] Querying Google Gemini for legal analysis`);
      const googleGenAIClient = getLegalGoogleGenAIClient();
      const googleGenAIResult = await googleGenAIClient.processLegalQuery(task.query);
      
      // Extract information and generate outputs
      task.state = WorkflowState.DRAFT_ADVICE;
      task.caseHistory.push({
        timestamp: new Date().toISOString(),
        state: WorkflowState.DRAFT_ADVICE,
        action: "Drafting legal advice"
      });
      
      console.log(`[Task ${taskId}] Extracting citations and generating recommendations`);
      const citations = this.extractCitations(googleGenAIResult.content);
      const recommendations = this.generateRecommendations(
        googleGenAIResult.content, 
        riskLevel, 
        task.query.jurisdiction, 
        task.query.domain
      );
      const nextSteps = this.generateNextSteps(recommendations, task.query.jurisdiction, task.query.deadline);
      
      // Calculate billing information
      let billingInfo: Record<string, string | number | boolean | undefined> = {};
      if (task.query.billable) {
        billingInfo = this.calculateBilling(googleGenAIResult.processingTime, task.query.domain, googleGenAIResult.tokenCount);
        task.billableTime = Number(billingInfo.aiProcessingHours || 0);
      } else {
        billingInfo = { billable: false };
      }
      
      // Generate notices
      const confidentialityNotice = this.generateConfidentialityNotice(task.query);
      const legalDisclaimer = this.generateLegalDisclaimer(task.query.jurisdiction);
      
      // Final review
      task.state = WorkflowState.FINAL_REVIEW;
      task.caseHistory.push({
        timestamp: new Date().toISOString(),
        state: WorkflowState.FINAL_REVIEW,
        action: "Legal analysis completed",
        risk_level: riskLevel,
        model_used: googleGenAIResult.model,
        processing_time: googleGenAIResult.processingTime
      });
      
      console.log(`[Task ${taskId}] Legal task completed successfully`);
      
      // Create response
      const response: LegalResponse = {
        id: generateUUID(),
        queryId: task.query.id || taskId,
        content: googleGenAIResult.content,
        riskLevel,
        jurisdictionAnalysis: this.analyzeJurisdiction(task.query.jurisdiction),
        citations,
        recommendations,
        nextSteps,
        processingTime: googleGenAIResult.processingTime,
        tokenCount: googleGenAIResult.tokenCount,
        modelUsed: googleGenAIResult.model,
        billingInfo,
        confidentialityNotice,
        legalDisclaimer,
        taskId,
        createdAt: new Date().toISOString()
      };
      
      return response;
    } catch (error) {
      console.error(`[Task ${taskId}] Error processing legal task:`, error);
      
      task.state = WorkflowState.ERROR;
      task.caseHistory.push({
        timestamp: new Date().toISOString(),
        state: WorkflowState.ERROR,
        action: "Error processing task",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return null;
    }
  }
  
  private extractCitations(content: string): LegalCitation[] {
    const citations: LegalCitation[] = [];
    
    // Case law pattern - e.g., Smith v. Jones, 123 U.S. 456 (2023)
    const caseLawPattern = /([A-Za-z\s\.,'& -]+)\s+v\.\s+([A-Za-z\s\.,'& -]+),\s+(\d+)\s+([A-Za-z\.]{1,5})\s+(\d+)(?:,\s+\d+)?\s+\((\d{4})\)/g;
    
    // Federal statute pattern - e.g., 42 U.S.C. § 1983
    const statuteUSCPattern = /(\d+)\s+U\.?S\.?C\.?\s+§\s*([\d\-]+(?:[\(a-z\)]+)?)/g;
    
    // State statute pattern - e.g., Cal. Penal Code § 667
    const statuteStatePattern = /([A-Za-z\s]+)\s+(?:Stat\.?|Code|Laws)\s+§\s*([\d\.\-a-z]+)/g;
    
    // Federal regulation pattern - e.g., 40 C.F.R. § 1500.1
    const regulationCFRPattern = /(\d+)\s+C\.?F\.?R\.?\s+§?\s*([\d\.\-]+)/g;
    
    // Constitution pattern - e.g., U.S. Const. amend. XIV, § 1
    const constitutionPattern = /(U\.?S\.?|[\w\s]+)\s+Const\.\s+(?:art\.\s*([IVXLCDM]+)|amend\.\s*([IVXLCDM]+))(?:\s*,\s*§\s*(\d+))?/g;
    
    const patterns: [RegExp, string][] = [
      [caseLawPattern, 'case_law'],
      [statuteUSCPattern, 'statute_usc'],
      [statuteStatePattern, 'statute_state'],
      [regulationCFRPattern, 'regulation_cfr'],
      [constitutionPattern, 'constitution']
    ];
    
    for (const [pattern, citationType] of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const components = match.slice(1).filter(g => g !== undefined);
        citations.push({
          type: citationType,
          citation: match[0].trim(),
          components
        });
      }
    }
    
    console.log(`Extracted ${citations.length} legal citations`);
    return citations;
  }
  
  private generateRecommendations(
    content: string,
    riskLevel: RiskLevel,
    jurisdiction: JurisdictionType,
    domain: LegalDomain
  ): LegalRecommendation[] {
    console.log(`Generating recommendations for risk level: ${riskLevel}, domain: ${domain}`);
    const recommendations: LegalRecommendation[] = [];
    
    // Add recommendations based on risk level
    if (riskLevel === RiskLevel.CRITICAL) {
      recommendations.push({
        priority: "CRITICAL",
        action: "Initiate Emergency Protocol",
        timeline: "Immediate",
        details: "Requires immediate senior counsel review and potential external notifications."
      });
      recommendations.push({
        priority: "CRITICAL",
        action: "Client Crisis Communication",
        timeline: "Within 4 hours",
        details: "Establish secure communication channel with client for urgent updates."
      });
    } else if (riskLevel === RiskLevel.HIGH) {
      recommendations.push({
        priority: "HIGH",
        action: "Formulate Initial Strategy",
        timeline: "Within 24 hours",
        details: "Develop preliminary response strategy and assign lead counsel."
      });
      recommendations.push({
        priority: "HIGH",
        action: "Urgent Client Consultation",
        timeline: "Within 48 hours",
        details: "Schedule detailed discussion of risks, strategy, and required actions."
      });
    } else if (riskLevel === RiskLevel.MODERATE) {
      recommendations.push({
        priority: "MODERATE",
        action: "Detailed Factual Investigation",
        timeline: "Within 3-5 days",
        details: "Gather all relevant documents and witness information."
      });
    }
    
    // Add domain-specific recommendations
    if (domain === LegalDomain.CORPORATE && 
        (riskLevel === RiskLevel.CRITICAL || riskLevel === RiskLevel.HIGH)) {
      recommendations.push({
        priority: "HIGH",
        action: "Board/Executive Briefing",
        timeline: "Within 72 hours",
        details: "Prepare briefing for senior management/board on risks and proposed actions."
      });
    } else if (domain === LegalDomain.LITIGATION) {
      recommendations.push({
        priority: "HIGH",
        action: "Implement Litigation Hold",
        timeline: "Immediate",
        details: "Issue formal litigation hold notice to relevant parties."
      });
      
      if (riskLevel === RiskLevel.CRITICAL || riskLevel === RiskLevel.HIGH) {
        recommendations.push({
          priority: "HIGH",
          action: "Assess Injunctive Relief Options",
          timeline: "Within 48 hours",
          details: "Evaluate grounds for seeking or defending against preliminary injunctions/TROs."
        });
      }
    } else if (domain === LegalDomain.INTELLECTUAL_PROPERTY && 
              (riskLevel === RiskLevel.CRITICAL || riskLevel === RiskLevel.HIGH)) {
      recommendations.push({
        priority: "HIGH",
        action: "Cease and Desist Evaluation",
        timeline: "Within 72 hours",
        details: "Determine appropriateness and strategy for sending/responding to C&D letters."
      });
    } else if (domain === LegalDomain.FAMILY) {
      if (riskLevel === RiskLevel.CRITICAL) {
        recommendations.push({
          priority: "CRITICAL",
          action: "Emergency Custody/Protection Order",
          timeline: "Immediate",
          details: "File emergency motion for custody or protection order to ensure safety."
        });
      } else if (riskLevel === RiskLevel.HIGH) {
        recommendations.push({
          priority: "HIGH",
          action: "Custody Evaluation",
          timeline: "Within 48 hours",
          details: "Assess custody arrangements and prepare necessary documentation."
        });
      }
      recommendations.push({
        priority: "MODERATE",
        action: "Client Support Coordination",
        timeline: "Within 5 days",
        details: "Coordinate with family services, counselors, or mediators as appropriate."
      });
    }
    
    console.log(`Generated ${recommendations.length} recommendations`);
    return recommendations;
  }
  
  private generateNextSteps(
    recommendations: LegalRecommendation[],
    jurisdiction: JurisdictionType,
    deadline?: string
  ): LegalNextStep[] {
    console.log(`Generating next steps based on ${recommendations.length} recommendations`);
    const nextSteps: LegalNextStep[] = [];
    const assignedCounsel = "Lead Counsel"; // Default assignee
    const legalTeam = "Legal Team";
    const caseManager = "Case Manager";
    
    // Convert recommendations to next steps
    for (const rec of recommendations) {
      const stepInfo: LegalNextStep = {
        step: `${rec.priority} Priority: ${rec.action}`,
        deadline: rec.timeline,
        assignee: rec.priority === "CRITICAL" || rec.priority === "HIGH" ? assignedCounsel : legalTeam,
        relatedRecommendation: rec.action,
        actionItems: []
      };
      
      // Add action items based on recommendation
      if (rec.action.includes("Emergency Protocol")) {
        stepInfo.actionItems = [
          "Activate crisis response team", 
          "Notify insurance carrier (if applicable)", 
          "Secure relevant systems/data"
        ];
      } else if (rec.action.includes("Strategy")) {
        stepInfo.actionItems = [
          "Conduct initial case assessment", 
          "Identify key legal issues", 
          "Outline potential defenses/claims"
        ];
      } else if (rec.action.includes("Litigation Hold")) {
        stepInfo.actionItems = [
          "Draft and issue hold notice", 
          "Identify custodians of relevant data", 
          "Confirm receipt and compliance"
        ];
      } else {
        // Default action items if none of the specific cases match
        stepInfo.actionItems = [
          "Review all relevant documentation",
          "Consult with appropriate team members",
          "Schedule follow-up meeting to review progress"
        ];
      }
      
      nextSteps.push(stepInfo);
    }
    
    // Add jurisdiction-specific steps
    if (jurisdiction === JurisdictionType.FEDERAL) {
      nextSteps.push({
        step: "Review Federal Rules and Local Procedures",
        deadline: "Ongoing",
        assignee: legalTeam,
        relatedRecommendation: "Jurisdictional Compliance",
        actionItems: [
          "Confirm FRCP applicability", 
          "Check specific district/judge local rules", 
          "Verify ECF filing requirements"
        ]
      });
    }
    
    // Add deadline-driven steps
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const daysUntilDeadline = Math.max(0, Math.floor((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      
      const priority = daysUntilDeadline < 3 ? "CRITICAL" : 
                      daysUntilDeadline < 14 ? "HIGH" : "MODERATE";
      
      nextSteps.push({
        step: `${priority} Priority: Meet External Deadline`,
        deadline,
        assignee: caseManager,
        relatedRecommendation: "Deadline Management",
        actionItems: [
          "Confirm deadline accuracy",
          "Allocate resources for completion",
          `Schedule internal review ${Math.max(1, Math.floor(daysUntilDeadline / 2))} days prior`
        ]
      });
    }
    
    console.log(`Generated ${nextSteps.length} next steps`);
    return nextSteps;
  }
  
  private calculateBilling(
    processingTime: number, 
    domain: LegalDomain, 
    tokenCount: number
  ): Record<string, string | number | boolean | undefined> {
    // Define hourly rates for different domains
    const hourlyRates: Record<string, number> = {
      [LegalDomain.CORPORATE]: 500,
      [LegalDomain.LITIGATION]: 450,
      [LegalDomain.INTELLECTUAL_PROPERTY]: 525,
      [LegalDomain.EMPLOYMENT]: 400,
      [LegalDomain.REAL_ESTATE]: 375,
      [LegalDomain.TAX]: 550,
      [LegalDomain.CONTRACTS]: 425,
      [LegalDomain.REGULATORY]: 475,
      [LegalDomain.FAMILY]: 350
    };
    
    // Cost per 1k tokens (example value)
    const costPer1kTokens = 0.01;
    
    // Calculate billable time in hours (minimum 0.1 hours)
    const aiProcessingHours = Math.max(processingTime / 3600, 0.1);
    
    // Get hourly rate for the domain
    const hourlyRate = hourlyRates[domain] || 400;
    
    // Calculate costs
    const aiTimeCharge = aiProcessingHours * hourlyRate;
    const tokenCharge = (tokenCount / 1000) * costPer1kTokens;
    const totalCharge = aiTimeCharge + tokenCharge;
    
    return {
      aiProcessingHours: Number(aiProcessingHours.toFixed(2)),
      hourlyRate,
      aiTimeCharge: Number(aiTimeCharge.toFixed(2)),
      tokenCount,
      estimatedTokenCost: Number(tokenCharge.toFixed(4)),
      totalEstimatedCharge: Number(totalCharge.toFixed(2)),
      domain,
      timeTrackedSeconds: Number(processingTime.toFixed(2))
    };
  }
  
  private analyzeJurisdiction(jurisdiction: JurisdictionType): {
    type: string;
    keyRequirements: string[];
    filingDeadlines: Record<string, string>;
    specialConsiderations: string[];
    [key: string]: string[] | Record<string, string> | string | number | boolean;
  } {
    console.log(`Analyzing jurisdiction: ${jurisdiction}`);
    
    // Define jurisdiction data
    const jurisdictionData: Record<string, {
      keyRequirements: string[];
      filingDeadlines: Record<string, string>;
      specialConsiderations: string[];
    }> = {
      [JurisdictionType.FEDERAL as string]: {
        keyRequirements: [
          "Federal court admission",
          "ECF/PACER registration",
          "Adherence to FRCP & Local Rules"
        ],
        filingDeadlines: {
          "answer": "21 days",
          "appeal": "30 days (most cases)",
          "motion_response": "14 days"
        },
        specialConsiderations: [
          "Potential MDL proceedings",
          "Specific judge's rules",
          "Circuit court precedent"
        ]
      },
      [JurisdictionType.STATE as string]: {
        keyRequirements: [
          "State bar membership",
          "Pro Hac Vice (if applicable)",
          "State-specific procedural rules"
        ],
        filingDeadlines: {
          "answer": "Varies by state (e.g., 20-30 days)",
          "appeal": "Varies (e.g., 30-60 days)",
          "motion_response": "Varies"
        },
        specialConsiderations: [
          "Local counsel rules",
          "Varying discovery limits",
          "State constitutional issues"
        ]
      },
      [JurisdictionType.INTERNATIONAL as string]: {
        keyRequirements: [
          "Foreign jurisdiction licensing",
          "Treaty compliance",
          "Local counsel requirement"
        ],
        filingDeadlines: {
          "response": "Varies widely by country",
          "appeal": "Varies widely by country",
          "submission": "Varies widely by country"
        },
        specialConsiderations: [
          "Language requirements",
          "Jurisdictional conflicts",
          "Enforcement challenges"
        ]
      }
    };
    
    // Get data for the specified jurisdiction or default
    const analysis = jurisdictionData[jurisdiction as string] || {
      keyRequirements: ["N/A - Data not available"],
      filingDeadlines: {},
      specialConsiderations: ["Requires specific research"]
    };
    
    // Ensure type is always set
    return {
      type: jurisdiction,
      keyRequirements: (analysis as { keyRequirements: string[] }).keyRequirements || [],
      filingDeadlines: (analysis as { filingDeadlines: Record<string, string> }).filingDeadlines || {},
      specialConsiderations: (analysis as { specialConsiderations: string[] }).specialConsiderations || []
    };
  }
  
  private generateConfidentialityNotice(query: LegalQuery): string {
    const clientName = query.clientInfo.name || 'the intended recipient';
    const matter = query.clientInfo.matterNumber || 'Confidential Matter';
    
    return `**CONFIDENTIAL AND PRIVILEGED LEGAL COMMUNICATION**

**Attorney Work Product**

This communication is protected by the attorney-client privilege and/or work product doctrine. It is intended solely for the use of ${clientName} regarding matter ${matter}. Any unauthorized review, use, disclosure, dissemination, or distribution is strictly prohibited. If you are not the intended recipient, please notify the sender immediately and destroy all copies.`;
  }
  
  private generateLegalDisclaimer(jurisdiction: JurisdictionType): string {
    return `**LEGAL DISCLAIMER**

This analysis pertains specifically to the laws of the ${jurisdiction} jurisdiction as understood on ${new Date().toISOString().split('T')[0]}. Laws and regulations are subject to change. This communication provides legal analysis based on the information provided and AI processing; it does not constitute definitive legal advice for any specific situation and does not create an attorney-client relationship unless one already exists via separate agreement. Consult qualified legal counsel licensed in the relevant jurisdiction(s) for advice tailored to specific circumstances.`;
  }
}

// Singleton instance
let legalWorkflowService: LegalWorkflowService | null = null;

export function getLegalWorkflowService(): LegalWorkflowService {
  if (!legalWorkflowService) {
    legalWorkflowService = new LegalWorkflowService();
  }
  
  return legalWorkflowService;
}