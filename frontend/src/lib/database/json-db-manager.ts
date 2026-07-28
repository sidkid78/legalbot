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
        const parsed = JSON.parse(content) as DatabaseSchema;

        const { rows, changed } = JSONDatabaseManager.migrateLegalQueries(
          parsed.legal_queries || []
        );
        parsed.legal_queries = rows;

        if (changed) {
          this.data = parsed;
          this.saveDatabase();
          console.log(`Migrated ${rows.length} legal queries to camelCase field names`);
        }

        return parsed;
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

  /**
   * Queries written before the field-naming fix used snake_case keys, while
   * every reader expects the camelCase LegalQuery shape — so `userId` was
   * always undefined and the docket could never match a single record.
   * Rewrite those rows on load so existing matters stay visible.
   */
  private static readonly LEGACY_QUERY_KEYS: Record<string, keyof LegalQuery> = {
    user_id: 'userId',
    requires_research: 'requiresResearch',
    client_info: 'clientInfo',
    related_cases: 'relatedCases',
    task_id: 'taskId',
    error_message: 'errorMessage'
  };

  private static migrateLegalQueries(
    rows: LegalQuery[]
  ): { rows: LegalQuery[]; changed: boolean } {
    let changed = false;

    const migrated = rows.map((row) => {
      const record = { ...row } as Record<string, unknown>;

      for (const [legacy, modern] of Object.entries(
        JSONDatabaseManager.LEGACY_QUERY_KEYS
      )) {
        if (!(legacy in record)) continue;

        if (record[modern] === undefined && record[legacy] !== null) {
          record[modern] = record[legacy];
        }
        delete record[legacy];
        changed = true;
      }

      // `timestamp` was only ever written by updateLegalQueryStatus, so rows
      // that never changed status have none. Fall back to the creation time.
      if (!record.timestamp) {
        record.timestamp = record.updated_at || record.created_at || new Date().toISOString();
        changed = true;
      }

      for (const stale of ['created_at', 'updated_at']) {
        if (stale in record) {
          delete record[stale];
          changed = true;
        }
      }

      return record as unknown as LegalQuery;
    });

    return { rows: migrated, changed };
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
  createLegalQuery(query: LegalQuery): string {
    const id = query.id || crypto.randomUUID();

    // Must match the LegalQuery interface exactly: every reader in the app
    // (the docket, the memorandum, the API) works off these camelCase names.
    const legalQuery: LegalQuery = {
      id,
      userId: query.userId,
      content: query.content,
      domain: query.domain,
      jurisdiction: query.jurisdiction,
      urgency: query.urgency,
      priority: query.priority ?? 3,
      requiresResearch: query.requiresResearch ?? true,
      clientInfo: query.clientInfo ?? {
        name: 'Confidential Client',
        matterNumber: `M-${Date.now()}`
      },
      relatedCases: query.relatedCases,
      documents: query.documents,
      deadline: query.deadline,
      billable: query.billable ?? true,
      taskId: query.taskId,
      status: LegalQueryStatus.PENDING,
      timestamp: query.timestamp || new Date().toISOString()
    };

    this.data.legal_queries.push(legalQuery);
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

