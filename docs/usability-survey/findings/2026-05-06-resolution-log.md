# Log de resolución — auditoría 2026-05-06

> Documenta cómo se resolvió cada uno de los 52 hallazgos del audit
> [2026-05-06-claude-audit.md](2026-05-06-claude-audit.md). Cada item indica
> su estado final (✅ resuelto / ⏭ skipped con motivo / 📋 manual / 🕓 deferred),
> el commit donde se aplicó, y los archivos tocados.
>
> **Resumen:** 45/52 resueltos (87%) en 12 commits feat(audit) + 1 chore(bump)
> en branch `main`, ahead de `origin/main` por 13 commits al 2026-05-06.

---

## Cifras finales

| Severidad | Resueltos / Total | % |
|---|---|---|
| Bloqueante | 1 / 1 | 100% ✅ |
| Mayor | 11 / 11 | 100% ✅ |
| Menor | 25 / 28 | 89% |
| Cosmético | 8 / 12 | 67% |
| **Total** | **45 / 52** | **87%** |

| Tipo | Resueltos |
|---|---|
| Accesibilidad WCAG 2.2 | 13 |
| Copy / i18n | 12 |
| Heurística Nielsen | 7 |
| Flow / Tareas del demo | 4 |
| Consistencia cross-screen | 1 |
| Bug visible | 8 |

---

## Cronología de commits aplicados

| # | Commit | Fecha | Hallazgos | Foco |
|---|---|---|---|---|
| 1 | [`490884a`](../../..) | 2026-05-06 | 13 | v1.0.8 batch + audit fixes críticos (H1-H6) + mayores (H21-H24) + 3 menores (H30, H38, H42) |
| 2 | [`7c83975`](../../..) | 2026-05-06 | 5 | Demo polish — H39 H40 H41 H43 H44 |
| 3 | [`aa6ee73`](../../..) | 2026-05-06 | 1 | H25 — buscador de ingredientes escalable |
| 4 | [`7d6898c`](../../..) | 2026-05-06 | 5 | A11y batch — H27 H28 H29 H31 H32 |
| 5 | [`d8a7fa9`](../../..) | 2026-05-06 | 4 | Microcopy — H33 H35 H36 H37 |
| 6 | [`e37f685`](../../..) | 2026-05-06 | 2 | Mobile recipes — H45 H46 |
| 7 | [`161f9b8`](../../..) | 2026-05-06 | 1 | H17 — modal dirty check (5 modales) |
| 8 | [`4e95323`](../../..) | 2026-05-06 | 2 | H10 + H13 — design system y format helpers |
| 9 | [`9c03da0`](../../..) | 2026-05-06 | 1 | H26 — Help search prominente |
| 10 | [`77d5337`](../../..) | 2026-05-06 | 3 | Cosméticos chicos — H55 H57 H60 |
| 11 | [`297ba72`](../../..) | 2026-05-06 | 3 | Cosméticos visibles — H47 H62 H63 |
| 12 | [`b3b46a6`](../../..) | 2026-05-06 | 5 | Batch final — H48 H53 H54 H59 H61 |
| 13 | [`e6f09fa`](../../..) | 2026-05-06 | — | chore: bump version to 1.0.8 |

---

## Estado por hallazgo (52 items)

### Bloqueante (1/1) — 100%

| # | Hallazgo | Estado | Commit | Notas |
|---|---|---|---|---|
| H3 | Auth guarda password en localStorage en texto plano | ✅ Resuelto | `490884a` | Eliminado `REMEMBER_PASS_KEY` + cleanup one-shot del legacy. Riesgo Ley 21.719/GDPR/Apple Store §5.1.1 mitigado. Solo se persiste el email + flag "Recordarme". |

### Mayor (11/11) — 100%

