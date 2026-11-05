-- =====================================================================
-- STEP 9.3 - Double-entry enforcement: Journal balance constraint
-- =====================================================================
-- Ensures that every POSTED journal entry has SUM(debit) = SUM(credit),
-- enforced at the database level via a DEFERRABLE INITIALLY DEFERRED
-- constraint trigger. This lets an application insert lines one row at a
-- time inside a transaction; the check runs at COMMIT time.
--
-- Rules:
--   * INSERT/UPDATE/DELETE on journal_lines fires the check.
--   * Only entries whose header status is 'POSTED' must balance.
--   * DRAFT entries can be edited freely (no balance requirement).
--   * VOID entries are exempt (their effect is reversed by a separate
--     REVERSAL entry; see JournalSourceType.REVERSAL).
--   * Every line must have (debit >= 0 AND credit >= 0) and
--     (debit = 0 OR credit = 0) - i.e. one side only.
-- =====================================================================

-- 1) Per-line sanity: non-negative amounts and single-sided lines.
ALTER TABLE "journal_lines"
  ADD CONSTRAINT "journal_lines_amounts_check"
  CHECK (
    "debit" >= 0
    AND "credit" >= 0
    AND ("debit" = 0 OR "credit" = 0)
  );

-- 2) Trigger function: verify header balance at COMMIT time.
CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id TEXT;
  v_status   TEXT;
  v_debit    BIGINT;
  v_credit   BIGINT;
BEGIN
  -- Identify the affected entry. On UPDATE we must consider BOTH the old
  -- and new entries (a line could theoretically move between entries).
  IF (TG_OP = 'DELETE') THEN
    v_entry_id := OLD."journalEntryId";
  ELSE
    v_entry_id := NEW."journalEntryId";
  END IF;

  -- Read header status. If the header is not POSTED, skip balance check.
  SELECT status::text INTO v_status
  FROM "journal_entries"
  WHERE id = v_entry_id;

  IF v_status IS NULL OR v_status <> 'POSTED' THEN
    -- Also handle the case where an UPDATE moved a line OUT of a POSTED entry.
    IF (TG_OP = 'UPDATE') THEN
      SELECT status::text INTO v_status
      FROM "journal_entries"
      WHERE id = OLD."journalEntryId";
      IF v_status IS NOT NULL AND v_status = 'POSTED' THEN
        v_entry_id := OLD."journalEntryId";
      ELSE
        RETURN NULL;
      END IF;
    ELSE
      RETURN NULL;
    END IF;
  END IF;

  -- Aggregate the entry's lines.
  SELECT
    COALESCE(SUM("debit"), 0),
    COALESCE(SUM("credit"), 0)
  INTO v_debit, v_credit
  FROM "journal_lines"
  WHERE "journalEntryId" = v_entry_id;

  IF v_debit <> v_credit THEN
    RAISE EXCEPTION
      'Journal entry % is out of balance: debit=% credit=% (difference=%)',
      v_entry_id, v_debit, v_credit, (v_debit - v_credit)
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3) Attach the trigger as a DEFERRABLE INITIALLY DEFERRED constraint.
DROP TRIGGER IF EXISTS journal_lines_balance_check ON "journal_lines";

CREATE CONSTRAINT TRIGGER journal_lines_balance_check
  AFTER INSERT OR UPDATE OR DELETE ON "journal_lines"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION check_journal_balance();