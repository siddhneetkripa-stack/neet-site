-- NEET CBT engine (taken from the vkcscience.com test system): students, sessions, tests, attempts.
-- Answer keys and solutions live only in this database; the browser gets them after submitting.

CREATE TABLE IF NOT EXISTS students (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub    TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  picture       TEXT,
  phone         TEXT,
  class_year    TEXT,                 -- 11 | 12 | dropper (asked later)
  city          TEXT,
  consent_at    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_student ON sessions(student_id);

CREATE TABLE IF NOT EXISTS tests (
  slug          TEXT PRIMARY KEY,
  exam          TEXT NOT NULL,                  -- neet-chem, neet-phy, neet-bio, neet-full …
  chapter       TEXT,
  meta          TEXT NOT NULL,                  -- JSON: title, subtitle, rules, subject, branch (bilingual)
  access        TEXT NOT NULL DEFAULT 'free',   -- free | paid
  product       TEXT,                           -- pass code that opens a paid test (prices are set later)
  status        TEXT NOT NULL DEFAULT 'live',   -- draft | live | archived
  duration_min  INTEGER NOT NULL,
  marking       TEXT NOT NULL,                  -- JSON {correct, wrong, blank}
  reveal        TEXT NOT NULL DEFAULT 'submit',
  opens_at      TEXT,
  closes_at     TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 100,
  content_hash  TEXT,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
  test_slug   TEXT NOT NULL REFERENCES tests(slug) ON DELETE CASCADE,
  qno         INTEGER NOT NULL,
  qid         TEXT NOT NULL,
  public      TEXT NOT NULL,          -- JSON sent during the exam: id, type, topic, text.{en,hi}.{q,o,status}
  answer      TEXT NOT NULL,          -- JSON {kind: single, index} | {kind: numeric, value, tol}
  solution    TEXT,                   -- JSON {en: {sol, hint, trap}, hi: {...}} — after submit only
  PRIMARY KEY (test_slug, qno)
);

CREATE TABLE IF NOT EXISTS attempts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  test_slug     TEXT NOT NULL REFERENCES tests(slug),
  student_id    INTEGER NOT NULL REFERENCES students(id),
  started_at    TEXT NOT NULL,
  deadline_at   TEXT NOT NULL,
  submitted_at  TEXT,
  lang          TEXT,
  score         REAL,                 -- NULL after an answer-key change: re-marked when next viewed
  correct       INTEGER,
  wrong         INTEGER,
  blank         INTEGER,
  UNIQUE (test_slug, student_id)
);
CREATE INDEX IF NOT EXISTS idx_attempts_test_score ON attempts(test_slug, score);

CREATE TABLE IF NOT EXISTS responses (
  attempt_id  INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  qno         INTEGER NOT NULL,
  ans         TEXT,                   -- option index ("0".."3") or the numeric answer as typed; NULL = cleared
  mark        INTEGER NOT NULL DEFAULT 0,
  visited     INTEGER NOT NULL DEFAULT 0,
  t_ms        INTEGER NOT NULL DEFAULT 0,
  hist        TEXT,                   -- JSON list of saved answers with time, for "changed answers"
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (attempt_id, qno)
);

CREATE TABLE IF NOT EXISTS enrolments (
  student_id  INTEGER NOT NULL REFERENCES students(id),
  product     TEXT NOT NULL,
  source      TEXT NOT NULL,          -- razorpay | manual | school
  payment_ref TEXT,
  amount_paise INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (student_id, product)
);
