# Auditoría legal — análisis de gaps + plan de acción

**Fecha**: 2026-05-11
**Base**: `docs/auditoria-legal-2026-05-11.md` (informe Sandra Fernández)
**Objetivo**: comparar lo que ya tiene GelatoLab contra lo que pide la Ley 21.719, priorizar gaps, definir plan de acción.

---

## ✅ Lo que ya cumple GelatoLab

| Requisito | Cómo está implementado |
|---|---|
| **Eliminación de cuenta** | Edge function `delete-account` + botón en `BusinessSettingsModal`. Borra `auth.users` con cascade a `user_*` tables |
| **Backup local / portabilidad** | `src/lib/folderBackup.js` sincroniza a carpeta del usuario (idealmente Drive/Dropbox/OneDrive). El usuario tiene su data en su propio sistema |
| **Cookie banner / consent** | `src/components/CookieBanner.jsx` con accept/reject persistido en localStorage |
| **HTTPS / TLS** | gelatolab.app + Supabase usan HTTPS por default |
| **Pasarela de pago externa** | Lemonsqueezy MoR — el cliente paga a Lemonsqueezy, no manejamos tarjetas en nuestros servidores |
| **Audit log de acciones admin** | Migration 004 + tabla `audit_log` + RPC `admin_get_audit_log`. Registra cambios de plan/role/suspend |
| **Arquitectura local-first** | Los stores Zustand persisten primero en localStorage. Cloud sync es opcional (gateado a Pro) |
| **Row Level Security en Supabase** | Cada usuario solo puede leer/escribir sus propias filas en las tablas user_* |
| **Roles user/admin** | Existe columna `profiles.role` ('user'|'admin') que controla acceso al panel admin |
| **Términos de servicio + Privacy Policy + Refund Policy** | Páginas existentes en `/terms`, `/privacy`, `/refund-policy` |

---

## ❌ Gaps identificados

### P0 — Riesgo legal inmediato (cambios de copy + cláusulas)

**G1. T&C no declara ubicación de servidores**
- Sandra: "si usa servidores fuera de Chile (AWS US, Google Cloud), declarar que el país tiene estándares similares"
- Actual: Privacy menciona Supabase pero no especifica jurisdicción
- Fix: agregar cláusula "Datos almacenados en servidores Supabase (AWS US East, EE.UU.). Nivel de protección reconocido por organismos internacionales (Privacy Shield equivalente / SCCs)"

**G2. Falta cláusula de "no uso de datos del cliente para beneficio propio"**
- Sandra: "contrato (o cláusula clara) donde tu esposo se compromete a NO usar los datos de producción del heladero para beneficio propio ni vender estadísticas a proveedores de insumos sin permiso"
- Actual: no existe esa cláusula explícita
- Fix: agregar a Privacy: "Llanquihue Tech SpA NO utiliza los datos de producción, recetas, inventario ni proveedores de los usuarios para beneficio propio ni los comparte/vende a terceros (proveedores de insumos, fabricantes de equipo, asesores, etc.) sin consentimiento expreso del usuario"

**G3. Datos de proveedores no tienen política específica**
- Sandra: "los nombres, teléfonos y correos de ejecutivos de ventas de proveedores son datos personales"
- Actual: la app permite agregar proveedores en `SuppliersModal` con esos campos. Privacy no menciona políticas específicas
- Fix: agregar cláusula "Los datos de contacto de proveedores almacenados por el usuario en el módulo de Inventario son tratados exclusivamente para gestión de compras y logística del usuario. NO se ceden a terceros ni se usan para fines comerciales del proveedor"

**G4. T&C iguales para Free y Pro**
- Sandra: "T&C diferenciados Free vs Pro subrayando la propiedad y custodia local de datos en Pro"
- Actual: una sola página `/terms` para todos
- Fix: agregar sección "Diferencias por tier de suscripción" con párrafos específicos por Free/Pro

**G5. Telemetría (Sentry, Plausible) no documentada explícitamente**
- Sandra: "si usa Google Analytics/Plausible, debe informar qué se rastrea y permitir opt-out"
- Actual: Plausible y Sentry están integrados via env vars. CookieBanner permite reject pero no detalla qué se trackea
- Fix: agregar a Privacy lista explícita de qué tracking usamos: Plausible (eventos anónimos sin cookies), Sentry (error reporting agregado, no incluye PII). Mencionar opt-out via CookieBanner

