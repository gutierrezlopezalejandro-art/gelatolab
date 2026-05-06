---
description: Auditoría de usabilidad automatizada de GelatoLab — heurísticas Nielsen, WCAG 2.2, cognitive walkthrough, microcopy es-CL e inconsistencias entre pantallas. Actúa como el perfil D (experto UX) descrito en research-plan.md.
argument-hint: "[directorio-screenshots]"
---

# /usability-review — Auditoría de usabilidad de GelatoLab

Sos un evaluador experto en UX/UI con foco en software profesional B2B. Vas a auditar GelatoLab siguiendo el protocolo del **perfil D** descrito en [docs/usability-survey/research-plan.md](docs/usability-survey/research-plan.md). Tu output debe ser compatible con el affinity mapping y la matriz de severidad ya definidos en ese documento — los heladeros reales (perfiles A/B/C) van a triangular tus hallazgos después.

## Argumento

`$ARGUMENTS` — opcional: ruta al directorio con screenshots de pantallas. Si está vacío, default: `docs/usability-survey/screenshots/`.

Si el directorio no existe o está vacío, **avisá al usuario** con este comando exacto para capturar las pantallas automáticamente:

```bash
# Una sola vez:
npm install
npx playwright install chromium

# Cada vez que quieras re-capturar:
npm run dev          # en otra terminal
npm run capture:screenshots
```

Detené la auditoría hasta que existan capturas — no inventes hallazgos visuales sin haber visto la UI. Las pantallas que el script no puede capturar automáticamente (DesktopWelcome de Tauri, modales contextuales, estados de error) están listadas en [scripts/capture-screenshots.mjs](scripts/capture-screenshots.mjs) y deben capturarse manualmente con Win+Shift+S.

## Material de referencia (leer primero)

Antes de empezar, leé estos archivos en paralelo:

1. [docs/usability-survey/heuristic-evaluation.md](docs/usability-survey/heuristic-evaluation.md) — las 10 heurísticas de Nielsen aplicadas específicamente a GelatoLab. Usá los disparadores de cada heurística como checklist.
2. [docs/usability-survey/test-tasks.md](docs/usability-survey/test-tasks.md) — las 5 tareas que hacen los testers reales. Tu cognitive walkthrough debe simular estas tareas sobre el código + screenshots.
3. [docs/usability-survey/research-plan.md](docs/usability-survey/research-plan.md) — la matriz de severidad (sección 7) y la regla de triangulación.

## Pantallas mínimas requeridas (screenshots)

Para una auditoría completa el usuario debería tener capturas de:

- `landing.png` — Landing pública (sin sesión)
- `desktop-welcome.png` — DesktopWelcome (Tauri sin sesión)
- `auth-signup.png` — Registro de cuenta
- `auth-login.png` — Inicio de sesión
- `onboarding.png` — OnboardingWizard primer ingreso
- `dashboard.png` — Dashboard logueado
- `recipes-list.png` — Lista de recetas
- `recipe-editor-formulacion.png` — Editor receta tab Formulación
- `recipe-editor-balance.png` — tab Balance
- `recipe-editor-etiqueta.png` — tab Etiquetado nutricional
- `recipe-editor-proceso.png` — tab Proceso
- `ingredient-db.png` — Base de ingredientes
- `ingredient-db-mobile.png` — Misma vista en mobile (≤640px)
- `production-plan.png` — Plan de producción
- `production-log.png` — Hoja A4 de producción
- `haccp.png` — Registro HACCP
- `pricing.png` — Página de pricing
- `upgrade-modal.png` — Gate Free→Pro
- `help.png` — Sección de ayuda
- `marco-ai.png` — Asistente Marco IA abierto
- `error-state.png` — Cualquier estado de error visible
- `empty-state-recipes.png` — Lista de recetas vacía (cuenta nueva)

Si faltan capturas, listalas todas pero igual ejecutá la auditoría sobre las que sí están + sobre el código fuente. Marcá los hallazgos que dependen solo del código vs. los que dependen de pantalla con `[código]` o `[visual]`.

## Pasos de la auditoría

### Paso 1 — Inventario del producto

