-- database/schema.sql
-- SQLite schema for legal workflow system

-- Users table for basic authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Legal queries table
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

-- Legal responses table
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

-- Sessions table for simple session management
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_legal_queries_user_id ON legal_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_queries_status ON legal_queries(status);
CREATE INDEX IF NOT EXISTS idx_legal_queries_created_at ON legal_queries(created_at);
CREATE INDEX IF NOT EXISTS idx_legal_responses_query_id ON legal_responses(query_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Sample data for testing
INSERT OR IGNORE INTO users (id, email, name) VALUES 
('user-1', 'test@example.com', 'Test User');

-- Clean up expired sessions (run periodically)
-- DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;