**G6. Sincronización: aclarar si es directa P2P o pasa por servidor**
- Sandra: "Transparencia en sincronización: explicar si los datos se guardan temporalmente en servidor intermedio o si la conexión es directa P2P"
- Actual: usamos Supabase como intermediario (no es P2P, es client-server). Privacy no lo aclara
- Fix: agregar "La sincronización entre dispositivos del mismo usuario pasa por servidores Supabase. Los datos se almacenan en reposo cifrados por el proveedor (AES-256 at rest). NO usamos cifrado end-to-end actualmente — los datos son legibles por el operador del servidor (Supabase). Para usuarios que requieran E2E, recomendamos usar solo el modo local (sin cuenta o con sync deshabilitado)"

**Tiempo estimado P0**: 2-3 horas (todo es edición de copy en Terms.jsx + Privacy.jsx + agregar i18n keys)

---

### P1 — Blocker para enterprise / clientes muy sensibles (cambios de arquitectura)

**G7. Cifrado en reposo de recetas en localStorage**
- Sandra: "implementar cifrado de datos. Si filtran las recetas de un cliente por falta de seguridad, sancionable"
- Actual: localStorage está en plaintext. Cualquiera con acceso al device puede leer las recetas
- Fix posible: cifrar el contenido de localStorage con clave derivada del password del usuario (PBKDF2 + AES-GCM via Web Crypto API). Complejo: requiere prompt de password al iniciar la app cada sesión, refactor de TODOS los stores Zustand
- Costo: alto (~1 semana de trabajo). Beneficio: protección real contra acceso físico al device
- Recomendación: **diferir** hasta tener cliente que lo demande. La mayoría de heladerías no van a quejarse del riesgo "alguien roba mi laptop"

**G8. Cifrado end-to-end en sync**
- Sandra: "cifrado end-to-end. Aunque el dato pase por el servidor de tu esposo, no puede leer la receta porque solo el PC y el celular del cliente tienen la llave. Libera mucha responsabilidad legal ante una filtración"
- Actual: Supabase guarda los datos en plaintext en sus servidores (RLS protege contra otros usuarios pero no contra Supabase mismo)
- Fix posible: igual que G7, cifrar antes de pushear a Supabase con clave derivada del password
- Costo: muy alto (~2 semanas). Hay que rediseñar la sync para que el cifrado ocurra en cliente. El admin panel TAMPOCO podría leer los datos de los usuarios (lo cual es bueno legalmente pero rompe varias features)
- Recomendación: **diferir**. Ofrecer como feature "Pro Plus / Enterprise" futura

**G9. Roles internos por heladería**
- Sandra: "operario que no vea sueldos ni datos privados del dueño"
- Actual: 1 cuenta = 1 dueño/operador. No hay multi-usuario por heladería
- Fix posible: agregar concepto de "team/organización" + sub-roles (owner / staff / viewer)
- Costo: muy alto (~2-3 semanas de refactor de auth + permisos). Es prácticamente un nuevo modelo de negocio
- Recomendación: **diferir**. Es feature de tier "Business/Enterprise" futura, no Pro

---

### P2 — Mejoras incrementales (cambios localizados)

**G10. Audit log para acciones del usuario** (no solo admin)
- Sandra: "registro de actividades... la nueva ley valora la responsabilidad proactiva"
- Actual: solo audit log para acciones admin del panel
- Fix posible: agregar tabla `user_activity_log` que registre acciones críticas (crear receta, modificar inventario, eliminar lote)
- Costo: medio (~1 día). Útil también para soporte/debugging
- Recomendación: hacer cuando haya bug que requiera tracing

**G11. Reporte exportable de datos personales** (derecho de acceso)
- Sandra: "el administrador debe poder generar reporte de los datos de un empleado si éste lo solicita"
- Actual: el usuario puede hacer backup local de sus datos, pero no hay un botón "exportar mis datos" formal
- Fix posible: nuevo botón "Exportar mis datos" en BusinessSettingsModal que genera ZIP con todas las filas user_* del usuario
- Costo: bajo (~2 horas). Fácil reusar `folderBackup.js`
- Recomendación: hacer junto con P0 (es low-cost, alto valor de cumplimiento)

