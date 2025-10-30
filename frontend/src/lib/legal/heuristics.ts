import { JurisdictionType, LegalDomain, LegalHeuristicResult } from './types';

export interface LegalHeuristic {
  evaluate(context: Record<string, unknown>): Promise<LegalHeuristicResult>;
  name: string;
}

export class JurisdictionalHeuristic implements LegalHeuristic {
  name = 'JurisdictionalHeuristic';
  
  async evaluate(context: Record<string, unknown>): Promise<LegalHeuristicResult> {
    const content = (context.query_content as string || '').toLowerCase();
    const jurisdiction = context.jurisdiction as JurisdictionType || JurisdictionType.STATE;
    const taskId = context.task_id as string || 'N/A';
    
    console.log(`[Task ${taskId}] Evaluating JurisdictionalHeuristic for ${jurisdiction}`);

    const jurisdictionIndicators: Record<string, Record<string, string[]>> = {
      [JurisdictionType.FEDERAL]: {
        "high": ["federal", "constitutional", "u\\.?s\\.? code", "federal register", "suprem\\w+ court"],
        "medium": ["agency", "interstate", "federal court", "circuit court"],
        "low": ["regulation", "statute", "law", "cfr"]
      },
      [JurisdictionType.STATE]: {
        "high": ["state law", "state code", "state court", "supreme court of \\w+"],
        "medium": ["county", "municipal", "local", "state constitution"],
        "low": ["ordinance", "regulation", "statute", "administrative code"]
      },
      [JurisdictionType.INTERNATIONAL]: {
        "high": ["treaty", "international", "convention", "hague"],
        "medium": ["foreign", "multinational", "cross-border", "international court"],
        "low": ["agreement", "protocol", "accord", "foreign law"]
      }
    };

    const patterns = jurisdictionIndicators[jurisdiction] as Record<string, string[]> || jurisdictionIndicators[JurisdictionType.STATE];
    let score = 0.0;
    const findings: string[] = [];
    
    for (const [level, keywords] of Object.entries(patterns)) {
      const matches = keywords.reduce((count: number, pattern: string) => {
        const regex = new RegExp(pattern, 'i');
        return count + (regex.test(content) ? 1 : 0);
      }, 0);
      
      if (matches > 0) {
        if (level === "high") {
          score += matches * 0.5;
        } else if (level === "medium") {
          score += matches * 0.3;
        } else {
          score += matches * 0.2;
        }
        findings.push(`${level}: ${matches} matches`);
      }
    }

    const normalizedScore = Math.min(score, 1.0);
    console.log(`[Task ${taskId}] JurisdictionalHeuristic score: ${normalizedScore}, Findings: ${findings.join(', ')}`);
    
    return {
      score: normalizedScore,
      reason: `Jurisdictional indicators: ${findings.join(', ')}`
    };
  }
}

export class RiskAssessmentHeuristic implements LegalHeuristic {
  name = 'RiskAssessmentHeuristic';
  
  async evaluate(context: Record<string, unknown>): Promise<LegalHeuristicResult> {
    const content = (context.query_content as string || '').toLowerCase();
    const domain = context.domain as LegalDomain || LegalDomain.CORPORATE;
    const taskId = context.task_id as string || 'N/A';
    
    console.log(`[Task ${taskId}] Evaluating RiskAssessmentHeuristic for ${domain}`);

    const riskIndicators: Record<string, Record<string, string[]>> = {
      [LegalDomain.CORPORATE]: {
        "critical": ["fraud", "securities violation", "criminal", "bankruptcy", "insolvency", "class action"],
        "high": ["litigation", "breach", "liability", "penalty", "investigation", "regulatory action"],
        "moderate": ["dispute", "compliance", "regulation", "audit", "termination", "claim"],
        "low": ["review", "update", "routine", "standard", "negotiation"]
      },
      [LegalDomain.LITIGATION]: {
        "critical": ["injunction", "immediate relief", "emergency", "tro", "contempt", "sanctions"],
        "high": ["damages", "deadline", "statute of limitations", "summary judgment", "appeal"],
        "moderate": ["discovery", "motion", "hearing", "deposition", "settlement"],
        "low": ["status", "routine filing", "administrative", "scheduling"]
      },
      [LegalDomain.INTELLECTUAL_PROPERTY]: {
        "critical": ["infringement", "counterfeiting", "trade secret theft", "copyright violation", "injunction"],
        "high": ["cease and desist", "damages", "royalties", "patent application", "trademark opposition"],
        "moderate": ["license", "portfolio review", "filing", "registration", "opposition"],
        "low": ["routine", "monitoring", "search", "maintenance fees", "renewal"]
      },
      [LegalDomain.EMPLOYMENT]: {
        "critical": ["discrimination", "harassment", "wrongful termination", "retaliation", "osha violation"],
        "high": ["wage claims", "overtime", "fmla", "ada accommodation", "worker classification"],
        "moderate": ["policy review", "handbook", "employment agreement", "severance", "review"],
        "low": ["routine", "updates", "benefits", "onboarding", "reporting"]
      },
      [LegalDomain.CONTRACTS]: {
        "critical": ["breach", "termination", "fraud", "force majeure", "rescission"],
        "high": ["damages", "specific performance", "dispute", "indemnification", "warranty"],
        "moderate": ["amendment", "negotiation", "review", "renewal", "assignment"],
        "low": ["routine", "template", "standard", "reference", "draft"]
      },
      [LegalDomain.FAMILY]: {
        "critical": ["emergency custody", "domestic violence", "child abuse", "neglect", "termination of parental rights", "immediate danger"],
        "high": ["custody dispute", "restraining order", "child support enforcement", "visitation rights", "protection order", "contempt"],
        "moderate": ["divorce", "separation", "property division", "spousal support", "modification", "mediation"],
        "low": ["routine filing", "uncontested", "administrative", "documentation", "consultation"]
      }
    };

    const domainRisks = riskIndicators[domain] || riskIndicators[LegalDomain.CORPORATE];
    let riskScore = 0.0;
    const findings: string[] = [];
    
    for (const [level, indicators] of Object.entries(domainRisks)) {
      const matches = indicators.reduce((count, indicator) => {
        const regex = new RegExp(`\\b${indicator}\\b`, 'i');
        return count + (regex.test(content) ? 1 : 0);
      }, 0);
      
      if (matches > 0) {
        if (level === "critical") {
          riskScore += matches * 0.4;
        } else if (level === "high") {
          riskScore += matches * 0.3;
        } else if (level === "moderate") {
          riskScore += matches * 0.2;
        } else {
          riskScore += matches * 0.1;
        }
        findings.push(`${level}: ${matches} indicators`);
      }
    }

    const normalizedScore = Math.min(riskScore, 1.0);
    console.log(`[Task ${taskId}] RiskAssessmentHeuristic score: ${normalizedScore}, Findings: ${findings.join(', ')}`);
    
    return {
      score: normalizedScore,
      reason: `Risk assessment: ${findings.join(', ')}`
    };
  }
}

// Function to get all heuristics
export function getLegalHeuristics(): LegalHeuristic[] {
  return [
    new JurisdictionalHeuristic(),
    new RiskAssessmentHeuristic()
  ];
}