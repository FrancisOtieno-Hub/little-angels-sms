-- =====================================================
-- LITTLE ANGELS ACADEMY - SCHOOL MANAGEMENT SYSTEM
-- Clean Baseline Schema
-- =====================================================
-- This file reflects the complete, final database state.
-- Run this on a fresh database. For existing databases,
-- use the incremental migrations in migrations/ instead.
-- =====================================================


-- =====================================================
-- EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =====================================================
-- SEQUENCES
-- =====================================================

-- Auto-incrementing receipt numbers (e.g. RCP-01000)
CREATE SEQUENCE IF NOT EXISTS payment_receipt_seq START 1000;


-- =====================================================
-- TABLE: classes
-- Represents school grades/classes in level order.
-- =====================================================

CREATE TABLE classes (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        UNIQUE NOT NULL,
  level      INTEGER     NOT NULL  -- 0 = Play Group, ascending through Grade 9
);

-- Seed data: all classes in level order
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


-- =====================================================
-- TABLE: terms
-- One record per academic term. Only one may be active
-- at a time, enforced by a unique partial index.
-- =====================================================

CREATE TABLE terms (
  id           UUID     PRIMARY KEY DEFAULT uuid_generate_v4(),
  year         INTEGER  NOT NULL,
  term_number  INTEGER  NOT NULL CHECK (term_number BETWEEN 1 AND 3),
  active       BOOLEAN  NOT NULL DEFAULT false,

  CONSTRAINT terms_year_term_unique UNIQUE (year, term_number)
);

-- Enforce only one active term at a time
CREATE UNIQUE INDEX terms_one_active_idx ON terms (active) WHERE active = true;


-- =====================================================
-- TABLE: learners
-- All registered learners, including archived ones.
-- Soft-delete via active = false; graduated = true for
-- learners who have completed Grade 9.
-- =====================================================

CREATE TABLE learners (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  admission_no     TEXT         UNIQUE NOT NULL,
  first_name       TEXT         NOT NULL,
  last_name        TEXT         NOT NULL,
  gender           TEXT         CHECK (gender IN ('Male', 'Female')),
  date_of_birth    DATE,
  class_id         UUID         REFERENCES classes(id) ON DELETE RESTRICT,
  guardian_phone   VARCHAR(20),   -- Primary parent/guardian phone for SMS
  guardian_phone_2 VARCHAR(20),   -- Secondary parent/guardian phone (optional)
  active           BOOLEAN      NOT NULL DEFAULT true,
  graduated        BOOLEAN      NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON COLUMN learners.guardian_phone   IS 'Primary parent/guardian phone number for SMS notifications';
COMMENT ON COLUMN learners.guardian_phone_2 IS 'Secondary parent/guardian phone number (optional)';
COMMENT ON COLUMN learners.active           IS 'false = archived (soft-deleted)';
COMMENT ON COLUMN learners.graduated        IS 'true = completed Grade 9 via promotion';

-- Indexes
CREATE INDEX idx_learners_class_id       ON learners(class_id);
CREATE INDEX idx_learners_active         ON learners(active) WHERE active = true;
CREATE INDEX idx_learners_guardian_phone ON learners(guardian_phone) WHERE guardian_phone IS NOT NULL;
CREATE INDEX idx_learners_guardian_phone2 ON learners(guardian_phone_2) WHERE guardian_phone_2 IS NOT NULL;


-- =====================================================
-- TABLE: fees
-- Standard term fees per class. One record per
-- class+term combination, enforced by unique constraint.
-- =====================================================

CREATE TABLE fees (
  id        UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id  UUID           NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  term_id   UUID           NOT NULL REFERENCES terms(id) ON DELETE RESTRICT,
  amount    NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),

  CONSTRAINT fees_class_term_unique UNIQUE (class_id, term_id)
);

-- Indexes
CREATE INDEX idx_fees_class_id ON fees(class_id);
CREATE INDEX idx_fees_term_id  ON fees(term_id);


-- =====================================================
-- TABLE: custom_fees
-- Overrides the standard class fee for a specific
-- learner in a specific term (sponsorships, discounts).
-- One record per learner+term, enforced by unique index.
-- =====================================================

CREATE TABLE custom_fees (
  id            UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id    UUID           NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  term_id       UUID           NOT NULL REFERENCES terms(id)   ON DELETE CASCADE,
  custom_amount NUMERIC(12, 2) NOT NULL CHECK (custom_amount >= 0),
  fee_type      TEXT           NOT NULL
                               CHECK (fee_type IN (
                                 'full_sponsorship',
                                 'partial_sponsorship',
                                 'custom_amount'
                               )),
  reason        TEXT,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT custom_fees_learner_term_unique UNIQUE (learner_id, term_id)
);

COMMENT ON TABLE  custom_fees            IS 'Per-learner fee overrides (sponsorships, discounts, special arrangements)';
COMMENT ON COLUMN custom_fees.fee_type   IS 'full_sponsorship | partial_sponsorship | custom_amount';

-- Indexes
CREATE INDEX idx_custom_fees_learner_id ON custom_fees(learner_id);
CREATE INDEX idx_custom_fees_term_id    ON custom_fees(term_id);


-- =====================================================
-- TABLE: payments
-- Individual fee payments made by a learner in a term.
-- Each row is one payment transaction.
-- =====================================================

