# Storyboard del video de onboarding (5 minutos)

Video corto que el maestro entrega a sus alumnos para que aprendan GelatoLab en una sola sesión. Pensado para grabar con OBS o Loom — pantalla compartida con voz en off.

## Setup antes de grabar

- **Resolución**: graba a 1920×1080 (Full HD).
- **Audio**: micrófono USB decente (no el del laptop). Habla en una sala sin eco.
- **Cuenta de demo**: usa una cuenta Pro limpia (sin recetas previas) — registrate como `demo@gelatolab.app` o similar y promove a Pro vía SQL antes de grabar.
- **Idioma**: español neutral. Habla pausado, los alumnos pueden no ser nativos de tu acento.
- **Take**: graba seguido sin cortes; si te equivocas, pausa 3 segundos en silencio y retomá. Después se edita.

---

## Escena 1 — Apertura (0:00 → 0:30)

**Visual**
Empieza en `https://gelatolab.app`. Mostrá la landing por 3 segundos haciendo scroll lento. Después click en **Probar gratis**.

**Voz**
> "Hola, soy [tu nombre]. Voy a mostrarte GelatoLab en cinco minutos. Es la herramienta que uso para formular helados y gelatos profesionales: calcula PAC, POD, FPD; genera etiquetas con sellos legales; e imprime hojas de producción A4 para la cocina. Empecemos."

---

## Escena 2 — Crear cuenta (0:30 → 1:00)

**Visual**
Se abre `/#/auth`. Tipea un email y password. Apretá **Crear cuenta**. Si ya estás logueado de antes, mostrá el dashboard directamente y di "yo ya tengo cuenta, voy directo".

**Voz**
> "Lo primero, registrarte. Solo email y password, sin tarjeta. Te llega un mail para confirmar — abrís el link y listo. Si vas a usar varios computadores, vas a poder sincronizar. Y como alumno del curso tenés un descuento que te paso al final."

---

## Escena 3 — Configuración inicial (1:00 → 1:20)

**Visual**
Aparece el `OnboardingWizard` (modal del primer ingreso). Completalo: país=Chile, fantasy_name="Heladería Demo", tipo de negocio. Cierra el wizard.

**Voz**
> "Al primer ingreso te pide tu país y datos básicos. El país es importante: con Chile activamos los sellos de la Ley 20.606. Si producís en Brasil o Europa, eligen ese y aplica la normativa de allá."

---

## Escena 4 — Crear receta con asistente (1:20 → 2:30)

**Visual**

1. Click en **Recetas** en el menú superior.
2. Click en **+ Nueva receta → Asistente**.
3. Elegí tipo **Gelato**, subtipo **Frutos secos / Pistacho**.
4. La app rellena una base sugerida. Cambia el nombre a "Pistacho Casa".
5. Click en **Aceptar** o **Guardar**.

**Voz**
> "Para tu primera receta, usá el asistente — te ahorra empezar de cero. Eligen el tipo: helado clásico, gelato, sorbete o paleta. Después el subtipo: chocolate, frutos secos, frutas, base… La app conoce los rangos óptimos de cada estilo italiano y te propone una base balanceada. Yo voy a hacer un pistacho gelato. Le pongo un nombre y guardo."

---

## Escena 5 — Balanceo automático (2:30 → 3:20)

**Visual**

1. Estás en el editor de receta. Mostrá la tabla de ingredientes.
2. Mostrá los indicadores de color (verde/amarillo/rojo) en los parámetros (FPD, PAC, POD, MSNF).
3. Si todo está verde, modificá deliberadamente un ingrediente para romper el balance (ej. duplicá los gramos de azúcar).
4. Mostrá los rojos.
5. Click en **Auto-balance**.
6. Mostrá el modal con el preview del diff (Antes/Después/Cambio).
7. Click **Aplicar cambios**. Mostrá los indicadores volviendo a verde.

