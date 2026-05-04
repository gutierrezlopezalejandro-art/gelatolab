# Escenarios de tarea para testing moderado

Documento para vos (el moderador). Lo usás en sesiones 1:1 de ~45 min con el maestro y heladeros activos. NO se le entrega al tester.

---

## Antes de la sesión

**Setup:**
- Cuenta del tester con `plan='pro'` ya creada (necesitamos su email 24h antes)
- Loom o Zoom abierto, grabación activa, audio del tester habilitado
- Hoja de notas con las 5 tareas y casillas de "completó / time / errores / quote"
- Avisarle: "Voy a grabar tu pantalla y voz. Si en algún momento no querés que grabe, decímelo."

**Briefing al inicio (3-4 min):**

> "Gracias por tu tiempo. Antes de empezar, dos cosas:
>
> 1. **Lo que pruebo es la app, no a vos.** Si te perdés, es problema del diseño, no tuyo. Cuanto más te trabes, más útil es para mí.
>
> 2. **Pensá en voz alta.** Decime qué estás pensando, qué buscás, por qué hiciste click ahí. No sé qué pensás si no me lo decís.
>
> Te voy a pedir que hagas algunas tareas. Si te trabás, **no te voy a ayudar enseguida** — es parte del test. Si pasan unos minutos sin avanzar, ahí sí te oriento. ¿Te parece?"

---

## Tarea 1 — Registrarte y entrar (esperado: 2-4 min)

> **Pedido al tester:**
> "Imaginá que un colega te recomendó GelatoLab. Abrí gelatolab.app y entrá. Quiero llegar a la pantalla principal de la app, donde veo el dashboard."

### Qué observar
- ¿Encuentra el botón "Probar gratis" rápido?
- ¿El flujo de signup tiene fricción? (campos confusos, password requirements)
- ¿Confirma el email rápido o se queda buscándolo en spam?
- ¿El primer ingreso le aparece el OnboardingWizard? ¿Lo completa o lo cierra sin completar?

### Métricas
- ✅ Completó: SÍ / NO
- ⏱ Tiempo: ___ min ___ seg
- ❌ Errores (clicks perdidos): ___
- 💬 Quote: "______"

### Issues típicos a buscar
- "¿Tengo que poner mi tarjeta?" → confusión sobre el plan Free
- "No me llegó el mail" → revisar template de Supabase
- "¿Para qué me piden el país?" → onboarding no explica el por qué

---

## Tarea 2 — Crear tu primera receta balanceada (esperado: 8-15 min)

> **Pedido al tester:**
> "Quiero que crees una receta de gelato de pistacho. Debería quedar balanceada — todos los parámetros técnicos en verde o aceptable. No te digo cómo, hacelo como te resulte natural."

### Qué observar
- ¿Va al menú Recetas o se confunde con Plan / Producción / Ingredientes?
- ¿Encuentra el botón "+ Nueva"?
- ¿Elige Asistente / Plantilla / Desde cero?
- ¿Si elige asistente, lo entiende? ¿O lo abandona a mitad?
- ¿Detecta los indicadores verde/amarillo/rojo de los parámetros?
- ¿Usa Auto-balance? ¿Confía en la propuesta?
- ¿Le pasta de pistacho está en la base de ingredientes? ¿La encuentra fácil?

### Métricas
- ✅ Completó: SÍ / NO / PARCIAL (con qué parámetros aún en rojo: ___)
- ⏱ Tiempo: ___ min
- ❌ Errores: ___
- 💬 Quote: "______"

### Issues típicos a buscar
- "Claro, FPD, eso ya sé, pero ¿esto qué unidad es?" → falta tooltip/glosario contextual
- "No encuentro el pistacho..." → buscador débil en el dropdown de ingredientes
- "¿Aplicar todo automáticamente? Pero no entiendo qué va a tocar" → diff preview no es claro
- "El POD me lo dejó en 22 pero yo sé que tiene que ser 18" → desconfianza del algoritmo

---

## Tarea 3 — Imprimir una etiqueta nutricional con sellos chilenos (esperado: 3-6 min)

> **Pedido al tester:**
> "Esa receta de pistacho que acabás de hacer la vas a vender en pote de medio litro en Santiago. Necesito ver la etiqueta nutricional con los sellos correspondientes, lista para imprimir."

### Qué observar
- ¿Va a la pestaña Etiquetado / Nutricional dentro del editor de receta? ¿O busca en otro menú?
- ¿Configura el país=Chile? ¿O ya lo había puesto en onboarding?
- ¿Entiende los sellos que aparecen automáticamente?
- ¿Encuentra el botón Imprimir?
- ¿La vista previa le da confianza?
- ¿Le falta info que se pone a mano (peso, fabricante, lote)?

### Métricas
- ✅ Completó: SÍ / NO
- ⏱ Tiempo: ___ min
- ❌ Errores: ___
- 💬 Quote: "______"

### Issues típicos a buscar
- "¿Por qué no me sale el sello de azúcar si lleva mucha azúcar?" → umbral mal configurado o cálculo erróneo
- "Pero falta el RUT del fabricante / lote / fecha de vencimiento" → campos mandatorios no contemplados
- "Esto es para 100g pero yo lo vendo en 60g..." → tamaño de porción configurable
- "Está lindo pero no se ve legal" → falta validación visual con etiquetas reales chilenas

---

## Tarea 4 — Imprimir la hoja A4 de producción (esperado: 2-4 min)

> **Pedido al tester:**
> "Mañana vas a producir 5 litros de ese pistacho. Necesito una hoja A4 imprimible para que tu equipo trabaje en la cocina, con los gramos reales para 5 litros, los pasos del proceso, y casillas para firmar."