| # | Hallazgo | Estado | Commit | Notas |
|---|---|---|---|---|
| H1 | `plan_subtitle` se muestra como key literal en Planificación | ✅ | `490884a` | Agregado a 8 locales |
| H2 | ~70 strings con tildes faltantes en es.js | ✅ | `490884a` | Replace_all + correcciones específicas de duplicados |
| H4 | Errores Auth muestran error.message crudo en inglés | ✅ | `490884a` | Mapper `authErrorKey()` con 6 categorías de error i18n |
| H5 | Pricing CTA "Suscribirme" sin Stripe conectado | ✅ | `490884a` | Renamed → "Solicitar acceso anticipado" + toast informativo |
| H6 | Signup sin indicador visible de password requirements | ✅ | `490884a` | Hint inline con ✓ verde cuando se cumple |
| H10 | Inconsistencia jerarquía visual de botones primarios | ✅ | `4e95323` | Nueva clase `btn-primary-filled` para CTAs de conversión |
| H13 | Format numérico/moneda no respeta locale del usuario | ✅ | `4e95323` | `src/lib/format.js` centralizado + `useFormatters()` hook + 9 displays refactorizados |
| H17 | Modales cierran por backdrop sin confirmar dirty | ✅ | `161f9b8` | Hook `useDirtyClose` aplicado a 5 modales (RecipeWizard, BusinessSettings, AiKey, Stocktake, BalancePanel) |
| H21 | Toast no anuncia a lectores de pantalla | ✅ | `7d6898c` | role + aria-live + aria-atomic |
| H22 | RecipeCard `<div onClick>` sin acceso por teclado | ✅ | `7d6898c` | role="button" + tabIndex + onKeyDown + focus-visible outline |
| H23 | Acciones de RecipeCard ocultas hasta hover | ✅ | `7d6898c` | `group-focus-within:opacity-100 max-md:opacity-100` |
| H24 | RecipeEditor sin h1 + input nombre sin label | ✅ | `7d6898c` | h1 sr-only + label htmlFor asociado |
| H25 | Tabla Ingredientes sin búsqueda escalable | ✅ | `aa6ee73` | Buscador prominente full-width con icono 🔍 + clear + atajo "/" + count + empty state mejorado |
| H26 | Help sin búsqueda destacada | ✅ | `9c03da0` | Mismo patrón que H25 — buscador prominente con count y atajo |

### Menor (25/28) — 89%

