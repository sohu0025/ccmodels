import Database from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';
import { DB_FILENAME } from '@ccmodels/shared';

let db: Database.Database;

export function initDatabase(): void {
  if (db) return; // Already initialized

  const dbPath = path.join(app.getPath('userData'), DB_FILENAME);
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'custom',
      api_type TEXT NOT NULL DEFAULT 'openai',
      api_base TEXT NOT NULL,
      api_key TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      cli_urls TEXT NOT NULL DEFAULT '{}',
      headers TEXT NOT NULL DEFAULT '{}',
      models TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 0,
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usage_records (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      cache_hit_tokens INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      cli_tool TEXT NOT NULL,
      session_id TEXT,
      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      cli_tool TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      provider_name TEXT NOT NULL DEFAULT '',
      model_id TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      message_count INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      summary TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS session_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
      content TEXT NOT NULL DEFAULT '',
      tokens INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      metadata TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_session_messages_session ON session_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_records(timestamp);
    CREATE INDEX IF NOT EXISTS idx_usage_provider ON usage_records(provider_id);

    CREATE TABLE IF NOT EXISTS speed_tests (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL DEFAULT '',
      latency_ms REAL NOT NULL,
      success INTEGER NOT NULL DEFAULT 1,
      error_message TEXT DEFAULT '',
      tested_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_speed_tests_provider ON speed_tests(provider_id, tested_at);

    CREATE TABLE IF NOT EXISTS budget_alerts (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL,
      total_cost REAL NOT NULL DEFAULT 0,
      limit_amount REAL NOT NULL DEFAULT 0,
      threshold_pct INTEGER NOT NULL DEFAULT 80,
      notified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_month ON budget_alerts(month);

    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      transport TEXT NOT NULL CHECK(transport IN ('stdio','http','sse')),
      command TEXT,
      args TEXT DEFAULT '[]',
      url TEXT,
      headers TEXT DEFAULT '{}',
      env_vars TEXT DEFAULT '{}',
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '0.1.0',
      description TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL,
      install_path TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      config TEXT NOT NULL DEFAULT '{}',
      installed_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      target TEXT NOT NULL CHECK(target IN ('claude','gemini','codex','all')),
      is_active INTEGER NOT NULL DEFAULT 1,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('INSERT','UPDATE','DELETE')),
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced_at, retry_count);

    CREATE TABLE IF NOT EXISTS compare_tests (
      id TEXT PRIMARY KEY,
      prompt TEXT NOT NULL,
      models TEXT NOT NULL DEFAULT '[]',
      responses TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      task_type TEXT NOT NULL,
      recommended_model TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      usage_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ads (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('popup','corner','text')),
      title TEXT NOT NULL DEFAULT '',
      html_content TEXT NOT NULL DEFAULT '',
      text_content TEXT NOT NULL DEFAULT '',
      link_url TEXT NOT NULL DEFAULT '',
      width INTEGER NOT NULL DEFAULT 0,
      height INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  migrateSchema();
  insertDefaultSettings();
}

function migrateSchema(): void {
  // Add api_type column if missing (pre-1.0 databases)
  try {
    db.exec('ALTER TABLE providers ADD COLUMN api_type TEXT NOT NULL DEFAULT \'openai\'');
  } catch {
    // Column already exists — ignore
  }
  // Add website column if missing
  try {
    db.exec('ALTER TABLE providers ADD COLUMN website TEXT NOT NULL DEFAULT \'\'');
  } catch {
    // Column already exists — ignore
  }
  // Add link_url column to ads if missing
  try {
    db.exec('ALTER TABLE ads ADD COLUMN link_url TEXT NOT NULL DEFAULT \'\'');
  } catch {
    // Column already exists — ignore
  }
  // Clean up any remaining seed ads from early development
  db.exec("DELETE FROM ads WHERE id LIKE 'seed-%'");
}

function insertDefaultSettings(): void {
  const defaults: Record<string, string> = {
    theme: 'system',
    locale: 'zh-CN',
    autoStart: 'false',
    lightweightMode: 'false',
    proxyPort: '15721',
    autoConfigCli: 'true',
    mcpAutoStart: 'true',
    syncEnabled: 'false',
    syncInterval: '60',
    syncServerUrl: 'http://localhost:3000',
    syncAuthToken: '',
    monthlyBudgetLimit: '50',
    budgetNotifyThreshold: '80',
    speedTestInterval: '30',
  };

  const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaults)) {
    stmt.run(key, value);
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = undefined as unknown as Database.Database;
  }
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}
