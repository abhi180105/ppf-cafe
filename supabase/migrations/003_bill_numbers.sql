-- Migration 003: Bill Number Generation (Concurrency-Safe)
-- Created: 2026-10-21
-- Description: Sequence and function for generating unique, date-prefixed bill numbers

-- Sequence for bill numbers (date-prefixed: BILL-20261021-0001)
CREATE SEQUENCE bill_number_seq;

-- Function to generate next bill number
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    seq_val BIGINT;
    date_prefix TEXT;
    bill_num TEXT;
BEGIN
    date_prefix := to_char(CURRENT_DATE, 'YYYYMMDD');
    seq_val := nextval('bill_number_seq');
    bill_num := 'BILL-' || date_prefix || '-' || LPAD(seq_val::TEXT, 4, '0');
    RETURN bill_num;
END;
$$;

-- Default for bills.bill_number
ALTER TABLE bills ALTER COLUMN bill_number SET DEFAULT generate_bill_number();