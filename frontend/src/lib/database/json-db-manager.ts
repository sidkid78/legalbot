// lib/database/json-db-manager.ts
// Simple JSON-based database for development (no native dependencies)
import path from 'path';
import fs from 'fs';
import { LegalQuery, LegalQueryStatus, LegalResponse } from '../legal/types';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  legal_queries: LegalQuery[];
  legal_responses: LegalResponse[];
}

export class JSONDatabaseManager {
  private dbPath: string;
  private data: DatabaseSchema;
  private static instance: JSONDatabaseManager | null = null;

  constructor(dbPath?: string) {
    const defaultPath = path.join(process.cwd(), 'data', 'legal_workflow.json');
    this.dbPath = dbPath || defaultPath;
    
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Load or initialize database
    this.data = this.loadDatabase();
    console.log(`JSON database initialized at: ${this.dbPath}`);
  }

  static getInstance(dbPath?: string): JSONDatabaseManager {
    if (!JSONDatabaseManager.instance) {
      JSONDatabaseManager.instance = new JSONDatabaseManager(dbPath);
    }
    return JSONDatabaseManager.instance;
  }

  private loadDatabase(): DatabaseSchema {
    if (fs.existsSync(this.dbPath)) {
      try {
        const content = fs.readFileSync(this.dbPath, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        console.error('Error loading database, creating new:', error);
      }
    }
    
    return {
      users: [],
      sessions: [],
      legal_queries: [],
      legal_responses: []
    };
  }

  private saveDatabase() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  // User management
  createUser(id: string, email: string, name: string): User {
    const user: User = {
      id,
      email,
      name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    this.data.users.push(user);
    this.saveDatabase();
    return user;
  }

  getUserById(id: string): User | null {
    return this.data.users.find(u => u.id === id) || null;
  }

  getUserByEmail(email: string): User | null {
    return this.data.users.find(u => u.email === email) || null;
  }

  // Session management
  createSession(userId: string, expiresInHours: number = 24): Session {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const session: Session = {
      id: sessionId,
      user_id: userId,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    };
    
    this.data.sessions.push(session);
    this.saveDatabase();
    return session;
  }

  getSession(sessionId: string): Session | null {
    const session = this.data.sessions.find(s => s.id === sessionId);
    if (!session) return null;
    
    // Check if expired
    if (new Date(session.expires_at) <= new Date()) {
      this.deleteSession(sessionId);
      return null;
    }
    
    return session;
  }

  deleteSession(sessionId: string): void {
    this.data.sessions = this.data.sessions.filter(s => s.id !== sessionId);
    this.saveDatabase();
  }

  cleanupExpiredSessions(): number {
    const now = new Date();
    const before = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter(s => new Date(s.expires_at) > now);
    const removed = before - this.data.sessions.length;
    if (removed > 0) {
      this.saveDatabase();
    }
    return removed;
  }

  // Legal query management
  createLegalQuery(query: Partial<LegalQuery> & { content: string; domain: string; jurisdiction: string; urgency: string }): string {
    const id = query.id || crypto.randomUUID();
    
    const legalQuery = {
      id,
      user_id: query.userId || null,
      content: query.content,
      domain: query.domain,
      jurisdiction: query.jurisdiction,
      urgency: query.urgency,
      priority: query.priority || 3,
      requires_research: query.requiresResearch || true,
      client_info: query.clientInfo || {},
      related_cases: query.relatedCases || [],
      deadline: query.deadline || null,
      billable: query.billable !== undefined ? query.billable : true,
      max_tokens: query.maxTokens || 2048,
      temperature: query.temperature || 0.3,
      task_id: query.taskId || null,
      status: 'pending',
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    this.data.legal_queries.push(legalQuery as unknown as LegalQuery);
    this.saveDatabase();
    return id;
  }

  getLegalQuery(id: string): LegalQuery | null {
    return this.data.legal_queries.find(q => q.id === id) || null;
  }

  getLegalQueriesByUser(userId: string, limit: number = 10): LegalQuery[] {
    return this.data.legal_queries
      .filter(q => q.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  updateLegalQueryStatus(id: string, status: string, errorMessage?: string): void {
    const query = this.data.legal_queries.find(q => q.id === id);
    if (query) {
      query.status = status as LegalQueryStatus;
      query.errorMessage = errorMessage || undefined;
      query.timestamp = new Date().toISOString();
      this.saveDatabase();
      }
  }

  createLegalResponse(response: Omit<LegalResponse, 'createdAt'> & { createdAt?: string }): void {
    const legalResponse: LegalResponse = {
      id: response.id,
      queryId: response.queryId,
      content: response.content,
      riskLevel: response.riskLevel,
      jurisdictionAnalysis: response.jurisdictionAnalysis,
      citations: response.citations,
      recommendations: response.recommendations,
      nextSteps: response.nextSteps,
      processingTime: response.processingTime,
      tokenCount: response.tokenCount,
      modelUsed: response.modelUsed,
      billingInfo: response.billingInfo,
      confidentialityNotice: response.confidentialityNotice,
      legalDisclaimer: response.legalDisclaimer,
      taskId: response.taskId || undefined,
      createdAt: response.createdAt || new Date().toISOString(),
      functionCalls: response.functionCalls,
      caseLawResults: response.caseLawResults
    };
    
    this.data.legal_responses.push(legalResponse);
    this.saveDatabase();
  }

  getLegalResponse(queryId: string): LegalResponse | null {
    return this.data.legal_responses.find(r => r.queryId === queryId) || null;
  }

  // Database utility methods
  close(): void {
    this.saveDatabase();
  }

  backup(backupPath: string): void {
    fs.copyFileSync(this.dbPath, backupPath);
  }

  getStats(): { queries: number; responses: number; users: number } {
    return {
      queries: this.data.legal_queries.length || 0,
      responses: this.data.legal_responses.length || 0,
      users: this.data.users.length || 0
    };
  }
}

// Singleton export
export const db = JSONDatabaseManager.getInstance();

