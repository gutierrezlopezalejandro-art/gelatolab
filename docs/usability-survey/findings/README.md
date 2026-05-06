# Hallazgos de auditoría

Esta carpeta acumula reportes generados por:

1. **Claude (perfil D automatizado)** — vía `/usability-review`. Archivo: `YYYY-MM-DD-claude-audit.md`.
2. **Expertos UX humanos** (perfil D real) — uno por evaluador. Archivo: `YYYY-MM-DD-{nombre}.md`.
3. **Affinity mapping post-triangulación** — síntesis cruzada de A+B+C+D. Archivo: `YYYY-MM-DD-affinity.md`.
4. **Logs de resolución** — documenta cómo se resolvió cada hallazgo (commit, archivos, status). Archivo: `YYYY-MM-DD-resolution-log.md`.

La regla de triangulación (research-plan.md §7) define la severidad final. Los reportes individuales son input, no veredicto.

---

## Archivos actuales (2026-05-06)

| Archivo | Contenido |
|---|---|
| [`2026-05-06-claude-audit.md`](2026-05-06-claude-audit.md) | Auditoría completa: 52 hallazgos detectados con severidad, ubicación en código y recomendación |
| [`2026-05-06-resolution-log.md`](2026-05-06-resolution-log.md) | Log de qué se resolvió, cuándo y dónde — 45/52 (87%) resueltos en 12 commits feat(audit) + bump v1.0.8 |
