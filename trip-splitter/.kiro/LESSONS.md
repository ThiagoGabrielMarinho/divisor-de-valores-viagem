# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.kiro/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Mapeie autorização de papel para 403 e aplique membership middleware em toda rota que acessa dados de uma viagem.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `backend/routes` · harmful: 0
- features: backend-conta-compartilhada
- evidence: API-17; backend/src/routes/trips.ts:79-93 (backend/routes)
- last seen: 2026-09-22T00:41:43Z

### L-002 - Teste contratos HTTP com status e payload exatos, não apenas exceções de service.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `backend/tests` · harmful: 0
- features: backend-conta-compartilhada
- evidence: API-20; docs/features/backend-conta-compartilhada/validation.md (backend/tests)
- last seen: 2026-09-22T00:41:43Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
