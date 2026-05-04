# Heuristic evaluation — protocolo para expertos de diseño

Documento que entregás a cada experto de diseño/UX-UI que vaya a auditar GelatoLab. Reemplaza el survey y las task scenarios para este perfil — su trabajo es distinto.

---

## Brief para el evaluador

### Qué es GelatoLab

GelatoLab es una webapp + app de escritorio (Tauri) para **formulación profesional de helado y gelato**. Está dirigida a heladerías comerciales y maestros heladeros. Los usuarios son profesionales del oficio pero no tech-savvy: trabajan con cocina, prisa, papel, equipo no técnico.

**Funciones principales:**
1. Formulación de recetas con balance técnico automático (PAC, POD, FPD, MSNF)
2. Etiquetado nutricional con sellos legales por país (Chile Ley 20.606, Brasil RDC 429, UE 1169)
3. Hojas A4 imprimibles para cocina
4. Inventario, HACCP, comparación de recetas
5. Asistente Marco con IA

**Stack:** React 18, Vite, Supabase (Postgres + Auth), Tauri 2 desktop, Capacitor iOS, i18n en 8 idiomas.

**Stage actual:** beta cerrada antes del lanzamiento comercial. Hay gating Free vs Pro implementado pero Stripe no está conectado — todos los testers reciben Pro a mano.

### Qué quiero que evalúes

NO es un usability test de tareas. Vos no sos el cliente. **Es una evaluación heurística** siguiendo las 10 heurísticas de Jakob Nielsen, con foco en:

- **IA (Information Architecture)**: ¿la nav y el flujo tienen sentido?
- **Consistencia visual**: tipografía, color, espaciado, jerarquía
- **Copywriting**: tono, claridad, voseo/tuteo, accesibilidad de la jerga técnica
- **Onboarding y first-run**: ¿el primer ingreso convierte o frustra?
- **Patrones de gating Free→Pro**: ¿se sienten justos o abusivos?
- **Accesibilidad** (WCAG AA básico): contraste, ARIA, keyboard nav

### Qué NO necesito que mires

- Performance / load time (eso lo medimos por separado)
- Bugs funcionales (si una feature crashea, reportá pero no es el foco)
- Compatibilidad mobile nativa (todavía no liberada — capacitor iOS está en alpha)
- Lógica del negocio (si POD=18 está bien o no — eso lo evalúan los heladeros)

### Cómo accedés

1. Te creo una cuenta con `plan='pro'` activo. Te paso usuario y password al confirmar.
2. URL: https://gelatolab.app
3. Si querés probar la versión desktop: https://gelatolab.app/#/download
4. La sesión de uso es a tu ritmo. Sugiero 1-2 horas distribuidas en 2-3 días para que la "fatiga" del primer uso se vaya y veas issues con cabeza fresca.

### Cómo me lo entregás

Plantilla de hallazgo (ver al final). Una entrada por issue. Mínimo 10 hallazgos, ideal 20-30. Si encontrás más de 50, es señal de que el producto está más verde de lo que pensé — agradezco igual.

**Formato preferido:**
- Notion / Google Docs / Markdown — lo que te resulte natural
- Screenshots con anotaciones (Skitch / Cleanshot / Snipping Tool con flechas y círculos)
- Si grabás videos cortos de 30 seg con Loom para flujos complejos, mejor

**Plazo sugerido:** 1 semana desde que recibís acceso. Después agendamos un debrief de 30 min para discutir tu top 5 issues.

**Compensación:** [definir]. Sugerencias:
- Crédito en la sección "Made better with feedback from" del sitio
- Cuenta Pro lifetime gratis
- Pago en efectivo según tu tarifa estándar

---

## Las 10 heurísticas de Nielsen aplicadas a GelatoLab

Para cada una, **ejemplos concretos de qué buscar específicamente en este producto**. No te limites a estos — son disparadores.

### 1. Visibilidad del estado del sistema

> El sistema debe siempre informar al usuario qué está pasando.

**En GelatoLab buscar:**
- Cuando guardo una receta, ¿se ve un toast/feedback claro?
- Cuando aplico Auto-balance, ¿se ve qué está calculando o aparece resultado de la nada?
- Cuando los datos se sincronizan con Supabase, ¿hay indicador de "sincronizando"?
- En el flujo offline (Tauri sin internet), ¿queda claro que estoy offline?
- El selector de idioma — al cambiar a un idioma no cargado, ¿hay loading state mientras llega el chunk?

### 2. Coincidencia con el mundo real

