// lib/database/sqlite-manager.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { LegalQuery, LegalResponse } from '../legal/types';

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

export class SQLiteManager {
  private db: Database.Database;
  private static instance: SQLiteManager | null = null;

  constructor(dbPath?: string) {
    const defaultPath = path.join(process.cwd(), 'data', 'legal_workflow.db');
    const finalPath = dbPath || defaultPath;
    
    // Ensure directory exists
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(finalPath);
    this.initializeDatabase();
    
    console.log(`SQLite database initialized at: ${finalPath}`);
  }

  static getInstance(dbPath?: string): SQLiteManager {
    if (!SQLiteManager.instance) {
      SQLiteManager.instance = new SQLiteManager(dbPath);
    }
    return SQLiteManager.instance;
  }

  private initializeDatabase() {
    // Read and execute schema
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      this.db.exec(schema);
    } else {
      // Fallback: create tables inline
      this.createTables();
    }
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS legal_queries (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        content TEXT NOT NULL,
        domain TEXT NOT NULL,
        jurisdiction TEXT NOT NULL,
        urgency TEXT NOT NULL,
        priority INTEGER DEFAULT 3,
        requires_research BOOLEAN DEFAULT 1,
        client_info JSON,
        related_cases JSON,
        deadline DATETIME,
        billable BOOLEAN DEFAULT 1,
        max_tokens INTEGER DEFAULT 2048,
        temperature REAL DEFAULT 0.3,
        task_id TEXT,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS legal_responses (
        id TEXT PRIMARY KEY,
        query_id TEXT NOT NULL,
        content TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        jurisdiction_analysis JSON,
        citations JSON,
        recommendations JSON,
        next_steps JSON,
        processing_time REAL,
        token_count INTEGER,
        model_used TEXT,
        billing_info JSON,
        confidentiality_notice TEXT,
        legal_disclaimer TEXT,
        task_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (query_id) REFERENCES legal_queries(id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_legal_queries_user_id ON legal_queries(user_id);
      CREATE INDEX IF NOT EXISTS idx_legal_queries_status ON legal_queries(status);
      CREATE INDEX IF NOT EXISTS idx_legal_queries_created_at ON legal_queries(created_at);
      CREATE INDEX IF NOT EXISTS idx_legal_responses_query_id ON legal_responses(query_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    `);
  }

  // User management
  createUser(id: string, email: string, name: string): User {
    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, name) 
      VALUES (?, ?, ?)
    `);
    
    stmt.run(id, email, name);
    
    return this.getUserById(id)!;
  }

  getUserById(id: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | null;
  }

  getUserByEmail(email: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) as User | null;
  }

  // Session management
  createSession(userId: string, expiresInHours: number = 24): Session {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at) 
      VALUES (?, ?, ?)
    `);
    
    stmt.run(sessionId, userId, expiresAt.toISOString());
    
    return this.getSession(sessionId)!;
  }

  getSession(sessionId: string): Session | null {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions 
      WHERE id = ? AND expires_at > CURRENT_TIMESTAMP
    `);
    return stmt.get(sessionId) as Session | null;
  }

  deleteSession(sessionId: string): void {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
    stmt.run(sessionId);
  }

  cleanupExpiredSessions(): number {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP');
    const result = stmt.run();
    return result.changes;
  }

  // Legal query management
  createLegalQuery(query: Partial<LegalQuery> & { content: string; domain: string; jurisdiction: string; urgency: string }): string {
    const id = query.id || crypto.randomUUID();
    
    const stmt = this.db.prepare(`
      INSERT INTO legal_queries (
        id, user_id, content, domain, jurisdiction, urgency, priority,
        requires_research, client_info, related_cases, deadline, billable,
        max_tokens, temperature, task_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      query.userId || null,
      query.content,
      query.domain,
      query.jurisdiction,
      query.urgency,
      query.priority || 3,
      query.requiresResearch ? 1 : 0,
      JSON.stringify(query.clientInfo || {}),
      JSON.stringify(query.relatedCases || []),
      query.deadline || null,
      query.billable ? 1 : 0,
      query.maxTokens || 2048,
      query.temperature || 0.3,
      query.taskId || null,
      'pending'
    );
    
    return id;
  }

  getLegalQuery(id: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM legal_queries WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return {
      ...row,
      requires_research: Boolean(row.requires_research),
      billable: Boolean(row.billable),
      client_info: JSON.parse(row.client_info || '{}'),
      related_cases: JSON.parse(row.related_cases || '[]')
    };
  }

  getLegalQueriesByUser(userId: string, limit: number = 10): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM legal_queries 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    
    const rows = stmt.all(userId, limit) as any[];
    
    return rows.map(row => ({
      ...row,
      requires_research: Boolean(row.requires_research),
      billable: Boolean(row.billable),
      client_info: JSON.parse(row.client_info || '{}'),
      related_cases: JSON.parse(row.related_cases || '[]')
    }));
  }

  updateLegalQueryStatus(id: string, status: string, errorMessage?: string): void {
    const stmt = this.db.prepare(`
      UPDATE legal_queries 
      SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    stmt.run(status, errorMessage || null, id);
  }

  // Legal response management
  createLegalResponse(response: Omit<LegalResponse, 'createdAt'> & { createdAt?: string }): void {
    const stmt = this.db.prepare(`
      INSERT INTO legal_responses (
        id, query_id, content, risk_level, jurisdiction_analysis,
        citations, recommendations, next_steps, processing_time,
        token_count, model_used, billing_info, confidentiality_notice,
        legal_disclaimer, task_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      response.id,
      response.queryId,
      response.content,
      response.riskLevel,
      JSON.stringify(response.jurisdictionAnalysis),
      JSON.stringify(response.citations),
      JSON.stringify(response.recommendations),
      JSON.stringify(response.nextSteps),
      response.processingTime,
      response.tokenCount,
      response.modelUsed,
      JSON.stringify(response.billingInfo),
      response.confidentialityNotice,
      response.legalDisclaimer,
      response.taskId || null
    );
  }

  getLegalResponse(queryId: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM legal_responses WHERE query_id = ?');
    const row = stmt.get(queryId) as any;
    
    if (!row) return null;
    
    return {
      ...row,
      jurisdiction_analysis: JSON.parse(row.jurisdiction_analysis),
      citations: JSON.parse(row.citations),
      recommendations: JSON.parse(row.recommendations),
      next_steps: JSON.parse(row.next_steps),
      billing_info: JSON.parse(row.billing_info)
    };
  }

  // Database utility methods
  close(): void {
    this.db.close();
  }

  backup(backupPath: string): void {
    this.db.backup(backupPath);
  }

  getStats(): { queries: number; responses: number; users: number } {
    const queries = this.db.prepare('SELECT COUNT(*) as count FROM legal_queries').get() as { count: number };
    const responses = this.db.prepare('SELECT COUNT(*) as count FROM legal_responses').get() as { count: number };
    const users = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    return {
      queries: queries.count,
      responses: responses.count,
      users: users.count
    };
  }
}

// Singleton export
export const db = SQLiteManager.getInstance();