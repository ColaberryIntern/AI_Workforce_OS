# Directive: Governance

**Source of truth**: [CLAUDE.md](../CLAUDE.md)

## Operational artifacts

- **`tmp/autonomy_log.json`** — append-only log of every meaningful change/decision (timestamp, source, summary, assumptions, confidence, tests added, directives updated, escalation flag)
- **`tmp/escalation.json`** — written when a strategic decision requires the owner
- **`execution/notify_owner.ts`** — escalation channel (Console default; SMS/email plug-ins Phase 4+)
- **`services/worker/src/dailyReport/dailyReport.ts`** — daily exec report from autonomy log + tests + escalations

## Escalation triggers (per CLAUDE.md)

Escalate ONLY for:
- Architecture pattern conflict
- Schema redesign
- External (paid) dependency
- Compliance / security boundary
- Production infra change
- Repeated failure after Diagnostic Mode
- Directive conflict affecting system behavior
- Strategic ambiguity affecting future constraints

## Default-on autonomy

- Implementation-level decisions → proceed (do NOT escalate)
- Up to 5 silent assumptions per iteration, each logged
- > 5 → enter Diagnostic Mode but keep moving toward the next phase

## Definition of Done

- Tests exist and pass
- Directives updated where needed
- No secrets introduced
- Validation scripts pass
- Junior dev can understand the change
- Assumptions logged
- No unresolved governance boundary

## Verification

- Daily report worker produces a valid JSON summary on schedule
- `notify_owner.ts` is callable and produces a deterministic escalation envelope
- Autonomy log is append-only (never edited / deleted)