> Hablar el lenguaje del usuario, no del sistema.

**En GelatoLab buscar:**
- Términos como FPD, PAC, POD, MSNF — ¿están explicados en el primer encuentro?
- ¿"Mantecador", "pasteurizador", "neutro" coinciden con cómo lo dicen los heladeros chilenos vs brasileños vs italianos?
- Iconos: ¿el icono de "balance" se entiende sin tooltip?
- Voseo vs tuteo: vimos que el copy mezclaba "instalá" con "instala". ¿Detectás más casos?
- "Sub-receta", "variegato": ¿son nombres del oficio o invento del producto?

### 3. Control y libertad del usuario

> Salidas de emergencia claras, undo/redo.

**En GelatoLab buscar:**
- Después de aplicar Auto-balance, ¿hay deshacer? Si no, ¿el preview previo del diff alcanza?
- Borrar una receta: ¿hay confirmación? ¿hay papelera o es destructivo?
- Si me equivoco de país en onboarding, ¿lo cambio fácil después?
- Si conecto carpeta de backup y después quiero desconectarla, ¿se puede?

### 4. Consistencia y estándares

> No hacer que el usuario se pregunte si distintas palabras o acciones significan lo mismo.

**En GelatoLab buscar:**
- "Guardar" vs "Confirmar" vs "Aplicar" — ¿se usa el verbo correcto en cada caso?
- Botones primarios: ¿siempre el mismo color/posición?
- Modales: ¿el botón de cerrar está siempre arriba a la derecha?
- Iconos en menú: ¿todos del mismo set visual o mezcla emoji + iconos custom?
- Plurales en i18n: "1 receta" vs "0 recetas" vs "2 recetas" — ¿gramática correcta?

### 5. Prevención de errores

> Mejor que un mensaje de error es un diseño que evita que ocurra.

**En GelatoLab buscar:**
- ¿Se puede dejar una receta con gramos negativos? ¿Con suma >100%?
- Etiqueta: ¿se imprime aunque falten datos legales obligatorios (peso del envase, RUT)?
- Eliminar un ingrediente que está usado en 5 recetas: ¿avisa antes?
- HACCP: ¿se puede registrar una temperatura imposible (ej. 200°C en cámara fría)?

### 6. Reconocer antes que recordar

> Minimizar la carga de memoria del usuario.

**En GelatoLab buscar:**
- En el dropdown de ingredientes, ¿hay buscador con autocompletar o tengo que recordar el nombre exacto?
- Las marcas de ingredientes que ya configuré, ¿aparecen sugeridas la próxima vez?
- En la hoja de proceso, ¿los pasos genéricos sirven o tengo que recordar cómo era para mi mantecador específico?
- Para volver a una receta editada hace 2 meses, ¿la encuentro fácil?

### 7. Flexibilidad y eficiencia de uso

> Aceleradores para usuarios expertos sin entorpecer al novato.

**En GelatoLab buscar:**
- ¿Hay atajos de teclado en el editor de recetas? (ej. Ctrl+S para guardar)
- ¿Puedo duplicar una receta para hacer una variante rápido?
- Plantillas: ¿son útiles o se sienten obstaculizadoras?
- Power user: ¿puedo importar múltiples ingredientes desde CSV?
- ¿Puedo armar mis propias categorías o estoy atado a las que vienen?

### 8. Diseño estético y minimalista

> Cada elemento extra compite por atención con lo importante.

**En GelatoLab buscar:**
- Dashboard: ¿información esencial al frente o todo apilado?
- Editor de receta: 5 tabs (formulación, balance, etiqueta, congelamiento, diagnóstico) — ¿es manejable o abruma?
- Marco IA con avatar: ¿se siente útil o intrusivo?
- Banner del CookieBanner: ¿es obstructivo? ¿el copy es legible?
- Las cards de download (Win/Mac/Linux): ¿la jerarquía guía bien?

### 9. Ayudar a reconocer, diagnosticar y recuperarse de errores

> Mensajes de error en lenguaje claro, sin códigos crípticos.

**En GelatoLab buscar:**
- Si Supabase tira un error de auth, ¿qué ve el usuario?
- Si el archivo ZIP que importo está corrupto, ¿el mensaje le dice qué hacer?
- Si el escáner de barras no reconoce el código, ¿qué pasa?
- En el balanceo: ¿qué pasa si no hay convergencia? ¿le dice "no se pudo balancear" o se queda en loading?

### 10. Ayuda y documentación

