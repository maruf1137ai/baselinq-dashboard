# 5. Shareable URL Certificates Instead of PDFs

## What it is
Per Werner spec (and explicit client direction in the 2026-05-15 meeting): replace PDF certificate generation with URL-based certificate pages. A signed SI or VO is accessible at a unique URL that renders the certificate as a web page. Anyone with the link can view, print (via browser), or share with lawyers/insurers.

## Why URL over PDF
- No file storage cost
- No PDF generation library / dependency
- Always shows the live signed state (no stale PDFs floating around)
- Permission-checkable at render time
- Browser print is good enough for paper copy

## Current state
- Sign & Issue endpoint records `signed_at`/`signed_by`/`issued_at` (✓)
- No certificate URL exists anywhere
- No PDF generation currently in production (so we're starting clean)

## Target flow
1. SI or VO gets signed (existing endpoint)
2. Backend generates a `certificate_token` (UUID4) and stores it on the entity
3. Certificate is now accessible at `/api/certificates/{token}/` (public) or `/certificates/{type}/{token}/` (frontend route, permission-checked)
4. The "Sign & Issue" success state shows: "Certificate issued — [Copy link] [Open]"
5. Token is non-guessable; revocable by clearing the field

## Backend changes
- Migration: add `certificate_token` (UUIDField, nullable, unique) to SI and VO (and IC / DC if certs apply there too)
- Sign endpoint sets `certificate_token = uuid4()` on issue
- New endpoint `GET /api/certificates/{token}/` returns serialized certificate data (read-only):
  - Document number, type, project, parties, description
  - Approved value, time extension days
  - Signatures with timestamps + signer name/role
  - Audit trail entries
- Permission: anyone authenticated within the project's organization, OR public if token is shared (final decision pending)

## Frontend changes
- New route `/certificates/:type/:token` — renders a clean, print-friendly certificate page
- Page layout: header (logo + cert title), parties block, document details, signature block, footer with timestamps and audit
- Print stylesheet (CSS `@media print`) so browser print produces a clean A4 layout
- On the task detail page after Sign & Issue:
  - "Certificate URL: [copy] [open in new tab]"
  - Remove any PDF download button (none exists currently per the audit)

## Open questions
- Should the certificate URL be **publicly accessible with token alone**, or require auth? **Recommend token = public access** (acts like a sharing link). Token is UUID4 so unguessable.
- Should we support revocation? **Yes — add `certificate_revoked_at` field for future use, but don't build the revoke UI yet.**
- Do we also issue certificates for IC and DC (claims)? **Yes per spec — claims are also legally binding.**
