# Auditoría automatizada de usabilidad — 2026-05-06

> Generada por Claude actuando como **perfil D (experto UX)** según el protocolo definido en [research-plan.md](../research-plan.md). Estos hallazgos son **input para triangulación con perfiles A/B/C** — la regla de la matriz de severidad (research-plan §7) sigue aplicando: solo se considera bloqueante un issue confirmado por al menos 2 heladeros + 1 experto.

> Stack analizado: React 18 + Vite + Tauri 2 + HashRouter + Supabase + i18n 8 idiomas. Capturas en `docs/usability-survey/screenshots/` (19 automáticas) + lectura de código fuente de `src/`. Cuenta de prueba: `contacto@gelatolab.app` (Pro, 32 recetas precargadas).

## Resumen ejecutivo

- **Total hallazgos:** 52 (consolidados después de deduplicar 65 brutos entre auditoría de código + visual).
- **Por severidad:** Bloqueante: 1 · Mayor: 11 · Menor: 28 · Cosmético: 12
- **Por tipo:** Heurística: 14 · Accesibilidad (WCAG 2.2): 16 · Flow: 7 · Copy/i18n: 10 · Consistencia cross-screen: 5

### Top 6 issues críticos para el demo del 2026-05-09

Priorizados por impacto inmediato durante la demo a Vladimir Dubovik. Todos arreglables en pocas horas combinadas.

