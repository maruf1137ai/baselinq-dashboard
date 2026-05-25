# 3. Insurance Broker Notification on High-Risk Claim

## What it is
When a PM marks a claim's risk as `HIGH`, the insurance broker linked to the responding professional must be notified — in-app + email. The handler exists but the notification type and "already-notified" flag are missing, so it silently no-ops.

## Current state
- `User.insurance_broker_email` and `insurance_broker_name` exist (✓)
- `tasks/broker.py::notify_broker_on_high_risk_ic()` exists (✓)
- Called from `tasks/views_werner.py` on risk transition to HIGH (✓)
- **Missing:** `Notification.Type.BROKER_NOTIFIED` enum entry
- **Missing:** `DelayClaim.broker_notified` boolean flag (prevents duplicate fires)

## Target flow
1. PM sets risk = HIGH on an Intention to Claim (existing UI)
2. Backend checks: `if not claim.broker_notified and risk == HIGH:`
3. Look up `respondent_user.insurance_broker_email`
4. If broker email set:
   - Send email (template: claim summary, project, professional, risk level)
   - Create in-app `Notification` (type=`BROKER_NOTIFIED`) targeted at the respondent for visibility
   - Set `claim.broker_notified = True`
5. If broker email NOT set: log warning, raise admin notification

## Backend changes
- Migration on `notification`: add `BROKER_NOTIFIED` to `Notification.Type` choices
- Migration on `tasks`: add `broker_notified` boolean (default False) to `IntentionToClaim` and `DelayClaim`
- Update `notify_broker_on_high_risk_ic`:
  - Check `broker_notified` flag first
  - On success, set `broker_notified = True` and save
- Email template `templates/email/broker_high_risk_claim.html`
- Audit trail entry: `broker_notified` event

## Frontend changes
None directly — the in-app notification flows through existing notification infra. (Optional: render a small "Broker notified" badge on the claim detail page once `broker_notified=True`.)

## Open questions
- Who's the email "from" address? **Decision needed.** Likely `noreply@baselinq.com` with reply-to set to the PM.
- Should the broker also get a portal account, or is email enough? **Out of scope for now — email only, portal later.**
