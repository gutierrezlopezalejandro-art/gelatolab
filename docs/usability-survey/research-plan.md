# Plan de investigación de usabilidad — GelatoLab

Documento de estrategia para la primera ronda de testing con usuarios reales antes del lanzamiento comercial. Pensado para un N pequeño (5-10 testers) liderado por el maestro heladero como gatekeeper.

---

## 1. Por qué hacer esto ahora

GelatoLab está técnicamente listo (auth, gating Free/Pro, balance, etiquetado, HACCP, hojas A4). Pero **nadie fuera del equipo lo usó en condiciones reales**: cocina trabajando, prisa de un sábado, estabilizante distinto al de la receta, conexión irregular, alumno con dudas técnicas mientras el maestro no está cerca.

Si lanzamos sin testear, vamos a descubrir los problemas con clientes que pagan — y eso es churn caro y mala palabra de boca. Si testeamos con 5-10 usuarios bien elegidos antes, descubrimos el 80% de los problemas con riesgo cero.

## 2. Qué queremos aprender (priorizado)

**Tier 1 — Bloqueadores comerciales** (si fallan, no podemos cobrar):
1. ¿Una persona sin nuestra ayuda puede registrarse, descargar la app y crear su primera receta balanceada en menos de 15 minutos?
2. ¿Las etiquetas con sellos chilenos producen archivos legales correctos para imprimir?
3. ¿La hoja A4 de producción reemplaza el papel/Excel actual del usuario?
4. ¿La promesa "ahorrá tiempo, cumple normativa" se siente real cuando la usan, no solo cuando la leen?

**Tier 2 — Optimización** (si fallan, perdemos engagement):
5. ¿El asistente Marco IA es útil o es ruido?
6. ¿El menú navega como esperan? (Recetas, Plan, Producción, HACCP, Ingredientes)
7. ¿El gate Free vs Pro se entiende y no se siente abusivo?
8. ¿La sección de Ayuda resuelve dudas o tienen que escribir al maestro?

**Tier 3 — Pricing & willingness to pay**:
9. ¿A qué precio Pro pagarían cómodamente?
10. ¿Lo recomendarían a otro heladero? (NPS)

## 3. Quién testea (segmentación)

Reclutar testers de **4 perfiles distintos**. Cada uno responde a una pregunta diferente, así que **no compitan entre sí en la priorización**: los issues que levante un perfil pueden ser irrelevantes para los demás. Filtrar siempre por perfil al analizar.

| Perfil | Cantidad | Cómo identificarlos | Qué nos dicen | Método |
|---|:---:|---|---|---|
| **A. Maestro heladero / experto** | 1-2 | El maestro mismo + algún colega referente | Si está balanceado técnicamente vs estado del arte. Si la app respeta el oficio. Riesgo: opiniones muy fuertes que pueden no escalar. | Sesión moderada + encuesta |
| **B. Heladero comercial activo** | 2-3 | Dueños de heladerías chicas que producen 3-5 veces/semana | Realismo: cocina, prisa, equipo no técnico. Es el cliente target #1. | Encuesta + uso libre 1 semana |
| **C. Alumno del curso (principiante)** | 3-5 | Alumnos del [NOMBRE DEL CURSO] que recién terminan | Si la curva de aprendizaje es razonable para alguien con conceptos pero sin años de práctica. | Encuesta sin moderación |
| **D. Experto en diseño / UX-UI / Product designer** | 2-3 | Conocidos del mundo digital, alumnos avanzados de carreras de UX, freelancers | Issues de UX, IA, jerarquía visual, copy y flows que los heladeros no van a articular pero que generan churn. | Heuristic evaluation (no testing de tareas) |

**Importante:** evitá testers que ya conocen la app. Quienes vieron la demo previamente tienen sesgo de cortesía.

**Sobre los expertos en diseño:** ellos NO van a pagar por el producto y NO son target comercial. Pero su feedback acelera años de iteración. La regla: **escucharlos para identificar, no para priorizar**. Si un diseñador dice "el botón está mal alineado" pero ningún heladero se traba, es ruido. Si un diseñador dice "el flujo de signup tiene un dead-end en el paso 3" y el 60% de tus heladeros también se traba ahí, es prioridad alta.

