-- Create default organization for existing single-tenant data.
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Organization" ("id", "nombre", "slug", "updatedAt")
VALUES ('default', 'Default', 'default', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

ALTER TABLE "User" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Client" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Operation" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "LogEntry" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Config" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "WhatsAppMessage" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "AgentExecution" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "AgentAction" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "AgentConfig" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'default';

DROP INDEX IF EXISTS "Client_rfc_key";
ALTER TABLE "Config" DROP CONSTRAINT "Config_pkey";

CREATE UNIQUE INDEX "Client_organizationId_rfc_key" ON "Client"("organizationId", "rfc");
ALTER TABLE "Config" ADD CONSTRAINT "Config_pkey" PRIMARY KEY ("organizationId", "key");

CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "Client_organizationId_idx" ON "Client"("organizationId");
CREATE INDEX "Operation_organizationId_idx" ON "Operation"("organizationId");
CREATE INDEX "Operation_organizationId_clientId_idx" ON "Operation"("organizationId", "clientId");
CREATE INDEX "LogEntry_organizationId_idx" ON "LogEntry"("organizationId");
CREATE INDEX "LogEntry_organizationId_clientId_idx" ON "LogEntry"("organizationId", "clientId");
CREATE INDEX "Config_organizationId_idx" ON "Config"("organizationId");
CREATE INDEX "WhatsAppMessage_organizationId_idx" ON "WhatsAppMessage"("organizationId");
CREATE INDEX "WhatsAppMessage_organizationId_clientId_idx" ON "WhatsAppMessage"("organizationId", "clientId");
CREATE INDEX "WhatsAppMessage_organizationId_operationId_idx" ON "WhatsAppMessage"("organizationId", "operationId");
CREATE INDEX "AgentExecution_organizationId_idx" ON "AgentExecution"("organizationId");
CREATE INDEX "AgentAction_organizationId_idx" ON "AgentAction"("organizationId");
CREATE INDEX "AgentAction_organizationId_clientId_idx" ON "AgentAction"("organizationId", "clientId");
CREATE INDEX "AgentAction_organizationId_executionId_idx" ON "AgentAction"("organizationId", "executionId");
CREATE INDEX "AgentConfig_organizationId_idx" ON "AgentConfig"("organizationId");

ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Config" ADD CONSTRAINT "Config_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentConfig" ADD CONSTRAINT "AgentConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
