-- Discord Notification Triggers
-- Fires the discord-notify Edge Function on key CRM events

-- Enable pg_net for async HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================
-- Trigger function: customers (INSERT + UPDATE)
-- =============================================
CREATE OR REPLACE FUNCTION notify_discord_customers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type', 'INSERT',
      'table', 'customers',
      'record', row_to_json(NEW),
      'old_record', null
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'customers',
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD)
    );
  END IF;

  PERFORM net.http_post(
    url := 'https://tsmfunxvauwcbuxiwfhr.supabase.co/functions/v1/discord-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := payload::text
  );

  RETURN NEW;
END;
$$;

-- =============================================
-- Trigger function: activity_log (INSERT)
-- =============================================
CREATE OR REPLACE FUNCTION notify_discord_activity_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://tsmfunxvauwcbuxiwfhr.supabase.co/functions/v1/discord-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'activity_log',
      'record', row_to_json(NEW),
      'old_record', null
    )::text
  );
  RETURN NEW;
END;
$$;

-- =============================================
-- Trigger function: payments (INSERT)
-- =============================================
CREATE OR REPLACE FUNCTION notify_discord_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://tsmfunxvauwcbuxiwfhr.supabase.co/functions/v1/discord-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'payments',
      'record', row_to_json(NEW),
      'old_record', null
    )::text
  );
  RETURN NEW;
END;
$$;

-- =============================================
-- Attach triggers
-- =============================================

-- New customer
DROP TRIGGER IF EXISTS discord_notify_customer_insert ON customers;
CREATE TRIGGER discord_notify_customer_insert
  AFTER INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION notify_discord_customers();

-- Stage change only
DROP TRIGGER IF EXISTS discord_notify_customer_update ON customers;
CREATE TRIGGER discord_notify_customer_update
  AFTER UPDATE ON customers
  FOR EACH ROW
  WHEN (OLD.current_stage IS DISTINCT FROM NEW.current_stage)
  EXECUTE FUNCTION notify_discord_customers();

-- New activity log entry
DROP TRIGGER IF EXISTS discord_notify_activity_log ON activity_log;
CREATE TRIGGER discord_notify_activity_log
  AFTER INSERT ON activity_log
  FOR EACH ROW
  EXECUTE FUNCTION notify_discord_activity_log();

-- New payment
DROP TRIGGER IF EXISTS discord_notify_payments ON payments;
CREATE TRIGGER discord_notify_payments
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_discord_payments();