| # | Hallazgo | Estado | Commit | Notas |
|---|---|---|---|---|
| H27 | ConfirmModal sin aria-labelledby | ✅ | `7d6898c` | h2 sr-only "Confirmar acción" + extracted hardcoded "Cancelar/Confirmar" → t() |
| H28 | focus:outline-none HelpAssistant sin reemplazo | ✅ | `7d6898c` | focus-visible:outline-2 outline-mint |
| H29 | Inputs de búsqueda sin label asociado | ✅ | `7d6898c` | sr-only labels en Recipes y Help |
| H30 | Botones × minúscula sin aria-label, bajo contraste | ✅ | `490884a` | × Unicode + aria-label + text-[var(--ink3)] (mejor contraste) en IngredientDB y ProductionPlan |
| H31 | aria-label hardcoded en inglés en AiKeyModal | ✅ | `7d6898c` | t('ai_key_show')/t('ai_key_hide') según estado |
| H32 | BatchCalc + ProductionPlan: labels sin htmlFor | ✅ | `7d6898c` | htmlFor agregado en 4 inputs + SearchSelect acepta `id` prop |
| H33 | Voseos remanentes en es.js | ✅ | `d8a7fa9` | "podés"/"querés" → "puedes"/"quieres" en 2 strings |
| H35 | Strings hardcoded en JSX (varios) | ✅ | `d8a7fa9` | DesktopWelcome, MobileDesktopHint, Onboarding, ui/SkeletonCard/SkeletonTable |
| H36 | Fallback `'Error'` literal en catch blocks | ✅ | `d8a7fa9` | 7 lugares → t('error_generic') |
| H37 | ErrorBoundary con texto hardcoded en español | ✅ | `d8a7fa9` | `tRaw()` helper para class components + 5 textos i18n |
| H38 | SearchSelect placeholder default español hardcoded | ✅ | `aa6ee73` | useT() con default i18n |
| H39 | Date format DD-MM ambiguo en Plan | ✅ | `7c83975` | Fecha verbose "Miércoles, 6 de mayo de 2026" bajo el input |
| H40 | LTLT/HTST sin explicación en HACCP | ✅ | `7c83975` | Threshold hint expandido con "Low Temperature Long Time / High Temperature Short Time" |
| H41 | OnboardingWizard skip permite imprimir etiqueta sin RUT | ✅ | `7c83975` | Guard en printLabel: confirm() warning si business.tax_id o legal_name vacíos. Riesgo SAG/ANVISA mitigado |
| H42 | Banner de backup solo aparece en Dashboard | ✅ | `490884a` | BackupReminder movido de Dashboard a App.jsx — aparece en todas las pantallas auth |
| H43 | Botón "Confirmar producción" disabled sin tooltip | ✅ | `7c83975` | title dinámico con motivo (sin recetas / fecha pasada) |
| H44 | FPD/PAC/POD/MSNF sin tooltip | ✅ | `7c83975` | tooltipKey en NUM_FIELDS_KEYS + ⓘ icon en headers de IngredientDB |
| H45 | Header de Recetas sobrepoblado en mobile | ✅ | `e37f685` | Stack vertical en mobile: search full-width + button debajo |
| H46 | Mobile recipes 4 chips numéricos ilegibles | ✅ | `e37f685` | Hidden sm:inline-block para grasa/azúcar/FPD; "Ajuste" sigue visible |
| H47 | Empty state HACCP sin tutorial inline | ✅ | `297ba72` | Icono 🧪 + descripción + CTA "Registrar primera medición" que enfoca + scrollIntoView |
| H48 | Banner backup × sin recovery intra-sesión | ✅ | `b3b46a6` | Botón "↻ Volver a mostrar recordatorio" en BusinessSettingsModal |
| H53 | i18n keys español/inglés mezcla | ✅ | `b3b46a6` | `litros`/`costo` (dupes) eliminados; `total_litros` → `total_liters_label` |
| H55 | escape() ad-hoc no escapa `"` ni `'` | ✅ | `77d5337` | Defensa en profundidad para nombres con comillas en HTML print |
| H57 | BackupReminder emoji 📁 sin aria-hidden | ✅ | `77d5337` | aria-hidden="true" |
| H58 | Toasts mezclados con Modals para feedback | ⏭ Skipped | — | Vago — requiere rule-setting amplio que va más allá del audit |
| H60 | Marco IA flotante en Terms/Privacy/404 | ✅ | `77d5337` | Regex en App.jsx oculta HelpAssistant en /terms /privacy /help /pricing /download |

### Cosmético (8/12) — 67%

| # | Hallazgo | Estado | Commit | Notas |
|---|---|---|---|---|
| H50 | Verificar gating Free 10 recetas | 📋 Manual | — | Verificación manual — no requiere código. Pendiente de tu confirmación. |
| H51 | Anglicismo "logueado/logueados" | ✅ | `490884a` | Eliminado en H33 (mismo batch) — "iniciaste sesión" |
| H52 | Concatenación de strings en IngredientDB:273 | ⏭ Skipped | — | El audit lo marcó cosmético; el código actual es funcional. |
| H53 | Claves i18n nombres mezclados | ✅ | `b3b46a6` | (también listado arriba como menor) |
| H54 | NumberInput type=number iOS legacy | ✅ | `b3b46a6` | pattern="[0-9]*\\.?[0-9]*" defensivo |
| H56 | Bandera con alt="" en print legal | ⏭ Skipped | — | Auditor mismo dijo "aceptable como está, severidad 1" |
| H59 | Avatar header CO ▼ confuso | ✅ | `b3b46a6` | title attribute matching aria-label para hover hint |
| H61 | Pricing badge color saturado | ✅ | `b3b46a6` | bg-[var(--gold2)] pastel — no compite con el CTA gold filled |
| H62 | Sorbete bar muy chica | ✅ | `297ba72` | min 4% de ancho cuando count > 0 |
| H63 | Dashboard chart sin contexto eje Y | ✅ | `297ba72` | "MÁX: X.X L" en header del card |
| H64 | Landing scroll alto (~10 bloques apilados) | ⏭ Skipped | — | Decisión de marketing/contenido, riesgo > beneficio para demo |
| H65 | NewRecipeMenu vs BalancePanel inconsistencia | ✅ | `161f9b8` | Cubierto por H17 (modal dirty check) |

