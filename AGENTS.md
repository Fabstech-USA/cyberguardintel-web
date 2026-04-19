<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CyberGuardIntel AI - Agent Rules

## Project Overview
CyberGuardIntel AI is a HIPAA compliance automation SaaS built by Fabstech LLC.
HIPAA compliance is a first-class requirement, not an afterthought.

## Critical Rules - Always Follow
1. Every database query MUST include WHERE organizationId = context.organizationId
2. Every mutation MUST call writeAuditLog() after success (HIPAA 164.312(b))
3. NEVER store plaintext credentials. Always use encryptCredentials() from src/lib/crypto.ts
4. All API routes use withTenant middleware from src/lib/tenant.ts
5. AI-generated content is always status: DRAFT until a human approves it
6. All user-facing compliance content has been reviewed by Mwombeki (medical doctor)

## Code Style
- TypeScript strict mode. No 'any' types. No ts-ignore comments.
- All async functions have explicit return types
- All API route inputs validated with Zod before any DB operation
- Server components for data fetching, client components for interactivity
- Use shadcn/ui components. Never write custom CSS except in globals.css
- Use date-fns for all date operations. Never use Date.parse() directly.

## File Naming Conventions
- Pages:      app/(dashboard)/[feature]/page.tsx
- Components: components/[module]/ComponentName.tsx
- API routes: app/api/[module]/route.ts
- Utilities:  src/lib/utility-name.ts

## HIPAA Compliance Reminders
- Evidence files go to S3 via src/lib/s3.ts (SSE-KMS encrypted)
- PHI-adjacent data queries always include organizationId in WHERE
- Audit log entries use format 'resource.verb' e.g. 'policy.approved'
- Signed S3 URLs expire in 900 seconds (15 minutes)
- MFA is enforced by Clerk. Never bypass Clerk auth.