**Voz**
> "Mirá los puntos de color al lado de cada parámetro. Verde es estás en rango, amarillo aceptable, rojo fuera. Si rompo algo —subo el azúcar al doble— mirá cómo el POD se va al rojo. Click en Auto-balance: la app analiza qué ingrediente tiene más palanca para corregir cada parámetro y te propone un ajuste en gramos. Antes de tocar tu receta te muestra el diff: cuánto va a sumar de leche, cuánto va a bajar de azúcar. Si te gusta, aplicás. Y vuelve todo a verde."

---

## Escena 6 — Etiqueta nutricional con sellos (3:20 → 4:20)

**Visual**

1. En el editor, click en la pestaña **Etiquetado** (o **Nutricional**).
2. Mostrá la tabla nutricional por 100g y por porción.
3. Mostrá los sellos chilenos automáticos (ALTO EN AZÚCARES, etc.).
4. Mostrá la lista de alérgenos auto-asignada.
5. Click en **Imprimir etiqueta** o **Vista previa**.
6. Mostrá la etiqueta lista para impresora.

**Voz**
> "Ahora la etiqueta. Click en la pestaña de Etiquetado. La app calcula la tabla nutricional por cien gramos y por porción a partir de los ingredientes. Y según el país elegido, asigna los sellos. En Chile son los octógonos negros: ALTO EN AZÚCARES, ALTO EN GRASAS SATURADAS, según los umbrales de la Ley 20.606. La lista de alérgenos también es automática: detecta leche, huevo, gluten, frutos secos. Y la imprimís directo en una hoja autoadhesiva, lista para pegar en el pote."

---

## Escena 7 — Hoja de producción A4 (4:20 → 4:50)

**Visual**

1. Volvé a la receta principal.
2. Click en **Hoja de proceso** o **Imprimir hoja A4**.
3. Mostrá la vista previa de la hoja A4: ingredientes con gramaje real, pasos del proceso, casillas de firma.

**Voz**
> "Y para la cocina: hoja A4 imprimible. Tiene los ingredientes con el gramaje real para tu lote, los pasos del proceso —mezcla, pasteurización, mantecación—, y casillas para firmar. Tu equipo trabaja con esto en mano y queda registro de quién hizo cada lote."

---

## Escena 8 — Cierre (4:50 → 5:00)

**Visual**
Volvé al dashboard. Mostrá brevemente el icono `?` arriba a la derecha (sección Ayuda) y el avatar de Marco abajo a la derecha.

**Voz**
> "Y eso es lo básico. Acá arriba tenés la sección de Ayuda con guías de inventario, HACCP y escáner de códigos de barras. Y Marco, abajo a la derecha, te responde dudas en lenguaje natural. Bienvenidos a GelatoLab. Cualquier consulta, escribime y la resolvemos."

---

## Tips de edición

- Cortá los silencios largos y los "ehhhh" entre frases.
- Si un click no salió bien (apretaste mal, tipeaste con error), cortá y rehacé esa toma — total el video se edita.
- Agregá texto en pantalla cuando menciones términos técnicos: "PAC = Poder Anticongelante", "POD = Poder Edulcorante".
- Velocidad final: **1.0x** (no acelerés). Los alumnos a veces necesitan pausar.
- Música de fondo: opcional, volumen muy bajo (-30 dB respecto a tu voz). Algo instrumental sin letra. Bien sin música también.
- Subtítulos: Loom y YouTube los autogeneran. Revisá las palabras técnicas (FPD, MSNF, etc.) que suelen salir mal transcriptas.

## Dónde publicarlo

- **YouTube unlisted** — link directo, no aparece en buscadores.
- **Loom** — más rápido de subir, los alumnos comentan en momentos específicos del video.
- **El sitio mismo** — si querés, lo embebemos en `gelatolab.app/#/help` después.

## Tiempo estimado de producción

- Grabar (con 1-2 retakes): 30-45 minutos.
- Editar (cortar silencios + agregar textos): 1 hora.
- Subir + thumbnail: 15 minutos.

**Total: ~2 horas para tener un video listo y profesional.**
