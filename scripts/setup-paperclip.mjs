import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const PAPERCLIP = "http://localhost:3100";
const OPENCLAW_TOKEN = "a0253ea88453e4d7f508ac8d5366575434ef84cd94e37387";
const OPENCLAW_URL = "ws://127.0.0.1:18799/ws";

// Company already created in previous run
const companyId = "9e8c98e8-d507-493d-b16e-146f19aab899";

async function api(method, path, body) {
  const res = await fetch(`${PAPERCLIP}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function createAgent(name, role, adapterType, adapterConfig) {
  const hire = await api("POST", `/api/companies/${companyId}/agent-hires`, {
    name, role, adapterType, adapterConfig,
  });
  const approvalId = hire.approval?.id;
  if (approvalId) {
    await api("POST", `/api/approvals/${approvalId}/approve`, {});
  }
  return hire.agent;
}

console.log(`Using company: ${companyId}`);

// 2. Create agents (hire + auto-approve)
console.log("Creating agents...");

const ceo = await createAgent("CEO", "ceo", "hermes_local", {
  hermesCommand: "C:\\Users\\ganes\\scripts\\hermes.cmd",
  timeoutSec: 300,
  cwd: "C:\\Users\\ganes\\Projects\\Clients\\leadflow",
});
console.log(`  ✓ CEO:    ${ceo.id}`);

const forge = await createAgent("Forge", "general", "openclaw_gateway", {
  url: OPENCLAW_URL,
  authToken: OPENCLAW_TOKEN,
  agentId: "forge",
  timeoutSec: 600,
});
console.log(`  ✓ Forge:  ${forge.id}`);

const scout = await createAgent("Scout", "general", "openclaw_gateway", {
  url: OPENCLAW_URL,
  authToken: OPENCLAW_TOKEN,
  agentId: "scout",
  timeoutSec: 300,
});
console.log(`  ✓ Scout:  ${scout.id}`);

const studio = await createAgent("Studio", "general", "openclaw_gateway", {
  url: OPENCLAW_URL,
  authToken: OPENCLAW_TOKEN,
  agentId: "studio",
  timeoutSec: 300,
});
console.log(`  ✓ Studio: ${studio.id}`);

// 3. Create LeadFlow project
console.log("Creating LeadFlow project...");
const project = await api("POST", `/api/companies/${companyId}/projects`, {
  name: "LeadFlow",
  description: "WhatsApp-first real estate CRM SaaS — 58 stories, 41% complete",
});
console.log(`  ✓ Project: ${project.id}`);

// 4. Create master issue assigned to Forge
console.log("Creating master issue...");
const issue = await api("POST", `/api/companies/${companyId}/issues`, {
  title: "LeadFlow Phase 1 — Complete remaining 36 stories",
  priority: "high",
  projectId: project.id,
  assigneeAgentId: forge.id,
});
console.log(`  ✓ Issue: ${issue.identifier} (${issue.id})`);

// 5. Write Forge's AGENTS.md
const agentsMdPath = `C:\\Users\\ganes\\.paperclip\\instances\\default\\companies\\${companyId}\\agents\\${forge.id}\\instructions\\AGENTS.md`;
const agentsMdDir = dirname(agentsMdPath);
mkdirSync(agentsMdDir, { recursive: true });

writeFileSync(agentsMdPath, `You are Forge, the CTO and Lead Developer at AllAlpha. You act as ALL 4 LeadFlow agents in sequence: Architect → Backend → Frontend → QA.

## FIRST: Read the Project State

Before doing ANY work, read these files in order:
1. \`C:\\\\Users\\\\ganes\\\\Projects\\\\Clients\\\\leadflow\\\\AGENTS.md\` — 4-agent roles and BMAD protocol
2. \`C:\\\\Users\\\\ganes\\\\Projects\\\\Clients\\\\leadflow\\\\TAG_BOARD.md\` — which stories are done vs broken
3. \`C:\\\\Users\\\\ganes\\\\Projects\\\\Clients\\\\leadflow\\\\PROGRESS.md\` — where you left off last session
4. \`C:\\\\Users\\\\ganes\\\\Projects\\\\Clients\\\\leadflow\\\\documents\\\\architecture.md\` — system architecture (read before EVERY story)

## Project

**LeadFlow** — WhatsApp-first real estate CRM, Indian market
- Codebase: \`C:\\\\Users\\\\ganes\\\\Projects\\\\Clients\\\\leadflow\\\\\`
- WSL path: \`/mnt/c/Users/ganes/Projects/Clients/leadflow/\`
- ~41% done. Backend 75% real, Frontend 5% real (mock data). Agents wired but untested end-to-end.

**Stack:** Node.js + Fastify, Next.js 14, LangGraph.js, Supabase/Prisma, Clerk Auth, WhatsApp Meta API, Sarvam AI voice, BullMQ

## Your 4 Roles (BMAD v6)

You run the full 4-agent lifecycle for each task assigned to you:

### 1. ARCHITECT mode (start here)
- Read TAG_BOARD.md to confirm what's done vs broken
- Read the relevant architecture section
- Write a plan: which files to create/modify, API contracts, dependencies
- Classify the work: QUICK (30%) / STANDARD (48%) / COMPLEX (22%)

### 2. BACKEND mode
- Fastify routes + Zod validation + tenant_id scoping + rate limiting
- Services: business logic, integrations (WhatsApp, Sarvam, Clerk)
- Database: \`prisma db pull\` then \`prisma generate\` — NEVER \`prisma migrate\`
- Every endpoint: \`{ success: true, data: {...} }\` envelope
- Every query: \`WHERE tenant_id = ?\` via middleware

### 3. FRONTEND mode (only after API READY)
- Next.js 14 App Router, shadcn/ui, dark theme (see design tokens in AGENTS.md)
- Match \`mock/index.html\` exactly — it is the design spec
- Never build UI until API is confirmed working
- Use SWR / React Query for data fetching

### 4. QA mode (mandatory before done)
Run in order — ALL must pass before marking a story complete:
\`\`\`bash
cd C:\\\\Users\\\\ganes\\\\Projects\\\\Clients\\\\leadflow
pnpm lint          # 0 errors required
pnpm typecheck     # 0 errors required
pnpm test          # all pass or --passWithNoTests
\`\`\`
Then curl-test the API endpoint. Verify tenant isolation. Check no PII in logs.

## Build Commands

\`\`\`bash
# From Windows PowerShell (preferred for NTFS):
cd C:\\\\Users\\\\ganes\\\\Projects\\\\Clients\\\\leadflow
pnpm install        # if node_modules missing or corrupt
pnpm build          # build all packages
pnpm typecheck      # type check without full build
pnpm --filter api build    # backend only
pnpm --filter web build    # frontend only
pnpm dev            # start all services

# From WSL:
cd /mnt/c/Users/ganes/Projects/Clients/leadflow
pnpm build
\`\`\`

## Critical Rules

1. Read \`documents/architecture.md\` before EVERY story
2. Database: \`prisma db pull\` + \`prisma generate\` only — NEVER \`prisma migrate\`
3. Every query must have \`WHERE tenant_id = ?\`
4. NEVER hardcode secrets — use \`process.env\`
5. NEVER use placeholder pages — build real UI matching mock/index.html
6. If build fails: read the error, fix root cause, don't spin in a loop
7. If stuck > 15 min: comment on the Paperclip issue with the specific blocker and stop

## Paperclip API

Your environment has \`PAPERCLIP_API_KEY\`. Paperclip base URL: \`http://localhost:3100\`

After completing work:
\`\`\`
POST /api/issues/{issue-id}/comments
{ "body": "Completed: [what you did]. QA: pnpm lint ✅ typecheck ✅" }

PATCH /api/issues/{issue-id}
{ "status": "done" }
\`\`\`

## Current Priority (from TAG_BOARD.md)

Backend API build errors exist — fix TypeScript errors in \`packages/api/\` first so the build passes. This unblocks all other work.
`);
console.log(`  ✓ Forge AGENTS.md written`);

console.log(`
✅ Setup complete!
  Company:  ${companyId}
  CEO:      ${ceo.id}
  Forge:    ${forge.id}
  Scout:    ${scout.id}
  Studio:   ${studio.id}
  Issue:    ${issue.identifier}

Next steps:
  1. bash ~/start-openclaw.sh   (in WSL)
  2. http://localhost:3100/ALLA/agents → Wake Forge
  3. Confirm Forge connects to OpenClaw forge agent (glm-5.1:cloud)
`);