## 4. Método (mixto: moderado + auto-aplicado)

### 4.1 — Testing moderado (perfiles A y B, 1-2 sesiones)

**Formato:** sesión 1:1 vía Zoom o presencial, ~45 minutos. El tester comparte pantalla y resuelve tareas mientras vos observás y tomás notas. **No los ayudes hasta que estén bloqueados >2 minutos.**

**Lo que medís:**
- **Task success rate**: ¿completaron cada tarea?
- **Time on task**: ¿cuánto tardaron?
- **Errors**: ¿cuántos clicks "perdidos" hicieron?
- **Verbalización**: pedíles que piensen en voz alta. Las pausas y "mmm…" son oro.

Las tareas concretas están en [`test-tasks.md`](test-tasks.md).

### 4.2 — Encuesta auto-aplicada (perfil C, todos)

**Formato:** link al survey, 15-20 minutos, lo completan después de usar la app por su cuenta una semana. Mejor enviárselo el día después de su última sesión de uso real.

Las preguntas están en [`survey.md`](survey.md).

### 4.3 — Heuristic evaluation (perfil D, expertos de diseño)

**Formato:** los expertos no usan la app para producir helado — la "auditan" con lentes de UX. La metodología es **evaluación heurística** (Jakob Nielsen, 10 heurísticas validadas en la industria desde 1994).

Cada experto:
1. Recibe un brief de 1 página con qué es el producto, quién es el target y qué buscamos.
2. Recorre la app guiada por una checklist (ver `heuristic-evaluation.md`).
3. Documenta cada hallazgo con: heurística violada, severidad (1-4 según Nielsen), screenshot, recomendación.
4. Sesión de debrief de 30 min para discutir su top 5 issues.

**Output esperado:** 15-30 hallazgos por experto, mezcla de bloqueantes y cosméticos. Quitamos lo cosmético si nadie de los perfiles A/B/C lo siente.

### 4.4 — Combinación

Idealmente cada tester moderado **también** completa la encuesta — los datos cualitativos del moderado iluminan los datos cuantitativos de la encuesta. Los expertos de diseño no completan la encuesta de heladeros (no aplica), tienen su propio output estructurado.

## 5. Herramientas recomendadas

| Herramienta | Para qué | Costo | Por qué esta |
|---|---|---|---|
| **Tally.so** | Encuesta principal | Free hasta ∞ respuestas | Mejor UX que GForms, lógica condicional, embed posible en gelatolab.app después |
| **Google Sheets** | Análisis | Free | Tally exporta directo, fácil filtrar por perfil |
| **Loom** | Grabar sesiones moderadas | Free hasta 25 videos | Audio + pantalla del tester, time-stamps automáticos |
| **Notion / un md por sesión** | Notas de moderado | Free | Estructurado por tarea, tags de severidad |