**G12. Anonimización al eliminar proveedor**
- Sandra: "opción de Eliminación de Proveedor que borre datos personales pero mantenga historial contable anonimizado"
- Actual: eliminar proveedor lo borra completamente. Si el usuario tenía compras asociadas, también se pierden referencias
- Fix posible: al eliminar, reemplazar nombre/email/teléfono por "Proveedor eliminado" pero mantener movimientos
- Costo: bajo (~3 horas)
- Recomendación: hacer cuando el módulo de proveedores tenga más uso

**G13. Notificación específica de security patches** (vs feature releases)
- Sandra: "mecanismo para notificar y forzar actualizaciones de seguridad incluso en versión instalada"
- Actual: auto-updater notifica todos los updates por igual
- Fix posible: agregar flag `security_patch: boolean` al latest.json + UI distinta (modal urgente, no descartable) cuando es security patch
- Costo: bajo (~3 horas)
- Recomendación: implementar en próxima vulnerabilidad real (no preventivo)

**G14. Migración Free → Pro: eliminación cloud cuando se baja**
- Sandra: "una vez que el cliente mude sus recetas al Pro local, tienes obligación de borrar los datos que estaban en la versión gratuita"
- Actual: si un usuario downgrade de Pro a Free (cuando exista billing real), los datos siguen en cloud
- Fix posible: cuando un user pasa a Free, mostrar modal "tus datos serán eliminados del servidor en X días, descárgalos primero". Después borrar.
- Costo: bajo (~4 horas) + edge function que corre en cron
- Recomendación: implementar JUNTO con la integración de Lemonsqueezy SDK (cuando exista billing real)

---

## 📅 Plan de acción recomendado

### Sprint 1 (esta semana, 1 día de trabajo) — Cumplimiento básico Ley 21.719

Atacar P0 + G11 (todos cambios de copy + 1 botón nuevo):

1. **Actualizar `src/pages/Privacy.jsx`** con:
   - Ubicación de servidores (Supabase, AWS US)
   - Cláusula no-uso de datos
   - Política de proveedores
   - Telemetría detallada (Plausible + Sentry)
   - Política de sincronización (no es E2E)

2. **Actualizar `src/pages/Terms.jsx`** con:
   - Sección "Diferencias por tier" (Free vs Pro)
   - Mencionar que Pro local mantiene datos en hardware del cliente

3. **Agregar botón "Exportar mis datos"** en `BusinessSettingsModal.jsx`:
   - Genera ZIP con JSON de todos los user_* del usuario
   - Reutiliza lógica de `folderBackup.js`
   - Cumple derecho de acceso + portabilidad

4. **Commit + push + bump v1.0.16**: para que el desktop instalado también tenga los nuevos términos

### Sprint 2 (cuando haya billing real / Lemonsqueezy) — Migración Free↔Pro

- G14: edge function que borra datos de cuentas que bajaron a Free después de N días
- G13: distinguir security patches de feature releases en auto-updater

### Backlog (diferido hasta haya demanda)

- G7, G8: cifrado E2E (Pro Plus / Enterprise tier)
- G9: roles internos / multi-usuario por heladería (Enterprise tier)
- G10, G12: audit log usuario + anonimización proveedores

---

## 💰 Argumento comercial que destacó Sandra

> "Es un excelente diferenciador comercial. El modelo Pro local protege el secreto industrial del heladero (las recetas no salen de su casa/fábrica), lo cual será un gran argumento de venta frente a otras APPs que guardan todo en la nube."

**Action item de marketing**: cuando actualicemos el landing/pricing, agregar un bullet "Tus recetas en TU computadora — no las compartimos con nadie, ni con nosotros" como diferenciador frente a competidores cloud-only.

---

## ❓ Preguntas pendientes para Sandra

1. **¿Modelo de cobro?** Sandra preguntó si SaaS mensual o venta única. Decisión actual: **SaaS via Lemonsqueezy** (mensual + anual).
2. **¿Funciona offline?** Sandra preguntó. Respuesta: **SÍ, 100% local-first**. Solo sync (Pro) requiere internet.

Si se manda este doc a Sandra como respuesta, confirmamos esos 2 puntos para que ella complete el análisis.
