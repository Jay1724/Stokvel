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
  CREATE TABLE IF NOT EXISTS stokvels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    contribution_amount REAL NOT NULL DEFAULT 0,
    contribution_frequency TEXT NOT NULL DEFAULT 'monthly',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;
