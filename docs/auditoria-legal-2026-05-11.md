# Auditoría legal — Ley N° 21.719 (Protección de Datos Personales, Chile)

**Fecha**: 2026-05-11
**Auditora**: Sandra Fernández
**Contexto**: GelatoLab como herramienta B2B de logística y gestión interna para heladerías. Modelo Freemium (Gratis + Pro) con datos local-first y sincronización opcional via Supabase.

> Nota: este es un resumen del informe original recibido vía mensaje. La fuente está reproducida íntegra al final del documento. El análisis de gaps + plan de acción está en `docs/auditoria-legal-gaps-2026-05-11.md`.

---

## Marco general (Ley 21.719)

La nueva Ley de Protección de Datos Personales chilena (vigente, sucesora del DFL 1/1999) endurece los estándares para cualquier sistema que maneje:
- Datos de personas naturales (clientes, empleados, contactos de proveedores)
- Información de negocios (que también puede contener datos personales)
- Tratamiento de datos en tránsito o en reposo

El incumplimiento puede llevar a sanciones de la nueva **Agencia de Protección de Datos**.

---

## 1. Secreto industrial y ciberseguridad

Las recetas son el activo más importante del heladero. Aunque la ley se enfoca en datos personales, la falta de seguridad técnica puede ser sancionable si filtra datos de un cliente.

**Requisito**: implementar cifrado de datos. Si las recetas de un cliente se filtran por falta de seguridad, la Agencia puede sancionar a la plataforma.

## 2. Gestión de inventario y proveedores

Los nombres, teléfonos y correos de ejecutivos de ventas de proveedores **son datos personales**.

**Requisito**: cláusula explícita en T&C indicando que esos datos solo se usan para gestión de compras/logística y NO se ceden a terceros.

## 3. Control de calidad y trazabilidad

Si se registra "Juan Pérez aprobó el lote 102", se está tratando datos de trabajadores.

**Requisito**: el administrador (jefe) debe poder generar reporte de los datos de un empleado si éste lo solicita (derecho de acceso).

## 4. Sincronía escritorio-mobile (transferencia de datos)

Si la sincronización pasa por servidor externo (nube), se considera "tratamiento de datos".

**Requisito**: declarar en T&C el país donde están los servidores. Si están fuera de Chile (AWS US, Google Cloud), declarar que el país tiene estándares de protección equivalentes. Los grandes proveedores cumplen, pero hay que **declararlo explícitamente**.

---

## Recomendaciones por módulo

| Módulo | Riesgo Legal | Solución Sugerida |
|---|---|---|
| **Recetario** | Fuga de propiedad intelectual | Cifrado en reposo (base de datos encriptada) |
| **Inventario** | Datos personales de proveedores | Opción "Eliminación de Proveedor" que borre datos personales pero mantenga historial contable anonimizado |
| **Producción** | Datos de desempeño de empleados | Roles de usuario con permisos limitados (operario no ve sueldos ni datos privados del dueño) |
| **Logística** | Geolocalización (si rastrea entregas) | Pedir permiso explícito para GPS y solo durante horas de trabajo |

**Consejo transversal**: incluir un **Registro de Actividades (audit log)**. La nueva ley valora la "Responsabilidad Proactiva" — si algo falla, tener un registro de quién entró y qué hizo demuestra diligencia.

---

## Modelo Freemium — análisis por tier

### Tier 1: Gratuito anónimo (visitante / demo)

Si el usuario puede probar sin crear cuenta (datos volátiles):
- ✅ **No recolección de datos** = mejor estrategia. Sin registro = sin datos a proteger según la ley.
- Si permite subir receta de prueba: aviso explícito de que **se borrará al cerrar sesión**.

### Tier 2: Gratuito registrado (captación de datos)

Aquí la ley empieza a aplicar con fuerza porque existe perfil de usuario.