> Aunque sería mejor que no fuera necesaria, es importante proveerla.

**En GelatoLab buscar:**
- La sección Ayuda: ¿el buscador funciona bien? ¿el contenido está organizado?
- Marco IA: ¿reemplaza o complementa la sección Ayuda? ¿se confunde el usuario?
- Onboarding inicial: ¿enseña lo justo o sobra/falta?
- ¿Hay tooltips contextuales en los términos técnicos al pasar el mouse?
- En el Error 404, ¿el mensaje guía al usuario o lo deja perdido?

---

## Severidad de los hallazgos

Usar la **escala de Nielsen (0-4)**:

| Nivel | Nombre | Descripción |
|:---:|---|---|
| **0** | No es un problema | Discutible, puede ser preferencia personal |
| **1** | Cosmético | Solo arreglar si hay tiempo extra |
| **2** | Menor | Importante pero baja prioridad |
| **3** | Mayor | Importante y alta prioridad |
| **4** | Bloqueante / catastrófico | Imperativo arreglar antes del lanzamiento |

**Calibración:** un hallazgo de severidad 4 es algo que **impide al usuario completar su tarea principal o pone en riesgo su negocio** (ej. una etiqueta legal con sello calculado mal expone al usuario a multas SAG).

---

## Plantilla de hallazgo

Copiar esta plantilla por cada issue encontrado:

```markdown
### Hallazgo #__

**Heurística violada:** [N° y nombre, ej. "5. Prevención de errores"]
**Severidad:** [0-4]
**Pantalla/flujo:** [donde ocurre, ej. "Editor de receta → Etiqueta nutricional"]
**Tipo:** [IA / Visual / Copy / Accesibilidad / Flow / Otro]

**Qué pasa:**
[Descripción objetiva del comportamiento actual. Sin juicio. Sin recomendación todavía.]

**Por qué es un problema:**
[Cómo afecta al usuario target — heladero comercial. Cuál es el costo concreto: tiempo perdido, error producido, frustración, abandono.]

**Recomendación:**
[Solución concreta. Idealmente con un mock visual o referencia a un patrón conocido. Si proponés varias alternativas, ranquealas.]

**Screenshot / video:**
[Adjunto. Si es video, link de Loom de <30 seg.]

---
```

### Ejemplo lleno

```markdown
### Hallazgo #1

**Heurística violada:** 4. Consistencia y estándares
**Severidad:** 2 (Menor)
**Pantalla/flujo:** Página /download → cards de instaladores Windows
**Tipo:** Visual / Copy

**Qué pasa:**
La sección "Otros formatos" del card de Windows muestra dos entradas idénticas:
- ".msi   3.4 MB"
- ".msi   3.4 MB"

Sin más diferenciación visible.

**Por qué es un problema:**
El usuario percibe contenido duplicado, lo que (a) genera desconfianza ("¿la app está bugueada?")
y (b) le obliga a clickear ambos para descubrir que en realidad uno es es-ES y el otro
en-US. Para un usuario chileno que solo quiere descargar y no quiere fricción,
es 30-60 segundos perdidos.

**Recomendación:**
Mostrar el sufijo de localización de cada MSI:
- ".msi (Español)   3.4 MB"
- ".msi (English)   3.4 MB"

Alternativa: detectar el idioma del navegador y mostrar primero la versión local,
ocultando la otra detrás de un "Ver más idiomas".

**Screenshot:**
[adjunto download_msi_dup.png]
```

---

## Después de la sesión: debrief de 30 min

Cuando termines tu evaluación, agendamos un Zoom de 30 min para que me cuentes:

1. Tu **top 5 issues** ranqueados por severidad e impacto comercial.
2. Tu **opinión general** sobre el producto: ¿está cerca de listo o lejos? ¿qué cambiaría primero?
3. Si tuvieras que **rediseñar UNA pantalla**, ¿cuál y cómo?
4. Cualquier cosa que NO entró en hallazgos formales pero querés mencionar (gut feel).

Esa sesión la grabo (con tu permiso) para no perderme matices.

---

## Cierre

Tu trabajo va a sumarse al de los heladeros que están testeando en paralelo. La triangulación de los datos (heladeros que se traban + experto que identifica el por qué) es lo que va a definir la priorización del backlog antes del lanzamiento comercial.

**Gracias por tomarte el tiempo. Si en algún punto del camino tenés dudas o querés discutir un hallazgo en vivo, escribime sin culpa.**

— [Tu nombre]
hola@gelatolab.app
