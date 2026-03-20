-- ═══════════════════════════════════════════════════════════════════
--  SCHOOL MANAGEMENT SYSTEM — DATABASE SCHEMA
--  Run this on a fresh Supabase database to set up the entire system.
--  All tables, indexes, RLS policies, views and seed data included.
-- ═══════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────
--  SECTION 1 — CORE TABLES
-- ───────────────────────────────────────────────────────────────────

-- Classes (Play Group → Grade 9)
CREATE TABLE classes (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        UNIQUE NOT NULL,
  level      INTEGER     NOT NULL
);

-- Terms
CREATE TABLE terms (
  id     UUID     PRIMARY KEY DEFAULT uuid_generate_v4(),
  year   INTEGER  NOT NULL,
  term   INTEGER  NOT NULL,
  active BOOLEAN  DEFAULT false
);

-- Learners
CREATE TABLE learners (
  id              UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  admission_no    TEXT      UNIQUE NOT NULL,
  first_name      TEXT      NOT NULL,
  last_name       TEXT      NOT NULL,
  gender          TEXT,
  date_of_birth   DATE,
  class_id        UUID      REFERENCES classes(id),
  guardian_phone  VARCHAR(20),
  guardian_phone_2 VARCHAR(20),
  active          BOOLEAN   DEFAULT true,
  graduated       BOOLEAN   DEFAULT false,
  created_at      TIMESTAMP DEFAULT now()
);

-- Fees (standard fee per class per term)
CREATE TABLE fees (
  id        UUID     PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id  UUID     REFERENCES classes(id),
  term_id   UUID     REFERENCES terms(id),
  amount    NUMERIC  NOT NULL
);

-- Payments
--   created_at uses TIMESTAMPTZ so timestamps are timezone-aware
--   (ensures correct local time display without client-side workarounds)
CREATE TABLE payments (
  id            UUID                     PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id    UUID                     REFERENCES learners(id),
  term_id       UUID                     REFERENCES terms(id),
  payment_date  DATE                     NOT NULL,
  reference_no  TEXT,
  amount        NUMERIC                  NOT NULL,
  created_at    TIMESTAMPTZ              DEFAULT now()
);

-- Custom Fees (overrides the standard class fee for individual learners)
--   fee_type: 'full_sponsorship' | 'partial_sponsorship' | 'custom_amount'
CREATE TABLE custom_fees (
  id             UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id     UUID           REFERENCES learners(id)  ON DELETE CASCADE,
  term_id        UUID           REFERENCES terms(id)     ON DELETE CASCADE,
  custom_amount  DECIMAL(10,2)  NOT NULL,
  fee_type       TEXT           NOT NULL,
  reason         TEXT,
  created_at     TIMESTAMPTZ    DEFAULT now(),
  updated_at     TIMESTAMPTZ    DEFAULT now()
);


-- ───────────────────────────────────────────────────────────────────
--  SECTION 2 — SMS TABLES
-- ───────────────────────────────────────────────────────────────────

-- SMS History (log of every bulk send)
CREATE TABLE sms_history (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_type     VARCHAR(50)   NOT NULL,
  message_preview  TEXT          NOT NULL,
  total_recipients INTEGER       NOT NULL DEFAULT 0,
  successful_count INTEGER       NOT NULL DEFAULT 0,
  failed_count     INTEGER       NOT NULL DEFAULT 0,
  status           VARCHAR(20)   DEFAULT 'completed',
  sent_by          UUID          REFERENCES auth.users(id),
  metadata         JSONB,
  created_at       TIMESTAMPTZ   DEFAULT now()
);

-- SMS Templates (reusable message templates)
CREATE TABLE sms_templates (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(100)  NOT NULL,
  template_type     VARCHAR(50)   NOT NULL,
  message_template  TEXT          NOT NULL,
  is_active         BOOLEAN       DEFAULT true,
  created_by        UUID          REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ   DEFAULT now(),
  updated_at        TIMESTAMPTZ   DEFAULT now()
);

-- SMS Config (API keys and provider settings)
CREATE TABLE sms_config (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key   VARCHAR(100)  UNIQUE NOT NULL,
  config_value TEXT,
  is_encrypted BOOLEAN       DEFAULT false,
  updated_by   UUID          REFERENCES auth.users(id),
  updated_at   TIMESTAMPTZ   DEFAULT now()
);


-- ───────────────────────────────────────────────────────────────────
--  SECTION 3 — INDEXES
-- ───────────────────────────────────────────────────────────────────

-- Learners
CREATE INDEX idx_learners_guardian_phone
  ON learners(guardian_phone)
  WHERE guardian_phone IS NOT NULL;

CREATE INDEX idx_learners_guardian_phone_2
  ON learners(guardian_phone_2)
  WHERE guardian_phone_2 IS NOT NULL;

-- Custom fees
CREATE UNIQUE INDEX custom_fees_learner_term_unique
  ON custom_fees(learner_id, term_id);

CREATE INDEX custom_fees_term_id_idx    ON custom_fees(term_id);
CREATE INDEX custom_fees_learner_id_idx ON custom_fees(learner_id);

-- SMS history
CREATE INDEX idx_sms_history_created_at   ON sms_history(created_at DESC);
CREATE INDEX idx_sms_history_message_type ON sms_history(message_type);
CREATE INDEX idx_sms_history_sent_by      ON sms_history(sent_by);


-- ───────────────────────────────────────────────────────────────────
--  SECTION 4 — ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE classes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE learners     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fees  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_config   ENABLE ROW LEVEL SECURITY;

-- All authenticated users have full access to every table
CREATE POLICY "Authenticated full access" ON classes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON terms
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON learners
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON fees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON custom_fees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON sms_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON sms_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON sms_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ───────────────────────────────────────────────────────────────────
--  SECTION 5 — VIEWS
-- ───────────────────────────────────────────────────────────────────