- **Consentimiento específico y libre**: NO basta con "Acepto términos". Debe haber casilla **desmarcada por defecto** para aceptar la Política de Privacidad.
- **Finalidad clara**: si se usa el correo para enviar ofertas/marketing, pedir permiso específico para fines comerciales (separado del registro técnico).
- **Seguridad de la cuenta**: misma responsabilidad de proteger contraseña y datos básicos que en el modo pagado.

### Tier 3: Pro (datos de negocio y financieros)

El tier más sensible.

- **Cifrado reforzado**: encriptación de grado bancario para bases de datos de producción.
- **Datos de pago**: NO guardar tarjetas de crédito en servidores propios. Usar pasarela (Transbank/Flow/Stripe/Lemonsqueezy). Esto libera responsabilidad legal sobre datos financieros sensibles.
- **Contrato de Encargado de Tratamiento**: cláusula clara donde el proveedor se compromete a NO usar los datos de producción del heladero para beneficio propio ni vender estadísticas a proveedores de insumos sin permiso.

### Aplicable a ambos tiers registrados

| Requerimiento | Implementación |
|---|---|
| **Derecho de Supresión** | Botón "Eliminar mi cuenta" que borre efectivamente datos del servidor (no solo desactivar) |
| **Sincronización segura** | HTTPS/TLS para todo tránsito de datos (no texto plano por la red) |
| **Cookies y rastreo** | Si se usa Google Analytics/Plausible/etc, informar al usuario qué se rastrea y permitir opt-out |

**Consejo**: para el Modo Pro, función de **"Backup Local"** (descargar inventario y recetas en archivo propio). La ley valora que el usuario tenga control de su información — esto cumple el principio de **Portabilidad**.

---

## Modelo "Pro local + Free cloud" — análisis específico

Este enfoque (Pro instalado local, Free en cloud) es **inteligente desde la responsabilidad legal**: el proveedor actúa menos como "custodio" y más como proveedor de software. Pero hay matices.

### 1. Concepto de "Responsable del Tratamiento"

- **En Pro local**: el maestro heladero es el Responsable. Él decide qué datos mete, cómo los respalda, quién accede.
- **Trampa legal**: si la app Pro envía telemetría/reportes de errores automáticamente al servidor del proveedor, O si la sincronización con la app móvil pasa por servidor del proveedor → vuelve la responsabilidad al proveedor.
- **Solución**: cláusula explícita en T&C:

> "En la versión Pro, el almacenamiento y respaldo de los datos de producción y recetas reside exclusivamente en el hardware del cliente. El proveedor no tiene acceso a dicha información salvo que medie un servicio de soporte técnico solicitado por el usuario."

### 2. La sincronización (puente de datos)

Si la app móvil debe sincronizarse con el desktop del cliente:
- Aunque el dato VIVA en el PC del cliente, mientras VIAJA por la nube del proveedor, la ley considera tratamiento de datos.
- **Recomendación**: cifrado **end-to-end**. Aunque el dato pase por el servidor del proveedor, no puede leerlo (solo PC y celular del cliente tienen la llave). Libera mucha responsabilidad ante una filtración.

### 3. Actualizaciones y parches de seguridad

La ley sanciona la **negligencia**.
- Si el software Pro tiene vulnerabilidad de seguridad conocida y no se envía actualización para corregirla → cliente puede demandar alegando que la herramienta era insegura.
- **Consejo**: mecanismo para notificar y forzar actualizaciones de seguridad incluso en versión instalada.

### 4. Migración Free → Pro (portabilidad + supresión)

Cuando un usuario pasa del Free (cloud) al Pro (local):
- Hay que **entregarle sus datos** (Portabilidad).
- Una vez migrados al PC, el proveedor tiene **obligación de borrar** los datos que estaban en el Free, salvo que el cliente pida mantener respaldo en la nube (lo cual reactiva la responsabilidad).

---

## Tareas concretas que pide el informe

