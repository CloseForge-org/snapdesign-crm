-- Temporarily drop Discord notification triggers until pg_net is enabled
DROP TRIGGER IF EXISTS discord_notify_customer_insert ON public.customers;
DROP TRIGGER IF EXISTS discord_notify_customer_update ON public.customers;
DROP TRIGGER IF EXISTS discord_notify_activity_log ON public.activity_log;
DROP TRIGGER IF EXISTS discord_notify_payments ON public.payments;

DROP FUNCTION IF EXISTS notify_discord_customers();
DROP FUNCTION IF EXISTS notify_discord_activity_log();
DROP FUNCTION IF EXISTS notify_discord_payments();