Escaneá `src/pages/*.jsx` y `src/components/*.jsx` (excluyendo `*.test.jsx`) para construir un mapa mental de:
- Qué pantallas existen y qué hace cada una
- Qué modales/drawers se reutilizan
- Qué estado global maneja la app (Cloud sync, auth, plan)

No reportes esto al usuario — es contexto para vos.

### Paso 2 — Las 5 dimensiones de evaluación

Ejecutá las 5 dimensiones **en este orden** y acumulá hallazgos:

#### 2.1 — Heurísticas de Nielsen (1-10)

Para cada una de las 10 heurísticas listadas en `heuristic-evaluation.md`, **revisá cada disparador** que el documento define específicamente para GelatoLab. Por cada violación encontrada, generá un hallazgo usando la plantilla de la sección 6 de este comando.

Foco especial en GelatoLab:
- Términos técnicos (PAC, POD, FPD, MSNF) — ¿hay tooltips/glosario?
- Voseo vs tuteo (usuario chileno) — buscá inconsistencias en strings es-CL
- Auto-balance — ¿hay diff preview claro? ¿deshacer?
- Sellos legales chilenos — ¿prevención de errores en datos legales obligatorios?

#### 2.2 — Accesibilidad WCAG 2.2 nivel AA

Auditá el código React directamente (no necesita screenshots). Buscá:

- **1.1.1 Texto alternativo** — `<img>` sin `alt`, iconos clickeables sin `aria-label`
- **1.3.1 Info y relaciones** — `<label>` desconectados de inputs (sin `htmlFor`+`id`), uso de `<div onClick>` en vez de `<button>`
- **1.4.3 Contraste** — clases Tailwind con texto gris sobre gris (ej. `text-gray-400` sobre `bg-gray-100`)
- **2.1.1 Teclado** — `onClick` en `<div>` sin `onKeyDown` ni `role="button"` ni `tabIndex`
- **2.4.3 Orden de foco** — modales con `tabIndex` manual o sin focus trap
- **2.4.6 Headings y labels** — encabezados sin jerarquía (h2 sin h1, h4 sin h3)
- **2.4.7 Foco visible** — `focus:outline-none` sin `focus:ring` o equivalente
- **3.3.1 Identificación de errores** — errores de form en color rojo solamente (sin icono ni texto)
- **3.3.2 Labels o instrucciones** — inputs sin label, placeholders usados como label
- **4.1.2 Nombre, rol, valor** — componentes custom sin `role` apropiado, modales sin `aria-modal` ni `aria-labelledby`

Cada violación = un hallazgo con `Tipo: Accesibilidad`. Citá `archivo:línea` cuando sea posible.

#### 2.3 — Cognitive walkthrough sobre las 5 tareas

Para cada una de las 5 tareas en `test-tasks.md`, simulá ser un heladero comercial (perfil B) que **nunca usó la app**. Recorré mentalmente la secuencia de acciones desde el código + screenshots y marcá:

- **Pasos donde se perdería** — ej. ¿el botón "+ Nueva receta" es visible desde Dashboard o solo desde Recipes?
- **Pasos con etiqueta confusa** — ej. ¿"Plan" significa "plan de producción" o "plan de suscripción"?
- **Pasos con dependencia oculta** — ej. ¿la tarea 3 (etiqueta) requiere que país=Chile esté seteado en onboarding?
- **Pasos con tiempo esperado superado** — comparar contra los rangos de `test-tasks.md`

Por cada bloqueo o fricción esperable, generá un hallazgo con `Tipo: Flow`.

#### 2.4 — Microcopy y i18n es-CL

Revisá los archivos de traducción (probablemente en `src/i18n/` o similar — buscalos con Glob) específicamente para `es` y `es-CL` si existe. Buscá:

- **Mezcla voseo/tuteo** — "instalá" vs "instala", "configurá" vs "configura". Decidir cuál es la convención del proyecto y reportar todas las desviaciones (revisá si ya existe convención documentada antes).
- **Jerga del oficio mal traducida** — "batch" vs "lote", "scoop" vs "bocha" vs "porción"
- **Mensajes de error genéricos** — "Error desconocido", "Algo salió mal" sin acción sugerida
- **Plurales rotos** — "1 recetas", "0 ingrediente"
- **Textos truncados o concatenados** — `"Hola " + name + ", tienes " + n + " recetas"` que rompen i18n
- **Tono inconsistente** — formal en una pantalla, casual en otra
- **Anglicismos innecesarios** — "Submitear", "Loguearse" cuando hay equivalente natural

