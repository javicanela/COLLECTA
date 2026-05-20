-- Harden multi-tenant data: revoke direct PostgREST/GraphQL access for anon and
-- authenticated roles, and enable RLS on every public table so only the
-- backend (using service_role / direct DB credentials) can read or write.
--
-- Collecta does not expose Supabase JS client from the browser. All access goes
-- through the Express backend with Prisma, which connects with a privileged
-- role that bypasses RLS. Enabling RLS without policies keeps the API surface
-- closed by default if the anon/publishable key ever leaks.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER TABLE "Organization"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Operation"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LogEntry"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Config"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WhatsAppMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentExecution"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentAction"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentConfig"     ENABLE ROW LEVEL SECURITY;