**Alternativa si querés todo en uno:** [Maze.co](https://maze.co) (test no moderado con tasks + heatmaps + grabación). Free hasta 3 testers/proyecto. Más caro a escala pero deja todo trazado.

## 6. Cuándo (timeline propuesto)

| Semana | Acción |
|---|---|
| **Esta semana (5-9 mayo)** | Demo al maestro + reclutar 5-7 testers via él |
| **Semana 1 después de demo (12-16 mayo)** | Primera sesión moderada con maestro (45 min) |
| **Semanas 2-3 (19-30 mayo)** | Testers reciben app, la usan en su cocina, completan encuesta |
| **Semana 4 (2-6 junio)** | Análisis + decisiones de priorización |
| **Semana 5+ (junio)** | Implementar fixes de Tier 1 antes de Stripe |

## 7. Cómo vamos a leer los resultados

### Cuantitativo

- **SUS Score** (System Usability Scale): score 0-100. Benchmark: <50 inaceptable, 50-68 OK pero mejorable, 68-80 bueno, >80 excelente. SaaS B2B promedio: 68.
- **Task success rate**: % de tasks completadas sin ayuda. Target: >80% en cada task individual.
- **Time on task**: comparar contra el time esperado (lo definimos en `test-tasks.md`). Si se duplica, hay problema de UX.
- **NPS**: -100 a +100. >50 es excelente, 30-50 muy bueno, 0-30 OK, <0 mal. Para SaaS B2B nicho promedio: 40.

### Cualitativo

- **Affinity mapping**: agrupar quotes/observaciones en temas. Recurrencia = severidad.
- **Severidad por issue**: Cosmético / Menor / Mayor / Bloqueante. Solo arreglar Mayor+Bloqueante antes del lanzamiento comercial.
- **Quotes literales**: guardar 3-5 quotes potentes para usar como social proof en la landing después.

### Triangulación entre perfiles

Los issues solo se priorizan cuando **al menos dos perfiles los confirman**. Esto evita:
- "El experto en diseño dice X, pero ningún heladero se trabó" → ruido cosmético, baja prioridad.
- "El maestro reportó Y como bloqueante, pero los alumnos no lo notaron" → posiblemente nivel-experto, no afecta target comercial.
- "Tres heladeros se trabaron en el mismo paso, y un experto identificó la causa de raíz" → bloqueante real, prioridad #1.

Matriz de decisión:

| Confirmaciones | Severidad final |
|---|---|
| Solo experto de diseño (D) lo reporta | Cosmético |
| 1 heladero (A/B/C) lo reporta | Menor |
| 2+ heladeros lo reportan | Mayor |
| 2+ heladeros + experto de diseño identifica la causa | Bloqueante |

## 8. Riesgos y cómo mitigarlos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Sesgo de cortesía (te dicen que les gusta para no ofender) | ALTA | Reforzá: "estoy buscando lo que NO funciona, eso me sirve más". Pregunta abierta "¿Qué te frustró?" antes de "¿Qué te gustó?". |
| Testers nunca usan la app después de la demo | MEDIA | Definí un "compromiso de uso" (3 recetas en 1 semana) antes de darles acceso. Recordatorio por email a los 3 días. |
| Bug crítico en producción durante el test → mala impresión | MEDIA | Errrr crítico = drop everything, hotfix en <2h. Auto-updater Tauri ayuda — sin él habría que pedirles que reinstalen. |
| Solo dan feedback los más extrovertidos | ALTA | Encuesta anónima opcional. Algunos testers piden anonimato — respetalo. |
| Confunden "no me funcionó X" con "no entiendo X" | MEDIA | En la sesión moderada, cuando algo no funciona, primero preguntá "¿qué esperabas que pasara?" antes de explicarles el botón correcto. |
| Compromisos (tester es competidor que copia ideas) | BAJA | NDA simple en el correo de invitación. Sobre todo para perfiles A. |

## 9. Lo que NO testeamos en esta ronda

Limitar el scope. **No** medir en esta ronda:

- Performance (load time, FPS de listas grandes) → eso es testing técnico, otra ronda
- Compatibilidad iOS/Android → todavía no liberamos mobile nativo
- Edge cases legales (ej. etiqueta para Brasil con un alergeno raro) → muestra muy chica para sacar conclusiones
- Escalabilidad multi-equipo (más de 5 mantecadores) → no hay testers con ese setup

## 10. Outputs esperados

Al cierre de la ronda, generamos:

1. **Reporte ejecutivo** (1 página): SUS+NPS+top 3 issues, decisión "lanzar / iterar".
2. **Backlog priorizado** de issues encontrados (Bloqueante/Mayor/Menor/Cosmético).
3. **3-5 quotes literales** para social proof en landing.
4. **Lista de roadmap** de features pedidas que no estaban planeadas.
5. **Decisión de pricing** validada con datos (¿realmente pagarían $9/mes? ¿$5? ¿$15?).

---

> **Recordá:** la meta no es que el tester salga diciendo "qué linda app". La meta es que vos salgas sabiendo exactamente qué cambiar antes de cobrar la primera suscripción.