CREATE TABLE payments (
  id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  learner_id   UUID           NOT NULL REFERENCES learners(id) ON DELETE RESTRICT,
  term_id      UUID           NOT NULL REFERENCES terms(id)   ON DELETE RESTRICT,
  payment_date DATE           NOT NULL,
  reference_no TEXT,
  receipt_no   TEXT           NOT NULL DEFAULT
                                'RCP-' || LPAD(nextval('payment_receipt_seq')::TEXT, 5, '0'),
  amount       NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  recorded_by  UUID           REFERENCES auth.users(id),  -- who entered the payment
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
);

COMMENT ON COLUMN payments.receipt_no   IS 'Auto-generated receipt number, e.g. RCP-01000';
COMMENT ON COLUMN payments.recorded_by  IS 'Auth user who recorded this payment';
COMMENT ON COLUMN payments.reference_no IS 'Optional external reference (M-Pesa code, bank ref, etc.)';

-- Indexes
CREATE INDEX idx_payments_learner_id   ON payments(learner_id);
CREATE INDEX idx_payments_term_id      ON payments(term_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);


-- =====================================================
-- TABLE: sms_history
-- Log of every SMS batch sent through the system.
-- =====================================================

CREATE TABLE sms_history (
  id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_type      VARCHAR(50)  NOT NULL
                                 CHECK (message_type IN ('fee_reminder', 'general', 'custom')),
  message_preview   TEXT         NOT NULL,
  total_recipients  INTEGER      NOT NULL DEFAULT 0 CHECK (total_recipients >= 0),
  successful_count  INTEGER      NOT NULL DEFAULT 0 CHECK (successful_count >= 0),
  failed_count      INTEGER      NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  status            VARCHAR(20)  NOT NULL DEFAULT 'completed'
                                 CHECK (status IN ('completed', 'partial', 'failed')),
  sent_by           UUID         REFERENCES auth.users(id),
  metadata          JSONB,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  sms_history          IS 'Audit log of all SMS batches sent through the system';
COMMENT ON COLUMN sms_history.metadata IS 'Extra context: term_id, class_id, phone_numbers, etc.';

-- Indexes
CREATE INDEX idx_sms_history_created_at    ON sms_history(created_at DESC);
CREATE INDEX idx_sms_history_message_type  ON sms_history(message_type);
CREATE INDEX idx_sms_history_sent_by       ON sms_history(sent_by);


-- =====================================================
-- VIEW: learner_fee_balances
-- Consolidated fee balance per learner per term.
-- Uses LEFT JOINs instead of correlated subqueries
-- for significantly better performance at scale.
-- security_invoker = true ensures RLS on base tables
-- is respected when querying through this view.
-- =====================================================

CREATE VIEW learner_fee_balances
WITH (security_invoker = true)
AS
SELECT
  l.id                                          AS learner_id,
  l.admission_no,
  l.first_name,
  l.last_name,
  l.guardian_phone,
  l.guardian_phone_2,
  l.class_id,
  c.name                                        AS class_name,
  t.id                                          AS term_id,
  t.year                                        AS term_year,
  t.term_number,
  CONCAT('Term ', t.term_number, ' ', t.year)   AS term_name,

  -- Total paid this term
  COALESCE(SUM(p.amount), 0)                    AS total_paid,

  -- Standard class fee (0 if not configured yet)
  COALESCE(f.amount, 0)                         AS standard_fee,

  -- Custom fee override (0 if none)
  COALESCE(cf.custom_amount, 0)                 AS custom_fee,

  -- Effective fee: custom takes precedence over standard
  COALESCE(cf.custom_amount, f.amount, 0)       AS total_expected,

  -- Balance (positive = owes money, negative = overpaid)
  COALESCE(cf.custom_amount, f.amount, 0)
    - COALESCE(SUM(p.amount), 0)                AS balance

FROM learners l
CROSS JOIN terms t
JOIN  classes     c  ON  c.id          = l.class_id
LEFT JOIN fees    f  ON  f.class_id    = l.class_id AND f.term_id = t.id
LEFT JOIN custom_fees cf
                     ON  cf.learner_id = l.id       AND cf.term_id = t.id
LEFT JOIN payments p ON  p.learner_id  = l.id       AND p.term_id  = t.id
WHERE l.active = true
GROUP BY
  l.id, l.admission_no, l.first_name, l.last_name,
  l.guardian_phone, l.guardian_phone_2, l.class_id,
  c.name, t.id, t.year, t.term_number,
  f.amount, cf.custom_amount;

COMMENT ON VIEW learner_fee_balances IS
  'Consolidated fee balance per active learner per term. '
  'Custom fees take precedence over standard class fees.';


-- =====================================================
-- ROW LEVEL SECURITY
-- All tables use a simple policy: authenticated users
-- can perform all operations. Extend these policies
-- if role-based access (admin vs. staff) is needed.
-- =====================================================

ALTER TABLE classes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE learners     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees         ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fees  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_history  ENABLE ROW LEVEL SECURITY;

-- classes
CREATE POLICY "Authenticated users: full access"
  ON classes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- terms
CREATE POLICY "Authenticated users: full access"
  ON terms FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- learners
CREATE POLICY "Authenticated users: full access"
  ON learners FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- fees
CREATE POLICY "Authenticated users: full access"
  ON fees FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- custom_fees
CREATE POLICY "Authenticated users: full access"
  ON custom_fees FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- payments
CREATE POLICY "Authenticated users: full access"
  ON payments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- sms_history
CREATE POLICY "Authenticated users: full access"
  ON sms_history FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- =====================================================
-- TRIGGERS
-- Keep updated_at current automatically on any UPDATE.
-- =====================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_learners_updated_at
  BEFORE UPDATE ON learners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_custom_fees_updated_at
  BEFORE UPDATE ON custom_fees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =====================================================
-- END OF SCHEMA
-- =====================================================