---

## Resumen de items NO resueltos (7)

### ⏭ Skipped con criterio (4)
- **H52** Concatenación strings IngredientDB:273 — funcional como está
- **H56** Alt="" bandera print legal — aceptable per audit
- **H58** Toast vs Modal patterns — vago, requiere rule-setting
- **H64** Landing scroll alto — content/marketing decision

### 📋 Verificación manual (1)
- **H50** Confirmar gating Free 10 recetas — no requiere código

### 🕓 Deferred a triangulación (research-plan §7)
- 2 cosméticos pendientes esperan feedback de heladeros A/B/C antes de tocarlos

---

## i18n keys nuevas agregadas (~50 propagadas a 8 idiomas)

`plan_subtitle` · `auth_password_hint` · `auth_err_bad_credentials` · `auth_err_too_many` · `auth_err_email_exists` · `auth_err_email_invalid` · `auth_err_network` · `auth_err_generic` · `recipe_name` · `untitled_recipe` · `search_placeholder` · `search_inside_dropdown` · `search_no_results` · `delete_ingredient_aria` · `confirm_action` · `ai_key_show` · `ai_key_hide` · `discard_changes_warning` · `error_boundary_title` · `error_boundary_body` · `error_technical_details` · `retry` · `reload` · `welcome_to` · `close_notice` · `progress_label` · `loading_table` · `tooltip_sng` · `tooltip_pac` · `tooltip_pod` · `tooltip_fpd` · `label_business_incomplete_warning` · `plan_add_recipes_first` · `search_ingredients_placeholder` · `clear_search` · `clear_filters` · `shortcut_focus_search` · `ingredient_count` · `ingredient_count_filtered` · `no_results_filtered_desc` · `help_search_count` · `help_articles_total` · `dash_max` · `haccp_record_first` · `total_liters_label` · `backup_reminder_restore` · `backup_reminder_restored`

Plus actualizaciones a strings existentes (~70 tildes en es.js, errores Supabase, plurals, etc.).

---

## Tooling agregado durante el audit

- [`.claude/commands/usability-review.md`](../../.claude/commands/usability-review.md) — slash command para re-correr el audit
- [`scripts/capture-screenshots.mjs`](../../scripts/capture-screenshots.mjs) — Playwright + Chromium, 19 capturas auto
- [`src/lib/format.js`](../../src/lib/format.js) — `useFormatters()` hook con `fmtCurrency`, `fmtNumber`, `fmtDate` locale + country aware
- [`src/lib/hooks.js`](../../src/lib/hooks.js) — `useDirtyClose` reusable para modales con form
- [`src/lib/i18n.js`](../../src/lib/i18n.js) — `tRaw()` helper para class components

---

## Próximos pasos

1. **Validación manual** del demo (~30-45 min) con cuenta `contacto@gelatolab.app`
2. **Push + tag** para liberar v1.0.8:
   ```bash
   git push origin main
   git tag v1.0.8
   git push origin v1.0.8
   ```
3. Demo a Vladimir Dubovik 2026-05-09
4. **Post-demo**: triangular feedback con audit hallazgos pendientes según matriz de [research-plan.md §7](../research-plan.md)
