import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'stokvel.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stokvels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    contribution_amount REAL NOT NULL DEFAULT 0,
    contribution_frequency TEXT NOT NULL DEFAULT 'monthly',
    payout_order TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stokvel_users (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stokvel_id INTEGER NOT NULL REFERENCES stokvels(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    PRIMARY KEY (user_id, stokvel_id)
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stokvel_id INTEGER NOT NULL REFERENCES stokvels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    join_date TEXT NOT NULL DEFAULT (date('now')),
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    stokvel_id INTEGER NOT NULL REFERENCES stokvels(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    payment_date TEXT NOT NULL DEFAULT (date('now')),
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'paid',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stokvel_id INTEGER NOT NULL REFERENCES stokvels(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    payout_date TEXT NOT NULL DEFAULT (date('now')),
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS fines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stokvel_id INTEGER NOT NULL REFERENCES stokvels(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    reason TEXT NOT NULL,
    fine_date TEXT NOT NULL DEFAULT (date('now')),
    status TEXT NOT NULL DEFAULT 'outstanding',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stokvel_id INTEGER NOT NULL REFERENCES stokvels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    location TEXT,
    agenda TEXT,
    minutes TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS meeting_attendance (
    meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    attended INTEGER DEFAULT 0,
    PRIMARY KEY (meeting_id, member_id)
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stokvel_id INTEGER NOT NULL REFERENCES stokvels(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    due_date TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    notification_sent INTEGER NOT NULL DEFAULT 0,
    notification_channel TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Safe migrations for existing databases
const existingColumns = (table: string) =>
  (db.prepare(`PRAGMA table_info(${table})`).all() as any[]).map((c: any) => c.name);

const stokvelCols = existingColumns('stokvels');
if (!stokvelCols.includes('owner_id')) {
  db.exec(`ALTER TABLE stokvels ADD COLUMN owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
}
if (!stokvelCols.includes('payout_order')) {
  db.exec(`ALTER TABLE stokvels ADD COLUMN payout_order TEXT NOT NULL DEFAULT '[]'`);
}

const reminderCols = existingColumns('reminders');
if (!reminderCols.includes('notification_sent')) {
  db.exec(`ALTER TABLE reminders ADD COLUMN notification_sent INTEGER NOT NULL DEFAULT 0`);
}
if (!reminderCols.includes('notification_channel')) {
  db.exec(`ALTER TABLE reminders ADD COLUMN notification_channel TEXT`);
}

export default db;