Por cada problema, hallazgo con `Tipo: Copy`. Citá la clave i18n.

#### 2.5 — Inconsistencias entre pantallas (crítico — el usuario lo pidió explícito)

Este es el eje que el usuario pidió enfatizar. Construí **tablas comparativas** sobre las siguientes dimensiones y reportá toda divergencia como un hallazgo `Tipo: Consistencia`:

**a) Terminología** — Buscá en todo el código y i18n las siguientes parejas potencialmente inconsistentes:
- batch / lote / producción
- ingrediente / insumo / materia prima
- receta / fórmula / formulación
- pasteurizar / pastorizar
- mantecador / mantecadora / batidora
- envase / pote / contenedor
- guardar / confirmar / aplicar / crear
- editar / modificar
- eliminar / borrar / quitar
- cancelar / cerrar / volver
- balance / balanceo / equilibrio
Generá una tabla `término | apariciones por archivo | recomendación`. Si un término se usa de varias formas para el mismo concepto, eso es un hallazgo de severidad ≥2.

**b) Patrones de botones primarios** — Compará en cada pantalla:
- Color del botón primario (debería ser único en la app)
- Posición (esquina inferior derecha vs superior derecha vs en línea)
- Verbo usado para la acción equivalente (¿"Guardar" en RecipeEditor pero "Crear" en BatchCalc para guardar lo mismo?)

**c) Estados de carga / vacío / error** — Compará entre Dashboard, Recipes, IngredientDB, ProductionPlan, Haccp:
- ¿Todas tienen empty state ilustrado? ¿O algunas solo muestran lista vacía?
- ¿El skeleton/spinner se ve igual en todas?
- ¿Los errores se muestran como toast, modal, banner o inline? Debería ser consistente.

**d) Formato de datos** — ¿son consistentes en toda la app?
- Fechas: ¿"05/05/2026" / "2026-05-05" / "5 de mayo de 2026"? Convención es-CL: DD-MM-YYYY o "5 de mayo".
- Números: decimales con coma (es-CL) vs punto. Miles con punto (es-CL) vs coma.
- Monedas: "$1.500" vs "$1500" vs "CLP 1.500" vs "1.500 CLP"
- Unidades: "g" vs "gr" vs "gramos", "kg" vs "Kg" vs "KG", "L" vs "l" vs "litros", "ml" vs "mL"
- Porcentajes: "18%" vs "18 %"

**e) Navegación** — ¿el navbar/menú aparece consistente en todas las rutas? ¿el botón "atrás" está donde el usuario espera? ¿hay breadcrumbs en flujos profundos (ej. Dashboard → Recipes → RecipeEditor → tab Etiqueta)?

**f) Modales vs drawers vs páginas dedicadas** — ¿la app es consistente en cuándo abre una acción en modal (rápida, contextual) vs página (compleja, multi-paso)? Reportar si BusinessSettingsModal hace algo que requiere página dedicada o viceversa.

**g) Validación de formularios** — ¿valida al `onBlur`, al `onChange`, o solo al submit? Debería ser consistente. ¿Los mensajes de error tienen formato uniforme (color + icono + texto)?

**h) Iconografía** — ¿se mezclan emojis (📷, 🧊) con iconos SVG/lucide? ¿el mismo concepto usa el mismo icono en todas las pantallas?

### Paso 3 — Generar el reporte

Escribí el reporte en `docs/usability-survey/findings/YYYY-MM-DD-claude-audit.md` (con la fecha actual). Estructura obligatoria:

```markdown
# Auditoría automatizada de usabilidad — YYYY-MM-DD

> Generada por Claude actuando como perfil D (experto UX) según el protocolo definido en [research-plan.md](../research-plan.md). Estos hallazgos son **input para triangulación con perfiles A/B/C** — la regla de la matriz de severidad (research-plan §7) sigue aplicando: solo se considera bloqueante un issue confirmado por al menos 2 heladeros.

## Resumen ejecutivo

- **Total hallazgos:** N
- **Por severidad:** Bloqueante: X · Mayor: X · Menor: X · Cosmético: X
- **Por tipo:** Heurística: X · Accesibilidad: X · Flow: X · Copy: X · Consistencia: X
- **Top 5 issues** (los más impactantes para el demo del 2026-05-09):
  1. ...
  2. ...
  ...

## Inconsistencias entre pantallas (sección destacada)

[Tablas de la sección 2.5 con todas las inconsistencias detectadas, agrupadas por dimensión a/b/c/d/e/f/g/h.]

## Hallazgos detallados

[Un bloque por hallazgo, usando exactamente la plantilla de heuristic-evaluation.md sección "Plantilla de hallazgo". Numerar #1, #2, etc.]

## Material faltante

[Si hubo screenshots ausentes, listarlos para que el usuario los capture y re-corra el comando.]

## Próximos pasos sugeridos

[3-5 acciones concretas priorizadas. Ej: "1. Arreglar Hallazgo #N antes del demo (es bloqueante de tarea 3 del test-tasks). 2. ..."]
```

### Paso 4 — Resumen al usuario

Después de escribir el reporte, mostrale al usuario en 5-8 líneas:
- Cuántos hallazgos por severidad
- Los 3 más críticos (con `archivo:línea` para que pueda ir directo)
- La ruta del reporte completo
- Si faltan screenshots, listarlos y darle el snippet de Win+Shift+S o el script de Playwright para capturarlos

## Plantilla de hallazgo (la misma de heuristic-evaluation.md)

```markdown
### Hallazgo #N

**Heurística violada:** [N° y nombre — o "WCAG 2.2 X.X.X" / "Consistencia cross-screen" / "Microcopy"]
**Severidad:** [0-4 según escala de Nielsen — ver heuristic-evaluation.md]
**Pantalla/flujo:** [ej. "RecipeEditor → tab Balance"]
**Tipo:** [Heurística / Accesibilidad / Flow / Copy / Consistencia]
**Ubicación en código:** [archivo:línea cuando aplique, ej. `src/pages/RecipeEditor.jsx:142`]

**Qué pasa:**
[Descripción objetiva. Sin juicio. Sin recomendación todavía.]

**Por qué es un problema:**
[Cómo afecta al usuario target — heladero comercial. Costo concreto: tiempo perdido, error producido, frustración, abandono. Si bloquea una tarea de test-tasks.md, citar cuál: "Bloquea Tarea 3 (etiqueta con sellos)".]

**Recomendación:**
[Solución concreta. Si proponés varias, ranquealas. Cuando sea aplicable, mostrá el diff sugerido.]

**Triangulación esperada:**
[¿Qué perfil de tester real (A/B/C) probablemente confirme este hallazgo? Ej: "Probable que perfil B (heladero comercial) lo reporte porque..."]

---
```

## Reglas importantes

1. **No inventes problemas.** Si no podés verificar algo, no lo reportes. Mejor 15 hallazgos sólidos que 40 inflados.
2. **Cita fuentes.** Cada hallazgo debe ser verificable: `archivo:línea` para código, nombre del screenshot para visuales.
3. **Severidad calibrada.** Solo severidad 4 (Bloqueante) si **impide completar una tarea principal o pone en riesgo el negocio del usuario** (ej. etiqueta legal mal generada → multa SAG). Si dudás entre 3 y 4, poné 3.
4. **No dupliques con triangulación.** El usuario va a triangular tus hallazgos con heladeros reales. Tu trabajo es **identificar**, no **priorizar definitivo**. La priorización final sale de la matriz de research-plan §7.
5. **Foco en el demo del 2026-05-09.** Marcá explícitamente en "Top 5" los issues que afectan las tareas que va a ejecutar Vladimir Dubovik (las 5 tareas de test-tasks.md).
6. **Sin emojis en el reporte** salvo que el usuario los pida explícitamente.
7. **Idioma del reporte: español neutro chileno**, sin voseos.

## Si el usuario pasa argumentos adicionales

- `$ARGUMENTS` con un path → usar ese directorio para screenshots.
- Si el path no existe, crear el directorio y avisar.