1. **T&C diferenciados Free vs Pro** subrayando la propiedad y custodia local de datos en Pro.
2. **Transparencia en sincronización**: explicar si los datos se guardan temporalmente en servidor intermedio o si la conexión es directa P2P.
3. **Derecho de cancelación**: usuario Free puede borrar cuenta, y eso debe eliminar realmente sus recetas del servidor.

---

## Cierre

El modelo "Pro local" es un **gran diferenciador comercial**: protege el secreto industrial del heladero (las recetas no salen de su casa/fábrica) frente a competidores que guardan todo en la nube.

Preguntas que dejó abiertas Sandra para la próxima ronda:
- ¿Cobran SaaS mensual o venta única? (cambia cómo redactar el contrato)
- ¿La app funciona offline? (clave para heladerías con plantas en subterráneos sin señal)

---

## Fuente original (mensajes WhatsApp Sandra Fernández, 2026-05-11)

> [12:12 p.m.] Si la plataforma es exclusivamente para *logística y gestión interna* (B2B), el riesgo disminuye al no manejar datos masivos de consumidores finales, pero la *Ley N° 21.719* sigue siendo muy relevante porque la información de un negocio también puede contener datos personales.
>
> Para que no se les escape nada, aquí tienen los puntos clave enfocados en gestión interna:
>
> **1. El "Secreto Industrial" y la Ciberseguridad**
> Aunque la ley se enfoca en datos personales, para un heladero sus recetas son su mayor activo. Seguridad Obligatoria: La nueva ley exige "medidas de seguridad adecuadas". Si la APP guarda recetas (que son propiedad intelectual del maestro), deben implementar *cifrado de datos*. Si hay una filtración de las recetas de un cliente por falta de seguridad, la nueva Agencia de Protección de Datos podría sancionar a la plataforma por no cumplir con los estándares de seguridad técnica que exige la ley.
>
> **2. Gestión de Inventario y Proveedores**
> Al manejar inventario, seguramente habrá una base de datos de proveedores. Datos de Contacto: Los nombres, teléfonos y correos de los ejecutivos de ventas de los proveedores son datos personales. Transparencia: La plataforma debe tener una cláusula que indique que esos datos solo se usarán para la gestión de compras y logística, y que no serán cedidos a terceros (por ejemplo, para que otras empresas les vendan insumos).
>
> **3. Control de Calidad y Trazabilidad**
> En heladería, el control de calidad suele registrar quién hizo la mezcla, quién midió el pH o quién despachó. Datos de Empleados: Si la APP registra "Juan Pérez aprobó el lote 102", están tratando datos de trabajadores. Derecho de Acceso: El maestro heladero (el jefe) debe saber que sus empleados tienen derecho a saber qué datos de ellos están en la APP. Tu esposo debe facilitar que el administrador pueda generar un reporte de estos datos si un trabajador lo solicita.
>
> **4. La "Sincronía" Escritorio-APP**
> Nube vs. Local: Si la sincronización pasa por un servidor externo (nube), se considera "tratamiento de datos". Localización: Si tu esposo usa servidores fuera de Chile (como AWS en EE.UU. o Google Cloud), la nueva ley exige que el país de destino tenga estándares similares de protección. Afortunadamente, los grandes proveedores cumplen, pero él debe declararlo en sus "Términos y Condiciones".
>
> **Recomendaciones por módulo** (ver tabla al inicio del documento).
>
> Un último consejo: Dado que es una herramienta técnica, te sugiero incluir un *"Registro de Actividades" (Log)*. La nueva ley valora mucho la "Responsabilidad Proactiva".
>
> [12:16 p.m.] Modelo Freemium (ver sección detallada arriba). Sobre Modo Gratis vs Pro vs Datos de Pago vs Cifrado de grado bancario vs Pasarela externa vs Contrato de Encargado de Tratamiento.
>
> [12:16 p.m.] Modelo Pro local: matices del "Responsable del Tratamiento", trampa legal de la telemetría, sincronización end-to-end, parches de seguridad, migración Free→Pro con portabilidad y supresión.