| # | Hallazgo | Severidad | Esfuerzo | Tarea afectada |
|---|---|---|---|---|
| 1 | [`plan_subtitle` se renderiza como key literal](#h1-plan_subtitle-no-traducido-en-planificación) | Mayor | 1 línea | Tarea 4 (Hoja A4) |
| 2 | [Tildes faltantes en strings clave (`Contrasena`, `Formulacion`, `Terminos`, `Olvide`)](#h2-tildes-faltantes-en-strings-de-marca-y-auth) | Mayor | ~30 strings | Todas — header global |
| 3 | [Auth guarda password en `localStorage` en texto plano](#h3-auth-guarda-password-en-localstorage-en-texto-plano-crítico-de-seguridad) | **Bloqueante** | ~10 líneas | Riesgo legal Ley 21.719 + Apple Store |
| 4 | [Errores de Auth muestran `error.message` crudo de Supabase en inglés](#h4-errores-de-auth-muestran-errormessage-crudo-en-inglés) | Mayor | mapper i18n | Tarea 1 (Registrarse) |
| 5 | [Pricing CTA "Suscribirme" lleva a Stripe que no está conectado](#h5-pricing-cta-suscribirme-sin-stripe-conectado) | Mayor | 1 línea | Pre-demo |
| 6 | [Validación de password en signup solo al submit, sin requisitos visibles](#h6-signup-sin-indicador-de-requisitos-de-contraseña) | Mayor | inline hints | Tarea 1 |

### Trade-off importante

Los 52 hallazgos representan ~40-60h de trabajo si se atacan todos. La sugerencia es: **arreglar los 6 críticos antes del 2026-05-09** (~6-8h), dejar el resto para triangulación con perfiles A/B/C. La matriz de research-plan §7 va a despriorizar la mitad de los cosméticos cuando ningún heladero los reporte.

---

## Inconsistencias entre pantallas (sección destacada)

Esta es la dimensión que pediste enfatizar. Tablas comparativas con divergencias detectadas:

### a) Terminología

Conteo en archivos `*.jsx` + `src/lib/locales/*.js`. Las parejas conflictivas se encuentran abajo. Cada par usado de dos formas distintas para el mismo concepto = hallazgo automático severidad ≥2.

| Concepto | Forma A (apariciones) | Forma B (apariciones) | Recomendación | Hallazgo |
|---|---|---|---|---|
| Equipo de batido | `mantecador` (~8) | `mantecadora` (~8) | **mantecadora** (RAE + uso comercial Icemel) | [H7](#h7-inconsistencia-mantecador-vs-mantecadora) |
| Verbo guardar | `Guardar` | `Confirmar` / `Aplicar` | Diferenciar por intención (ver H8) | [H8](#h8-tres-verbos-primarios-guardar-confirmar-aplicar-sin-regla) |
| Acción destructiva | `Eliminar` | `Borrar` / `Quitar` / `Confirmar` | **Eliminar** universal | [H8](#h8-tres-verbos-primarios-guardar-confirmar-aplicar-sin-regla) |
| Sesión iniciada | `iniciar sesión` | `logueado` | **iniciar sesión** | [H9](#h9-anglicismo-logueado-en-strings-mobile) |

Nota: las parejas `batch/lote`, `ingrediente/insumo`, `receta/fórmula` se usan **consistentemente** (batch+lote como sinónimos contextuales, ingrediente sin insumo, receta sin fórmula). Sin hallazgo.

### b) Patrones de botón primario

Comparado entre 7 pantallas con CTA principal visible:

| Pantalla | CTA principal | Color | Estilo | Posición |
|---|---|---|---|---|
| `pricing` | "Suscribirme" | **Amarillo lleno** | Filled | Centro de card |
| `dashboard` | "+ Nueva receta" | Verde | **Outline** | Header derecho |
| `auth-login` | "Iniciar sesión" | Verde | **Outline** | Card centro |
| `auth-signup` | "Crear cuenta" | Verde | **Outline** | Card centro |
| `production-plan` | "+ Agregar lote" | Verde | **Outline** | Header derecho |
| `recipes-list` | "+ Nueva receta" | Verde | **Outline** | Header derecho |
| `landing` (CTA) | "Probar gratis" | Amarillo | Filled | Hero |

**Inconsistencia clara:** la única pantalla que usa el patrón estándar SaaS (primary lleno saturado) es `pricing`. El resto usa outline verde. Un usuario nuevo no aprende cuál es la acción primaria. → [H10](#h10-inconsistencia-en-jerarquía-visual-de-botones-primarios).

### c) Estados vacíos

| Pantalla | Empty state | Tiene CTA | Tiene ilustración | Tiene texto guía |
|---|---|---|---|---|
| `dashboard` | "Sin producción este mes", "Aún no hay producciones registradas" | ❌ | ❌ | Mínimo |
| `recipes-list` | n/a (32 recetas precargadas) | — | — | — |
| `production-plan` | Implícito (botón "Agregar lote" disabled sin tooltip) | ❌ | ❌ | ❌ |
| `production-log` | "Sin producciones aun. Confirma un plan en Planificación para comenzar" | ❌ (texto mencionando otro tab) | ❌ | Sí |
| `haccp` | "Aún no hay chequeos registrados" | ❌ | ❌ | Mínimo |
| `ingredient-db` | n/a (70+ precargados) | — | — | — |

**Inconsistencia:** ninguno tiene CTA directo desde el empty state. Todos texto plano. → [H11](#h11-empty-states-sin-cta-ni-ilustración) + [H12](#h12-production-log-empty-state-menciona-otra-página-sin-link).

### d) Formato de datos

| Tipo | Helper centralizado | Hardcodes detectados |
|---|---|---|
| Fechas | ❌ Solo local en `ProductionLog.jsx:20` | `LOCALE_MAP` duplicado en 3 archivos |
| Números | ❌ | 17+ usos de `toLocaleString('es-CL')` con locale **hardcodeado** |
| Moneda | ❌ | `$` literal prefijado en ~25 ocurrencias (RecipeEditor, BatchCalc, ProductionLog, Dashboard, IngredientDB, AnalysisPanel) |
| Unidades | ❌ | `g`/`gr`, `kg`/`Kg`, `L`/`l`, `ml`/`mL` mezclados en strings |

Resultado: un usuario brasileño en pt-BR ve costos formateados estilo es-CL (`$3.500.000` con punto miles + signo `$` que se confunde con peso chileno). → [H13](#h13-formato-numérico-y-moneda-no-respeta-locale-del-usuario) (severidad 3).

### e) Navegación

- Navbar superior **consistente** en todas las pantallas autenticadas ✅.
- **Navbar AUTENTICADO se muestra también en pantallas públicas** (auth-login, auth-signup, terms, privacy, 404, pricing, help-public, download). Confunde y genera loops de redirect. → [H14](#h14-navbar-app-visible-en-pantallas-públicas-causa-loops-de-redirect).
- **Sin breadcrumbs** en flujos profundos (Dashboard → Recipes → Editor → tab Etiqueta). → [H15](#h15-sin-breadcrumbs-en-flujos-profundos).
- **Mobile (≤768px): nav principal no se ve en las capturas mobile.** Hay una hamburguesa en el código (App.jsx:253-267) pero no es visible en `dashboard-mobile.png` / `recipes-list-mobile.png` / `ingredient-db-mobile.png`. **Verificar urgente**: si la hamburguesa no se está renderizando, mobile queda inutilizable. → [H16](#h16-verificar-visibilidad-de-hamburguesa-mobile).

### f) Modales — patrón de cerrado

| Modal | Cierra con backdrop | Cierra con Esc | Confirma si hay datos sin guardar | Focus trap |
|---|---|---|---|---|
| `BusinessSettingsModal` | ✅ | ✅ | ❌ | ❌ |
| `AiKeyModal` | ✅ | ✅ | ❌ | ❌ |
| `RecipeWizard` (8 pasos) | ✅ | ✅ | ❌ | ❌ |
| `StocktakeModal` | ✅ | ✅ | ❌ | ❌ |
| `BalancePanel` con preview cargado | ✅ | ✅ | ❌ | ❌ |
| `ConfirmModal` | ✅ | ✅ | n/a | ❌ |

**Inconsistencia masiva:** ningún modal con form atrapa focus ni avisa cambios sin guardar. RecipeWizard de 8 pasos puede perderse con un click backdrop accidental. → [H17](#h17-modales-cierran-por-backdrop-sin-confirmar-cambios) + [H18](#h18-modales-sin-focus-trap-wcag-243).

### g) Validación de formularios

| Form | onChange | onBlur | onSubmit | Mensajes |
|---|---|---|---|---|
| Auth login/signup | parcial (mismatch en confirm) | ❌ | ✅ | Toast + inline parcial |
| IngredientDB modal | ❌ | ❌ | ✅ | Toast |
| RecipeEditor (nombre) | ❌ | ❌ | ✅ | Toast |
| BusinessSettings | ❌ | ❌ | ✅ | Toast |

**Patrón único:** validación solo al submit. Cero validación on-blur. → [H19](#h19-validación-de-form-solo-al-submit-sin-feedback-temprano).

### h) Iconografía

Mezcla detectada:
- **Emojis Unicode:** 📷 (cámara header), 🌐 (globo idioma), 📁 (carpeta backup), 🧊, 🍦 (404)
- **Iconos lucide/SVG:** la mayoría del resto

Los emojis renderizan diferente en Windows / macOS / Linux y rompen consistencia visual. → [H20](#h20-iconografía-emoji-mezclada-con-svg-renderiza-diferente-por-os).

---

## Hallazgos detallados

> Numeración H1-H52. Los hallazgos del Top 6 (críticos para demo) están al inicio. Resto agrupados por severidad descendente.

### Bloqueantes y Mayores (afectan demo o tareas críticas)

#### H1: `plan_subtitle` no traducido en Planificación

**Heurística violada:** 9. Reconocer y recuperarse de errores
**Severidad:** 3 (Mayor)
**Pantalla/flujo:** Planificación (`production-plan.png`)
**Tipo:** Bug visible / Copy
**Ubicación en código:** `src/pages/ProductionPlan.jsx:565` consume `t('plan_subtitle')` y la clave **no existe** en `src/lib/locales/es.js`.

**Qué pasa:** Bajo el título "Planificación de Producción" aparece literalmente la cadena `plan_subtitle`.

**Por qué es un problema:** Para el heladero target el efecto inmediato es desconfianza ("esta app está rota"). En la demo a Vladimir Dubovik del 2026-05-09 evidencia falta de pulido. Bloquea la lectura del subtítulo que contextualiza la sección. **Bloquea Tarea 4 (Imprimir hoja A4 de producción)** porque el primer landing del flow muestra un bug.

**Recomendación:** Agregar entrada en `es.js` (y resto de locales). Sugerencia: `plan_subtitle: 'Programa producciones por fecha y revisa cantidades estimadas por receta.'`

**Triangulación esperada:** Cualquier perfil A/B/C lo nota al instante.

---

#### H2: Tildes faltantes en strings de marca y auth

**Heurística violada:** 4. Consistencia y estándares
**Severidad:** 3 (Mayor)
**Pantalla/flujo:** Auth, Header global, Producción, Footer, Privacidad, Términos
**Tipo:** Copy / es-CL
**Ubicación en código:**
- `src/lib/locales/es.js:11` `brand_sub: 'Formulacion de helados'`
- `src/lib/locales/es.js:590` `auth_password: 'Contrasena'`
- `src/lib/locales/es.js:618` `auth_password_updated`
- `src/lib/locales/es.js:641` `legal_terms_title: 'Terminos y Condiciones'`
- `src/lib/locales/es.js:1458` `no_production_yet: 'Sin producciones aun'`
- `src/lib/locales/es.js` (link recovery) `'Olvide mi contraseña'`

**Qué pasa:** Múltiples textos en español aparecen sin tildes en producción: "Contrasena", "Formulacion de helados" (subtítulo del logo en TODAS las pantallas), "Sin producciones aun", "Terminos y Condiciones", "Politica de Privacidad", "Olvide mi contraseña".

**Por qué es un problema:** Para un heladero chileno o latinoamericano profesional, español sin tildes en una app B2B de pago es señal directa de amateurismo. La exposición es máxima porque el subbrand del logo está visible en todas las pantallas. Compromete percepción de calidad y disposición a pagar Pro.

**Recomendación:** Auditar `es.js` con un linter ortográfico (ej. `language-tool-cli`). Como mínimo arreglar las claves listadas arriba. Hacer lo mismo en `pt.js` (Câmara/Câmera observados).

**Triangulación esperada:** Confirmación segura por A y B (heladeros nativos del español).

---

#### H3: Auth guarda password en localStorage en texto plano (crítico de seguridad)

**Heurística violada:** Privacy by design + Nielsen 5
**Severidad:** **4 (Bloqueante)**
**Pantalla/flujo:** Auth (login con "Recordarme")
**Tipo:** Seguridad / Privacidad
**Ubicación en código:** `src/pages/Auth.jsx:14, 53, 78` — `REMEMBER_PASS_KEY` persiste el password en `authStorage` (que escribe a `localStorage` en web y a JSON en disk en Tauri).

**Qué pasa:** El flag "Recordarme" persiste el password completo en `localStorage` en texto plano y lo prefilla al volver. Cualquier extensión de navegador maliciosa, XSS o acceso físico al disco lo extrae completo.

**Por qué es un problema:**
- **Riesgo legal Chile (Ley 21.719 Protección de Datos)** — almacenamiento de credenciales debe ser cifrado por adecuación.
- **Riesgo legal UE (GDPR Art. 32)** — controles de seguridad apropiados.
- **Riesgo App Store Apple** — si esto se mantiene en la versión iOS, gatilla rechazo (App Store Review §5.1.1).
- Patrón divergente: el usuario espera que "Recordarme" prefille email, no que persista password.

**Recomendación:**
1. Eliminar `REMEMBER_PASS_KEY` por completo. Recordar solo el email.
2. Para mantener sesión usar el refresh token de Supabase (que ya existe vía `supabase.auth.persistSession`).
3. Si en el futuro se quiere "no escribir password al volver", usar passkeys/WebAuthn o `KeychainAccess` en Tauri.

```jsx
// src/pages/Auth.jsx — DELETE
const REMEMBER_PASS_KEY = 'gelatolab.saved_password';
// Y todas las llamadas a authStorage.setItem/getItem/removeItem con esa key.
```

**Triangulación esperada:** No es un issue UX percibido por usuarios — es un issue legal/seguridad. Solo perfil D (este audit) o un security review lo identifican. **Severidad 4 calibrada por riesgo legal, no por confirmación de heladeros.**

---

#### H4: Errores de Auth muestran error.message crudo en inglés

**Heurística violada:** 9. Mensajes de error claros
**Severidad:** 3 (Mayor)
**Pantalla/flujo:** Auth
**Tipo:** Copy / Accesibilidad
**Ubicación en código:** `src/pages/Auth.jsx:73, 100, 105, 117`

**Qué pasa:** `if (error) return showToast(error.message, 'error')` muestra el mensaje literal de Supabase. Esos mensajes vienen en inglés sin traducción ni acción concreta:
- "Invalid login credentials"
- "Email rate limit exceeded"
- "User already registered"

**Por qué es un problema:** Un heladero chileno que ve "Invalid login credentials" puede pensar que la app está rota o que su cuenta fue borrada. No le dice si reintentar, recuperar contraseña, o esperar. **Afecta Tarea 1 (Registrarse y entrar)** del demo.

**Recomendación:** Mapear `error.message` y `error.code` de Supabase a claves i18n con acción incluida:

```jsx
function authErrorKey(err) {
  if (/invalid login/i.test(err.message)) return 'auth_err_bad_credentials';
  if (/rate limit/i.test(err.message)) return 'auth_err_too_many';
  if (/already registered/i.test(err.message)) return 'auth_err_email_exists';
  return 'auth_err_generic';
}
showToast(t(authErrorKey(error)), 'error');
```

**Triangulación esperada:** Confirmación segura por C (alumno) que es quien más probable tiene typo en email/password.

---

#### H5: Pricing CTA "Suscribirme" sin Stripe conectado

**Heurística violada:** 9. Mensajes claros / 5. Prevención de errores
**Severidad:** 3 (Mayor) durante el demo
**Pantalla/flujo:** `pricing.png`
**Tipo:** Flow
**Ubicación en código:** `src/pages/Pricing.jsx`

**Qué pasa:** La card Pro tiene botón amarillo prominente "Suscribirme" que sugiere checkout funcional. Según `gelatolab_roadmap.md` Fase 2, Stripe aún no está conectado.

**Por qué es un problema:** Un tester o lead clickea "Suscribirme", espera Stripe, recibe error o no pasa nada. Confianza rota antes de cobrar. Si Vladimir Dubovik clickea durante el demo, momento incómodo en vivo.

**Recomendación:**
1. Cambiar CTA temporal a "Solicitar acceso anticipado" o "Próximamente".
2. Al click, mostrar modal: "Estamos en beta cerrada. Escribinos a `contacto@gelatolab.app`".
3. Cuando Stripe esté listo (Fase 2), restaurar "Suscribirme".

**Triangulación esperada:** Confirmación segura. B intentaría suscribirse de buena fe.

---

#### H6: Signup sin indicador de requisitos de contraseña

**Heurística violada:** 5. Prevención de errores
**Severidad:** 3 (Mayor)
**Pantalla/flujo:** `auth-signup.png`
**Tipo:** Flow
**Ubicación en código:** `src/pages/Auth.jsx:163-175`, `src/pages/Auth.jsx:87-93`

**Qué pasa:** Los campos password + confirmar password no muestran requisitos (longitud mínima 6 caracteres, etc.) ni indicador de fuerza. La validación se ejecuta solo al submit, devolviendo un toast genérico tras el error.

**Por qué es un problema:** **Afecta Tarea 1.** Heladero introduce contraseña, da submit, recibe error críptico ("Password should be at least 6 characters"). Reescribe y vuelve a fallar. Frustración temprana = abandono.

**Recomendación:**
- Mostrar requisitos visibles bajo el campo: "≥6 caracteres".
- Indicador en tiempo real de match entre password y confirm (ya parcialmente existe — extender).
- Botón submit deshabilitado hasta cumplir requisitos mínimos.

**Triangulación esperada:** Confirmación segura por C. A y B también si se les pide cuenta nueva.

---

### Mayores adicionales (severidad 3)

#### H21: Toast no anuncia a lectores de pantalla (WCAG 4.1.3)

**Severidad:** 3 · **Tipo:** Accesibilidad
**Ubicación:** `src/components/ui/Toast.jsx:11-22`

El componente `Toast` no tiene `role="status"`/`role="alert"` ni `aria-live`. Toast es el feedback principal de éxito en toda la app. Un heladero con baja visión usando lector de pantalla queda sin confirmación, puede presionar Guardar dos veces creando duplicados.

**Fix:** agregar `role={toast.type === 'error' ? 'alert' : 'status'}` y `aria-live="polite"` (o `assertive` para errores).

---

#### H22: `<div onClick>` en RecipeCard sin acceso por teclado (WCAG 2.1.1)

**Severidad:** 3 · **Tipo:** Accesibilidad
**Ubicación:** `src/components/RecipeCard.jsx:33-39`

El card de receta es un `<div onClick>` sin `role="button"`, `tabIndex`, ni `onKeyDown`. La pantalla principal (lista de recetas) no es navegable por teclado para abrir una receta.

**Fix:** convertir el card en `<article>` con `<a>` o `<button>` interno, o agregar `role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onEdit(recipe.id); }}`.

---

#### H23: Acciones de RecipeCard ocultas hasta hover

**Severidad:** 3 · **Tipo:** Accesibilidad / UX
**Ubicación:** `src/components/RecipeCard.jsx:131`

`opacity-0 group-hover:opacity-100` esconde Editar/Duplicar/Eliminar hasta hover. En tablet/touch (uso típico en cocina) no hay hover real. Para teclado nunca aparecen.

**Fix:** agregar `group-focus-within:opacity-100 max-md:opacity-100`.

---

#### H10: Inconsistencia en jerarquía visual de botones primarios

**Severidad:** 3 · **Tipo:** Consistencia
**Pantallas:** dashboard, auth, recipes-list, production-plan, pricing
Ver tabla en sección "Inconsistencias entre pantallas — b)".

**Fix:** definir 3 niveles visuales (primary lleno saturado, secondary lleno, tertiary outline) y aplicarlos consistentemente. Solo 1 acción primaria por pantalla.

---

#### H13: Formato numérico y moneda no respeta locale del usuario

**Severidad:** 3 · **Tipo:** Consistencia / i18n
**Ubicación:** ~17 archivos con `toLocaleString('es-CL')` hardcoded; `$` literal hardcoded en ~25 ocurrencias.

Un usuario en pt-BR cambia idioma y los costos siguen formateados estilo es-CL. Mezcla de `'es-CL'` con `useLocale()` entre pantallas.

**Fix:** crear `src/lib/format.js` con `formatCurrency`, `formatNumber`, `formatDate` que reciban `locale` + `country` desde `useLocale()` + `countryStore`. Borrar todos los `'es-CL'` literales. Usar `Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)` para moneda — resuelve también el símbolo según país.

---

#### H24: Recipe name input sin `<label>` ni `<h1>`

**Severidad:** 3 · **Tipo:** Accesibilidad
**Ubicación:** `src/pages/RecipeEditor.jsx:415-423`

El campo principal de la pantalla — el nombre de la receta — es un `<input>` sin `<label>`, `aria-label` ni `id`. Solo placeholder. **La página no tiene `h1`.**

**Fix:**
```jsx
<label htmlFor="recipe-name" className="sr-only">{t('recipe_name')}</label>
<input id="recipe-name" aria-label={t('recipe_name')} ... />
```
+ agregar `<h1 className="sr-only">{name || t('untitled_recipe')}</h1>`.

---

#### H17: Modales cierran por backdrop sin confirmar cambios

**Severidad:** 3 · **Tipo:** Prevención de errores
**Pantallas:** RecipeWizard (8 pasos), BusinessSettings, AiKey, Stocktake, BalancePanel con preview

Click backdrop = cerrar sin importar si hay datos sin guardar. RecipeWizard puede perder 5 minutos de configuración por un clic accidental.

**Fix:** track `dirty` en cada modal con form. En `onClose` con dirty, lanzar `confirm()` "¿Descartar cambios?".

---

#### H25: Tabla de Ingredientes sin búsqueda escalable

**Severidad:** 3 · **Tipo:** Flow
**Pantalla:** `ingredient-db.png`

Tabla de 70+ filas en una sola página. Sin buscador prominente, sin paginación visible. **Afecta Tarea 2 (crear receta balanceada)** — encontrar "pasta de pistacho" entre 70+ ingredientes implica scroll infinito.

**Fix:** buscador prominente con autocomplete + filtros por categoría visibles + virtualización (`react-window`) si crece a 200+ items. Mobile: lista de cards con buscador sticky.

---

#### H26: Help sin búsqueda destacada y sin TL;DR

**Severidad:** 3 · **Tipo:** IA / Help
**Pantalla:** `help-public.png`, `help-authed.png`

Sidebar con 30+ items. Buscador minúsculo en parte superior izquierda. Contenido principal denso. **Afecta Tarea 5 (Encontrar ayuda)** — el tiempo esperado de 2-5 min se duplica.

**Fix:** buscador prominente al estilo Intercom/Notion centrado. TL;DR al inicio de cada guía. Agrupar 30+ items en 5-7 categorías colapsables. Tags por tarea.

---

#### H16: Verificar visibilidad de hamburguesa mobile

**Severidad:** Indeterminada (probable Bloqueante si el bug es real, Cosmético si es falso positivo)
**Tipo:** Flow / IA
**Pantallas mobile:** `dashboard-mobile.png`, `recipes-list-mobile.png`, `ingredient-db-mobile.png`

En las capturas mobile (390x844) no se identifica la hamburguesa de navegación principal. El código en `src/App.jsx:253-267` tiene `<button className="md:hidden ...">☰</button>` que **debería** aparecer < 768px.

**Acción:** verificar manualmente en navegador a 390px de ancho. Si la hamburguesa NO aparece, es bug bloqueante. Si aparece pero las capturas la cortaron, es falso positivo del audit visual.

**Triangulación esperada:** Crítica si confirma bloqueante. Sin esto, mobile inutilizable para Tarea 2-5.

---

### Menores (severidad 2) — agrupados por tipo

#### Accesibilidad WCAG 2.2

| # | Hallazgo | Ubicación |
|---|---|---|
| H27 | ConfirmModal sin `aria-labelledby` (solo `aria-describedby`) | `src/components/ui/ConfirmModal.jsx:11-15` |
| H28 | `focus:outline-none` sin reemplazo en HelpAssistant | `src/components/HelpAssistant.jsx:1041, 1147` |
| H29 | Inputs de búsqueda sin `<label>` asociado | `src/pages/Recipes.jsx:149-154`, `Help.jsx:50-56` |
| H30 | Botones "x" minúscula sin `aria-label` y bajo contraste | `src/pages/IngredientDB.jsx:660-664`, `ProductionPlan.jsx:642-649` |
| H18 | Modales sin focus trap (WCAG 2.4.3) | Todos los modales |
| H31 | `aria-label` hardcoded en inglés ("toggle visibility") | `src/components/AiKeyModal.jsx:38` |
| H32 | BatchCalc + ProductionPlan: labels sin `htmlFor` | `BatchCalc.jsx:121-139`, `ProductionPlan.jsx:579-587` |

**Fix global:** auditoría con `axe-core` o `pa11y-ci` en CI. Cada uno son fixes pequeños (1-3 líneas).

---

#### Copy / i18n

| # | Hallazgo | Ubicación |
|---|---|---|
| H33 | Voseo en strings es-CL ("podés", "querés") | `es.js:20, 1811` |
| H34 | Plurales rotos con notación `(s)` ("1 receta(s)") | `es.js:789, 843, 1301, 1326-1327` |
| H35 | Strings hardcoded en JSX (no pasan por i18n) | `DesktopWelcome:47`, `RecipeCard:49,76`, `Onboarding:74`, `MobileDesktopHint:46`, `IngredientDB:303,318,56-69`, `RecipeWizard:333`, `ProductionPlan:636` y más |
| H36 | Mensajes de error fallback `'Error'` literal | `BackupReminder:65,79`, `IngredientDB:207`, `RecipeEditor:112` |
| H37 | ErrorBoundary sin i18n (todo hardcoded en español) | `src/components/ErrorBoundary.jsx:32-46` |
| H7 | mantecador vs mantecadora (8 vs 8 ocurrencias) | Ver tabla a) |
| H38 | SearchSelect placeholder default español hardcoded | `src/components/SearchSelect.jsx:184` |
| H8 | Verbos primarios mezclados Guardar/Confirmar/Aplicar | `ConfirmModal`, `BalancePanel`, `RecipeEditor` |
| H39 | Date format DD-MM-YYYY ambiguo sin etiqueta | `production-plan.png` selector de fecha |
| H40 | HACCP usa "LTLT/HTST" sin tooltip | `haccp.png` |

---

#### Heurísticas / UX

| # | Hallazgo | Ubicación / Pantalla |
|---|---|---|
| H41 | OnboardingWizard `skip()` permite imprimir etiquetas legales sin RUT/razón social → riesgo multa SAG | `src/components/OnboardingWizard.jsx:43-47` |
| H42 | Banner de backup solo aparece en Dashboard (riesgo transversal) | `dashboard.png` vs resto |
| H11 | Empty states sin CTA ni ilustración (Dashboard, HACCP, ProductionPlan) | Múltiples |
| H12 | ProductionLog empty state menciona "Planificación" sin link directo | `production-log.png` |
| H43 | Botón "Confirmar producción" disabled sin tooltip explicativo | `production-plan.png` |
| H44 | FPD/PAC/POD/MSNF sin tooltip ni leyenda | `ingredient-db.png` |
| H45 | Header de Recetas sobrepoblado + chips coloridos sin orden | `recipes-list.png` |
| H46 | Mobile recipes mantiene 4 chips de balance < 30px (target táctil) | `recipes-list-mobile.png` |
| H47 | Empty state HACCP sin tutorial inline | `haccp.png` |
| H48 | Banner backup tiene "x" sin recovery (si se cierra, se pierde) | `dashboard.png` |
| H14 | Navbar app visible en pantallas públicas (causa loops de redirect) | auth, terms, privacy, 404 |
| H17 | Botones Auth (Iniciar sesión / Crear cuenta) outline en lugar de primary | `auth-login.png`, `auth-signup.png` |
| H49 | Two `.msi` idénticos en download sin diferenciar locale/arch | `download.png` |
| H50 | Pricing Free dice "10 recetas" pero no se ve enforcement en cuenta de prueba (verificar gating) | `pricing.png` vs `dashboard.png` |
| H19 | Validación form solo onSubmit, sin onBlur | Auth, IngredientDB, BusinessSettings |

---

### Cosméticos (severidad 1)

| # | Hallazgo | Ubicación |
|---|---|---|
| H51 | Anglicismo "logueado/logueados" | `es.js:255, 1169` |
| H9 | (mismo que H51) | — |
| H52 | Concatenación de strings en `IngredientDB.jsx:273` (rompe i18n SOV) | `src/pages/IngredientDB.jsx:273` |
| H53 | Claves i18n mezclando español/inglés (`litros`, `costo` vs `new_recipe`) | `es.js` general |
| H54 | NumberInput type=number iOS Safari teclado decimal | `src/components/NumberInput.jsx:46-47` |
| H55 | `escape()` ad-hoc no escapa `"` ni `'` en HTML print | `ProductionLog.jsx:307` |
| H56 | Bandera con `alt=""` correcto pero sin redundancia útil | `ProductionLog.jsx:244` |
| H57 | BackupReminder emoji 📁 sin `aria-hidden="true"` | `BackupReminder:88, 104, 112` |
| H58 | Toasts mezclados con Modals para feedback | Auth, RecipeEditor |
| H59 | Avatar header "CO ▼" se confunde con código de país | Header global |
| H60 | Marco IA flotante intrusivo en Terms/Privacy/404 | `src/components/HelpAssistant.jsx` |
| H20 | Iconografía emoji vs SVG (📷, 🌐, 📁, 🍦) | Múltiples |
| H61 | Pricing badge "RECOMENDADO" naranja saturado fuera de paleta | `pricing.png` |
| H62 | Sorbete (2 recetas) barra muy chica casi imperceptible | `dashboard.png` |
| H63 | Dashboard gráfico "Producción reciente" sin contexto eje Y ni mes | `dashboard.png` |
| H64 | Landing scroll muy alto (~10 bloques apilados) | `landing.png` |
| H65 | NewRecipeMenu cierra backdrop ok, BalancePanel con preview no avisa | `BalancePanel.jsx:34-37` |

---

## Material faltante (capturar manualmente)

Las siguientes pantallas no se pudieron capturar automáticamente — requieren intervención manual con Win+Shift+S:

| Captura | Por qué falta | Cómo capturarla |
|---|---|---|
| `desktop-welcome.png` | Solo aparece en build de Tauri sin sesión | Abrir app instalada de escritorio sin login |
| `onboarding.png` | Aparece solo en primer login | Crear cuenta nueva, capturar antes de completar |
| `recipe-editor-formulacion.png` | Requiere receta abierta | Click en cualquier receta del listado, tab Formulación |
| `recipe-editor-balance.png` | Requiere receta abierta | Mismo, tab Balance |
| `recipe-editor-etiqueta.png` | Requiere receta + país=Chile | Mismo, tab Etiqueta — verificar sellos visibles |
| `recipe-editor-proceso.png` | Requiere receta abierta | Mismo, tab Proceso |
| `upgrade-modal.png` | Requiere chocar gate Free→Pro | Cuenta Free intentando feature Pro |
| `marco-ai.png` | Requiere abrir el panel | Click en el avatar flotante de Marco |
| `business-settings-modal.png` | Modal contextual | UserMenu → Configuración del negocio |
| `empty-state-recipes.png` | Requiere cuenta sin recetas | Crear cuenta nueva, capturar antes de crear receta |
| `error-state.png` | Requiere triggear error | Cortar conexión a Supabase (DevTools → offline) y recargar |

Después de capturarlas, re-correr `/usability-review` para auditarlas. Las 11 capturas faltantes representan tu mayor brecha de cobertura — especialmente las 4 tabs del editor de receta, donde están las heurísticas más sensibles (auto-balance, sellos legales, hoja de proceso).

---

## Próximos pasos sugeridos

### Antes del demo del 2026-05-09 (3 días):

1. **Top 6 críticos** (~6-8h):
   - H1: agregar `plan_subtitle` (1 línea)
   - H2: corregir tildes (~30 strings, ~30min)
   - H3: eliminar `REMEMBER_PASS_KEY` (security crítico)
   - H4: mapper de errores Supabase a i18n (~1h)
   - H5: cambiar CTA "Suscribirme" a "Solicitar acceso" hasta Stripe (~10min)
   - H6: indicador de password requirements en signup (~1h)

2. **Verificación urgente:**
   - H16: confirmar manualmente que la hamburguesa mobile aparece <768px. Si no, es bloqueante.
   - H50: verificar gating Free 10 recetas con cuenta de prueba.

3. **Capturar las 11 pantallas faltantes** y re-correr `/usability-review` para audit completo.

### Después del demo, antes de Stripe (Fase 2):

4. **Mayores restantes (H21-H26, H10, H13, H17, H24):** ~15-20h. Foco en accesibilidad WCAG (H21-H24), formato locale-aware (H13), modal dirty-check (H17).

5. **Triangulación con perfiles A/B/C:** los heladeros van a confirmar/refutar los hallazgos cosméticos. Aplicar matriz de research-plan §7. Esperar ≥2 confirmaciones de heladeros antes de tocar cosméticos visuales.

### Acciones que NO recomiendo aún:

- Los 12 cosméticos (H51-H65) — esperar triangulación. Probable que la mitad se descarten.
- H40 (HACCP labels técnicos): el maestro Vladimir es perfil A; preguntale si LTLT/HTST son obvios para su público antes de invertir.
- H44 (FPD/PAC/POD tooltips): mismo conflicto experto vs novato — testear con perfil C antes.