-- Learner fee balances view
--   Joins learners × terms to produce one row per learner per term.
--   Uses custom fee when set, otherwise falls back to the class fee.
--   Filtered to active learners who have at least one guardian phone.
CREATE VIEW learner_fee_balances
WITH (security_invoker = true)
AS
SELECT
  l.id                                                          AS learner_id,
  l.admission_no,
  l.first_name,
  l.last_name,
  l.guardian_phone,
  l.class_id,
  c.name                                                        AS class_name,
  t.id                                                          AS term_id,
  t.year                                                        AS term_year,
  t.term                                                        AS term_number,
  CONCAT('Term ', t.term, ' ', t.year)                         AS term_name,

  -- Amount paid this term
  COALESCE(
    (SELECT SUM(p.amount) FROM payments p
      WHERE p.learner_id = l.id AND p.term_id = t.id), 0)      AS total_paid,

  -- Standard class fee
  COALESCE(
    (SELECT f.amount FROM fees f
      WHERE f.class_id = l.class_id AND f.term_id = t.id
      LIMIT 1), 0)                                              AS standard_fee,

  -- Custom fee (0 when none set)
  COALESCE(
    (SELECT cf.custom_amount FROM custom_fees cf
      WHERE cf.learner_id = l.id AND cf.term_id = t.id
      LIMIT 1), 0)                                              AS custom_fee,

  -- Effective expected amount (custom overrides standard)
  CASE
    WHEN EXISTS (
      SELECT 1 FROM custom_fees cf
        WHERE cf.learner_id = l.id AND cf.term_id = t.id)
    THEN COALESCE(
      (SELECT cf.custom_amount FROM custom_fees cf
        WHERE cf.learner_id = l.id AND cf.term_id = t.id
        LIMIT 1), 0)
    ELSE COALESCE(
      (SELECT f.amount FROM fees f
        WHERE f.class_id = l.class_id AND f.term_id = t.id
        LIMIT 1), 0)
  END                                                           AS total_expected,

  -- Balance (negative = overpaid)
  CASE
    WHEN EXISTS (
      SELECT 1 FROM custom_fees cf
        WHERE cf.learner_id = l.id AND cf.term_id = t.id)
    THEN COALESCE(
      (SELECT cf.custom_amount FROM custom_fees cf
        WHERE cf.learner_id = l.id AND cf.term_id = t.id
        LIMIT 1), 0)
    ELSE COALESCE(
      (SELECT f.amount FROM fees f
        WHERE f.class_id = l.class_id AND f.term_id = t.id
        LIMIT 1), 0)
  END
  - COALESCE(
    (SELECT SUM(p.amount) FROM payments p
      WHERE p.learner_id = l.id AND p.term_id = t.id), 0)      AS balance

FROM       learners l
CROSS JOIN terms    t
JOIN       classes  c ON l.class_id = c.id
WHERE  l.active         = true
  AND  l.guardian_phone IS NOT NULL;


-- ───────────────────────────────────────────────────────────────────
--  SECTION 6 — COLUMN COMMENTS
-- ───────────────────────────────────────────────────────────────────

COMMENT ON COLUMN learners.guardian_phone   IS 'Primary parent/guardian phone number for SMS notifications';
COMMENT ON COLUMN learners.guardian_phone_2 IS 'Secondary parent/guardian phone number (optional)';
COMMENT ON COLUMN learners.graduated        IS 'True when learner has completed Grade 9 and been graduated';
COMMENT ON COLUMN payments.created_at       IS 'Timezone-aware timestamp (Africa/Nairobi). Stored in UTC, displayed in EAT.';
COMMENT ON TABLE  sms_history               IS 'Log of every bulk SMS send operation';
COMMENT ON TABLE  sms_templates             IS 'Reusable message templates for fee reminders and announcements';
COMMENT ON TABLE  sms_config                IS 'SMS provider configuration (API keys, shortcode, etc.)';
COMMENT ON VIEW   learner_fee_balances      IS 'Per-learner fee balances across all terms. Custom fees override class fees.';


-- ───────────────────────────────────────────────────────────────────
--  SECTION 7 — SEED DATA
-- ───────────────────────────────────────────────────────────────────

-- Classes
INSERT INTO classes (name, level) VALUES
  ('Play Group', 0),
  ('PP1',        1),
  ('PP2',        2),
  ('Grade 1',    3),
  ('Grade 2',    4),
  ('Grade 3',    5),
  ('Grade 4',    6),
  ('Grade 5',    7),
  ('Grade 6',    8),
  ('Grade 7',    9),
  ('Grade 8',   10),
  ('Grade 9',   11);

-- Default SMS templates
INSERT INTO sms_templates (name, template_type, message_template) VALUES
  (
    'Default Fee Reminder',
    'fee_reminder',
    'Dear parent/guardian of {{name}} ({{admission_no}}),

Your child has a fee balance of KES {{balance}} for {{term}}.

Please clear the balance at your earliest convenience.

Thank you.'
  ),
  (
    'Urgent Fee Reminder',
    'fee_reminder',
    'URGENT: {{name}} ({{admission_no}}) has an outstanding balance of KES {{balance}} for {{term}}.

Kindly settle this by end of week to avoid inconvenience.

Thank you.'
  ),
  (
    'General Announcement',
    'general',
    'Dear parent/guardian,

[Your message here]

Thank you for your cooperation.'
  ),
  (
    'Event Reminder',
    'event',
    'Dear parent/guardian,

Reminder: [Event Name] will take place on [Date] at [Time].

Please ensure your child is present.'
  );
