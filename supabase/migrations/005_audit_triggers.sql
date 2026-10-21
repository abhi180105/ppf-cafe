-- Migration 005: Audit Triggers (Sensitive Tables)
-- Created: 2026-10-21
-- Description: Immutable audit trail triggers for financial and sensitive tables

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, new_data, user_id, session_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid(), current_setting('request.jwt.claims', true)::json->>'session_id');
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, user_id, session_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid(), current_setting('request.jwt.claims', true)::json->>'session_id');
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data, user_id, session_id)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid(), current_setting('request.jwt.claims', true)::json->>'session_id');
    END IF;
    RETURN NEW;
END;
$$;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER trg_orders_audit AFTER INSERT OR UPDATE OR DELETE ON orders FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER trg_bills_audit AFTER INSERT OR UPDATE OR DELETE ON bills FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER trg_payments_audit AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER trg_expenses_audit AFTER INSERT OR UPDATE OR DELETE ON expenses FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER trg_refunds_audit AFTER INSERT OR UPDATE OR DELETE ON refunds FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER trg_cafe_settings_audit AFTER INSERT OR UPDATE OR DELETE ON cafe_settings FOR EACH ROW EXECUTE FUNCTION audit_trigger();