### Qué observar
- ¿Encuentra el botón "Hoja de proceso" / "Imprimir"?
- ¿Tiene que ir a Plan o lo hace desde la receta directa?
- ¿Cambia los litros a 5 o queda en el default?
- ¿La hoja se imprime con el formato esperado?
- ¿Los pasos del proceso están bien para SU tipo de producción (mantecador específico, pasteurización X)?

### Métricas
- ✅ Completó: SÍ / NO
- ⏱ Tiempo: ___ min
- ❌ Errores: ___
- 💬 Quote: "______"

### Issues típicos a buscar
- "Yo producto en lotes de 8L no de 5..." → calculator de batch poco intuitivo
- "Faltan los pasos para mi mantecador X" → procesos genéricos vs específicos por equipo
- "No imprime la marca de mis ingredientes" → quieren versión "operativa" con marca real
- "Lo encuentro pero no sé desde dónde imprimirla mañana cuando empiece la producción" → flujo Plan → Producción no claro

---

## Tarea 5 — Encontrar ayuda sobre algo no obvio (esperado: 2-5 min)

> **Pedido al tester:**
> "Imaginá que querés saber **cómo configurar el inventario para que se descuente automáticamente cuando producís un lote**. ¿Cómo lo averiguás dentro de la app, sin googlear ni preguntarle a nadie?"

### Qué observar
- ¿Va a la sección Ayuda (icono ?)?
- ¿Le pregunta a Marco?
- ¿Busca en el menú lateral del Help?
- ¿Encuentra una guía relevante?
- ¿La guía le resuelve la duda o tiene que reformularla?

### Métricas
- ✅ Encontró respuesta: SÍ / NO / PARCIAL
- ⏱ Tiempo: ___ min
- ❌ Cantidad de búsquedas / preguntas reformuladas: ___
- 💬 Quote: "______"

### Issues típicos a buscar
- "No vi el icono de ayuda" → falta visibilidad del `?`
- "Busqué inventario y me salió cualquier cosa" → buscador del Help débil
- Marco le da una respuesta IA equivocada → afecta confianza
- "Encontré la guía pero está muy larga, no leo" → necesita TL;DR al inicio de cada guía

---

## Después de las 5 tareas — Debrief (8-10 min)

> "Listo, terminamos las tareas. Ahora unas preguntas finales sin presión."

### Preguntas de debrief

1. **Si tuvieras que dar UNA sola crítica, ¿cuál sería?** (la más importante)
2. **Si tuvieras que destacar UNA cosa que te encantó, ¿cuál sería?**
3. **¿Hubo algún momento en que pensaste "ya está, abandono"?**
4. **¿Lo usarías en tu cocina la próxima semana en producción real? ¿Por qué sí o no?**
5. **Si fueras dueño de GelatoLab, ¿qué cambiarías HOY (mañana lunes)?**
6. **¿Pagarías por la versión Pro? ¿A qué precio te parecería razonable mensual?**

### Cierre

> "Muchas gracias. Esto me sirve mucho. Te voy a mandar también la encuesta corta por mail para que la completes con calma — son 15 minutos. Si tenés ganas de seguir conectado, te aviso cuando lancemos cambios basados en tu feedback."

---

## Después de la sesión — Tu trabajo

### Inmediatamente (mismos 15 min)

- Mientras la sesión está fresca, escribí un dump de notas en un archivo / Notion: cada momento donde el tester se trabó, qué dijo, qué pensaste vos viéndolo.

### Dentro de 24h

- Revisar la grabación a 1.5x. Marcar timestamps de los momentos críticos.
- Llenar la planilla con métricas (completó/tiempo/errores) por tarea.
- Identificar 1-3 issues nuevos que NO habías visto antes.

### Después de 3+ sesiones

- **Affinity mapping**: poner todos los issues en post-its (digitales — Miro/Mural/Notion). Agrupar por tema. La columna más alta es la prioridad #1.
- Asignar severidad: Bloqueante / Mayor / Menor / Cosmético.
- Decidir qué arreglás antes del lanzamiento comercial (regla simple: solo Bloqueante + Mayor).

---

## Plantilla de planilla de notas (1 por sesión)

```
================================================
TESTER: [nombre o seudónimo si pidió anonimato]
PERFIL: A maestro / B heladero comercial / C alumno
FECHA: ____
DURACIÓN TOTAL: ___ min
LINK DE GRABACIÓN: ____
================================================

TAREA 1 — Registrarse
✅ Completó: SÍ / NO
⏱ Tiempo: ___ min
❌ Errores: ___
💬 Quote relevante: "______"
ISSUES: ____

TAREA 2 — Primera receta balanceada
✅ Completó: SÍ / NO / PARCIAL
⏱ Tiempo: ___ min
❌ Errores: ___
💬 Quote relevante: "______"
ISSUES: ____

TAREA 3 — Etiqueta con sellos
✅ Completó: SÍ / NO
⏱ Tiempo: ___ min
❌ Errores: ___
💬 Quote relevante: "______"
ISSUES: ____

TAREA 4 — Hoja A4
✅ Completó: SÍ / NO
⏱ Tiempo: ___ min
❌ Errores: ___
💬 Quote relevante: "______"
ISSUES: ____

TAREA 5 — Buscar ayuda
✅ Completó: SÍ / NO / PARCIAL
⏱ Tiempo: ___ min
❌ Errores: ___
💬 Quote relevante: "______"
ISSUES: ____

DEBRIEF (respuestas a las 6 preguntas finales):
1. ____
2. ____
3. ____
4. ____
5. ____
6. ____

OBSERVACIONES GENERALES DEL MODERADOR:
- ____
- ____

ACCIONES PRIORITARIAS (issues a arreglar pronto):
- [ ] BLOQ ____
- [ ] MAYOR ____
- [ ] MENOR ____
================================================
```
