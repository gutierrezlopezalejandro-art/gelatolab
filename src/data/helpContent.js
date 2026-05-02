/**
 * Help center content. Structured as categories → articles. Each article has
 * title, intro, sections (with body + bullets), tips and "see also" links.
 *
 * Kept in plain JS (not Markdown) so the renderer can highlight specific
 * fragments and render React components in tips. Translations live in i18n
 * keys when needed; the prose itself is in Spanish (Brazilian Portuguese
 * speakers can mostly read it; full i18n of the help center is a future task).
 */

export const HELP_CATEGORIES = [
  { id: 'getting-started', title: 'Primeros pasos', icon: '🚀' },
  { id: 'recipes',         title: 'Recetas',         icon: '🍦' },
  { id: 'ingredients',     title: 'Ingredientes',    icon: '🥛' },
  { id: 'inventory',       title: 'Inventario',      icon: '📦' },
  { id: 'production',      title: 'Producción',      icon: '🏭' },
  { id: 'labeling',        title: 'Etiquetado',      icon: '🏷️' },
  { id: 'ai',              title: 'Asistentes IA',   icon: '✨' },
  { id: 'glossary',        title: 'Glosario técnico',icon: '📚' },
];

export const HELP_ARTICLES = [
  // ── Getting started ─────────────────────────────────────────
  {
    id: 'welcome',
    category: 'getting-started',
    title: 'Bienvenido a GelatoLab',
    intro: 'GelatoLab es la herramienta que te acompaña desde el cálculo de la receta hasta la etiqueta lista para pegar en el envase.',
    sections: [
      {
        h: '¿Qué hace GelatoLab?',
        p: 'Tres cosas principales:',
        bullets: [
          '**Formula y balancea recetas** de helado, gelato y sorbete con cálculo automático de PAC, POD, FPD y curva de congelamiento.',
          '**Gestiona tu producción**: planifica, registra lotes, controla inventario y costos.',
          '**Genera etiquetas listas para imprimir** con cumplimiento nutricional según el país (Ley 20.606 Chile, NOM-051 México, RDC 429 Brasil, etc).',
        ],
      },
      {
        h: 'Estructura de la app',
        p: 'En el menú superior tienes 6 secciones:',
        bullets: [
          '**Dashboard**: resumen del mes (recetas, lotes, litros, costos) + alertas de stock bajo.',
          '**Recetas**: crear, editar, duplicar y partir de plantillas balanceadas.',
          '**Lotes**: calculadora de escalado para producir cantidades específicas.',
          '**Planificación**: programa producciones por fecha y obtén la lista consolidada de ingredientes.',
          '**Producción**: historial de lotes producidos con detalle, edición de pesos reales y impresión de etiquetas.',
          '**Ingredientes**: base de datos editable con vistas Formulación / Nutrición / Inventario.',
        ],
      },
    ],
    tips: [
      'Configura tu país y datos del negocio en el menú ⚙ — esto define qué sellos aparecen en las etiquetas.',
      'Empieza con una plantilla en Recetas → "Desde plantilla" para no balancear desde cero.',
    ],
  },
  {
    id: 'first-recipe',
    category: 'getting-started',
    title: 'Crea tu primera receta paso a paso',
    intro: 'En 5 minutos tendrás una receta balanceada y lista para producir.',
    sections: [
      {
        h: 'Paso 1: Empieza desde una plantilla',
        p: 'Ve a **Recetas** → clic en **✨ Desde plantilla**. Escoge la categoría (helado/gelato/sorbete) y el sabor base. La app crea una copia con cantidades ya balanceadas (~1000g batch).',
      },
      {
        h: 'Paso 2: Ajusta los ingredientes',
        p: 'En el editor verás la tabla de formulación con cantidades en gramos. Puedes:',
        bullets: [
          'Modificar cantidades clic en el número',
          'Cambiar un ingrediente clic en el dropdown',
          'Agregar nuevos clic en "+ Agregar ingrediente"',
          'Eliminar con la X a la derecha',
        ],
      },
      {
        h: 'Paso 3: Mira el panel de análisis',
        p: 'A la derecha tienes los parámetros calculados en tiempo real: agua, sólidos, grasa, SNG, POD, PAC, FPD, costo. Cada uno tiene rating verde/amarillo/rojo según el rango óptimo del tipo elegido.',
      },
      {
        h: 'Paso 4: Balancea automáticamente',
        p: 'Si algún parámetro está fuera de rango, clic en **⚖ Balancear** arriba a la derecha. La app sugiere ajustes específicos (ej. "+50g Crema 35%"). Aplícalos uno a uno o dale "**⚡ Aplicar todo automáticamente**" para iterar hasta convergir.',
      },
      {
        h: 'Paso 5: Guarda y produce',
        p: 'Clic en **Guardar**. Después puedes ir a **Lotes** para escalar a cualquier volumen, o a **Planificación** para programar la producción.',
      },
    ],
    tips: [
      'Si recién empiezas, deja el overrun en el default y ajusta solo cuando entiendas el efecto.',
      'Las pestañas Proceso, Curva, Nutrición y Análisis te dan información complementaria — explóralas con calma.',
    ],
  },
  {
    id: 'backup-restore',
    category: 'getting-started',
    title: '💾 Backup y persistencia de datos',
    intro: 'GelatoLab guarda tus datos en **IndexedDB** del navegador (mucho más resiliente que localStorage). Para cubrir todos los escenarios — cambio de equipo, formateo, falla de disco — tienes 3 capas complementarias de respaldo.',
    sections: [
      {
        h: 'Las 3 capas de respaldo',
        bullets: [
          '**IndexedDB local** (automático): cada cambio se guarda al instante en una base de datos del navegador. Sobrevive a "limpiar caché" normal pero NO a "borrar todos los datos del sitio".',
          '**Carpeta del sistema** (recomendado, Chrome/Edge): conectas una carpeta real del PC y GelatoLab escribe automáticamente JSONs ahí cada 2 segundos tras cualquier cambio. Si esa carpeta está en Drive/Dropbox/OneDrive, sync continuo cross-device.',
          '**ZIP manual** (siempre disponible): descarga un ZIP con todos tus datos cuando quieras y guárdalo donde sea (Drive, pendrive, email).',
        ],
      },
      {
        h: 'Conectar carpeta del PC (recomendado)',
        bullets: [
          'Abre menú usuario → **⚙ Configuración del negocio** → sección **📁 Carpeta de respaldo**.',
          'Click en **Conectar carpeta**. Tu navegador te pedirá escoger una carpeta del PC.',
          'Sugerencia: crea una carpeta dentro de Drive/Dropbox/OneDrive (ej. `Drive\\GelatoLab\\`) — así se sincroniza a la nube automáticamente.',
          'Acepta el permiso de lectura/escritura. Desde ahí, cada cambio escribe `recipes.json`, `productions.json`, etc. en esa carpeta.',
          'Solo Chrome, Edge y Opera lo soportan. En Firefox/Safari tienes que usar el ZIP manual.',
        ],
      },
      {
        h: 'Por qué importa el backup manual',
        bullets: [
          'IndexedDB sobrevive más que localStorage, pero "borrar datos del sitio" lo elimina.',
          'El modo incógnito no persiste nada al cerrar.',
          'Si cambias de PC o quieres sincronizar al teléfono, necesitas exportar e importar el ZIP.',
          'La sincronización en la nube (cuando estás logueado) es complementaria pero no reemplaza tener un ZIP local.',
        ],
      },
      {
        h: 'Cómo hacer un backup',
        bullets: [
          'Click en el menú de usuario (icono superior derecho) → **⚙ Configuración del negocio**.',
          'Scroll hasta la sección **💾 Backup local**.',
          'Click en **⬇ Exportar backup**.',
          'Se descarga un archivo `gelatolab-backup-YYYY-MM-DD.zip`. Guárdalo en Drive, Dropbox, OneDrive, o pendrive.',
        ],
      },
      {
        h: 'Qué incluye el ZIP',
        bullets: [
          '`recipes.json` — todas tus recetas con sus revisiones',
          '`ingredients.json` — base de ingredientes con tus personalizaciones',
          '`productions.json` — historial completo de lotes producidos',
          '`plans.json` — planes de producción',
          '`inventory.json` — niveles de stock, movimientos con costo/proveedor por entrada',
          '`business.json` — datos del negocio + máquina configurada',
          '`suppliers.json` — catálogo de proveedores',
          '`haccp.json` — bitácora de chequeos sanitarios',
          '`meta.json` — versión del backup, fecha y user-agent',
        ],
      },
      {
        h: '📸 Snapshots diarios (auto, en carpeta del PC)',
        p: 'Si tienes conectada la carpeta de respaldo (Tauri o web vía File System Access API), GelatoLab además escribe **una vez por día** un snapshot completo en `GelatoLab/snapshots/YYYY-MM-DD/`. Es como un backup ZIP automático pero como archivos sueltos, sin necesidad de tu intervención. Retención de 30 días, prune automático.',
        bullets: [
          'Sirve para volver atrás si se borra una receta o se corrompe un dato.',
          'Cada carpeta de fecha tiene los mismos JSONs que el ZIP — puedes copiar/pegar uno puntual.',
          'Se hace solo una vez al día (idempotente). Abrir la app 5 veces no genera 5 snapshots.',
          'Si la carpeta vive en Drive/OneDrive, tienes versionado real e historial cross-device gratis.',
        ],
      },
      {
        h: 'Lo que NO incluye',
        bullets: [
          'Tu clave de OpenAI: queda solo en tu navegador, NO se exporta. Si restauras en otro equipo, tendrás que volver a configurarla.',
          'Tu sesión de login: el backup es de datos, no de credenciales.',
          'Configuraciones del navegador (idioma, país, banners de cookies).',
        ],
      },
      {
        h: 'Cómo restaurar',
        bullets: [
          'Mismo menú: **⚙ Configuración del negocio** → sección **💾 Backup local**.',
          'Click en **⬆ Importar backup**.',
          'Selecciona el archivo ZIP que descargaste antes.',
          'Confirma el cuadro de diálogo (TE BORRA los datos actuales y los reemplaza con los del archivo).',
          'La página se recarga sola para que todo arranque limpio.',
        ],
      },
      {
        h: 'Aviso del último backup',
        p: 'GelatoLab te dice "Backup hecho hoy" o "Último backup hace X días" sobre los botones — para que no se te olvide.',
      },
    ],
    tips: [
      'Frecuencia recomendada: **una vez por semana** si produces regularmente; **antes de cualquier limpieza de navegador**.',
      'Si trabajas en varios equipos: exporta del que usas más y importa en los otros.',
      'El ZIP es texto JSON normal: puedes abrirlo y leerlo si necesitas extraer una receta puntual.',
      'Si te aparece "Este ZIP no es un backup de GelatoLab", es porque le falta `meta.json` — revisa que sea el archivo correcto.',
    ],
  },

  // ── Recipes ─────────────────────────────────────────────────
  {
    id: 'recipe-editor',
    category: 'recipes',
    title: 'Editor de recetas',
    intro: 'El editor tiene 5 pestañas. Aprende qué hace cada una.',
    sections: [
      {
        h: 'Formulación',
        p: 'Tabla de ingredientes con cantidades y porcentajes. La columna "POD" indica el aporte de dulzor por ingrediente (sacarosa = 100). "PAC" indica el aporte anticongelante (sacarosa = 100). Las filas de totales abajo te dicen los valores acumulados de la mezcla.',
      },
      {
        h: 'Proceso',
        p: 'Pasos sugeridos según el tipo y composición de la receta (con/sin huevo, con/sin chocolate, etc.). Incluye temperaturas, tiempos y consejos. Abajo tienes un cuadro grande de **Notas personalizadas** donde puedes escribir tus pasos específicos — estos viajan con cada lote a Producción para imprimir en la hoja de proceso.',
      },
      {
        h: 'Curva de congelamiento',
        p: 'Gráfico de % de agua congelada vs temperatura. Te muestra a qué temperatura tu helado estará "duro" o "blando" y permite predecir el comportamiento en vitrina.',
      },
      {
        h: 'Valores nutricionales',
        p: 'Tabla por 100g + por porción configurable, con sellos según el país elegido (octógonos chilenos, lupa brasileña, semáforo ecuatoriano, etc.). Lista automática de alérgenos.',
      },
      {
        h: 'Análisis',
        p: 'Gráficos comparativos: balance de ácidos grasos, distribución de sólidos, incidencia de costos por ingrediente.',
      },
    ],
    tips: [
      'Si modificas una receta, el botón "Guardar" se pone en gris cuando ya guardaste — y aparece "● sin guardar" en dorado cuando hay cambios pendientes.',
    ],
  },
  {
    id: 'auto-balance',
    category: 'recipes',
    title: 'Asistente de balanceo automático',
    intro: 'GelatoLab no balancea por ti a ciegas — te sugiere ajustes y tú decides cuáles aplicar. Si quieres rapidez, también hay un modo "aplicar todo".',
    sections: [
      {
        h: 'Cómo funciona',
        p: 'El motor analiza cada parámetro (agua, grasa, SNG, azúcares, PAC, POD, etc.) contra el rango óptimo del tipo de receta (helado/gelato/sorbete). Para cada parámetro fuera de rango, identifica el ingrediente con más "palanca" para corregirlo y propone un delta en gramos.',
      },
      {
        h: 'Modo manual',
        p: 'Clic en **⚖ Balancear**. Se abre el panel con la lista ordenada por severidad (más crítico arriba). Cada sugerencia muestra qué parámetro arregla y cuánto se mueve. Clic en **Aplicar** ejecuta una sugerencia. La lista se recalcula tras cada acción.',
      },
      {
        h: 'Modo automático',
        p: 'Clic en **⚡ Aplicar todo automáticamente**. El algoritmo itera hasta 20 veces aplicando la sugerencia más severa cada paso. Antes de tocar tu receta te muestra una **vista previa con diff** (Antes / Después / Cambio en gramos). Puedes Descartar o Aplicar cambios.',
      },
      {
        h: 'Respeta tu temperatura de servicio',
        p: 'Si en el header del editor pusiste una temperatura de servicio específica (ej. -12°C), el balanceador la usa para calcular el **PAC objetivo** real (mediante la tabla Corvitto inversa), en lugar del rango estático del tipo. Eso evita el conflicto típico entre "el rango dice X" y "yo quiero servir a Y".',
      },
      {
        h: 'Limitaciones',
        bullets: [
          'No tocará pastas/saborizantes (avellana, pistacho, frutas) para no alterar el sabor.',
          'Cada paso es una **aproximación lineal**: tras aplicar uno, los demás parámetros pueden moverse. Por eso se itera con damping de 0.6 (ajustes suaves).',
          'Si un parámetro no tiene "palanca disponible" en tu receta (ej. quieres bajar la grasa pero solo tienes leche entera), no aparecerá sugerencia.',
          'Cada sugerencia individual está **acotada a ±25%** de la cantidad actual del ingrediente (mín 20 g) para que no se generen cascadas de problemas nuevos. Si necesitas un cambio grande, aplica varias veces.',
        ],
      },
    ],
    tips: [
      'Ideal: arrancar de plantilla → personalizar sabores → balancear → guardar.',
      'Si el resultado del modo automático no te convence, puedes Descartar y probar manualmente.',
      'Para análisis más profundo (con propuestas de reemplazo de ingredientes), usa **✨ Análisis con IA** en la tab Análisis.',
    ],
  },
  {
    id: 'recipe-templates',
    category: 'recipes',
    title: 'Plantillas de receta',
    intro: '12 recetas balanceadas listas para usar como punto de partida.',
    sections: [
      {
        h: 'Categorías disponibles',
        bullets: [
          '**🇮🇹 Clásicos italianos**: Vainilla, Chocolate, Pistacho, Avellana (Nocciola), Fior di Latte',
          '**🇺🇸 Helados americanos**: Vainilla Premium con yema',
          '**🍋 Sorbetes**: Limón, Frambuesa, Mango, Maracuyá',
          '**🌎 Especiales LATAM**: Manjar, Lúcuma',
        ],
      },
      {
        h: 'Cómo usarlas',
        p: 'En **Recetas** clic en **✨ Desde plantilla** → buscar/filtrar → clic en una tarjeta. La app crea una receta nueva en tu lista (no edita la plantilla original) y te lleva al editor.',
      },
      {
        h: 'Cada plantilla incluye',
        bullets: [
          'Cantidades balanceadas para ~1000g',
          'Overrun y temperatura de servicio recomendadas',
          'Notas de proceso con tiempos, temperaturas y consejos técnicos',
        ],
      },
    ],
  },
  {
    id: 'recipe-subtypes',
    category: 'recipes',
    title: 'Subtipos de receta (Base / Fruta / Chocolate / Alcohol)',
    intro: 'Una receta de pistacho no se rige por los mismos rangos óptimos que una de mascarpone, ni una de fior di latte por los mismos que una con grappa. El **subtipo** ajusta los rangos de balance al carácter de la receta.',
    sections: [
      {
        h: '¿Dónde lo configuro?',
        p: 'En el header del editor de receta tienes ahora **dos** selectores: el tipo (Helado / Gelato / Sorbete) y al lado el **subtipo**.',
        bullets: [
          '**Base** — receta tradicional cremosa. Es el default y mantiene los rangos clásicos.',
          '**Fruta** — sabores frutales (limón, frutilla, damasco). Permite menos grasa porque la fruta diluye.',
          '**Chocolate y frutos secos** — pistacho, avellana, cacao, almendra. Permite **más grasa**, **más sólidos**, **menos agua** y exige un poco más de POD para compensar el amargor.',
          '**Con alcohol** — recetas con licor (ron, grappa, amaretto). Baja el rango de POD porque el alcohol aporta dulzura percibida y depresión adicional del FPD.',
        ],
      },
      {
        h: '¿Qué cambia en la práctica?',
        p: 'Solo cambian los rangos óptimos del **balance** (cuándo el indicador muestra verde / amarillo / rojo). El cálculo de FPD, PAC y POD sigue siendo el mismo. Es decir: el subtipo no transforma tu receta, solo te dice "ojo, para este estilo lo ideal es entre X y Y, no entre A y B".',
      },
      {
        h: 'Recomendaciones rápidas',
        bullets: [
          'Helado de pistacho artesanal → Helado / Chocolate y frutos secos',
          'Gelato de limón → Gelato / Fruta',
          'Sorbete de mango → Sorbete / Fruta (o Base, son equivalentes)',
          'Gelato al rom → Gelato / Con alcohol',
          'Helado clásico de vainilla → Helado / Base',
        ],
      },
    ],
    tips: [
      'Si dudas, deja **Base**. Es el rango más conservador y aplica a la mayoría.',
      'Cambiar el subtipo no rompe nada: las recetas existentes quedan en Base por defecto.',
    ],
  },
  {
    id: 'recipe-comparison',
    category: 'recipes',
    title: '⚖️ Comparar recetas lado a lado',
    intro: 'Selecciona varias recetas y compáralas en una tabla con métricas técnicas (PAC, POD, FPD), composición (grasa, azúcar, agua, SNG, sólidos) y nutrición por 100 g (calorías, proteína, grasa saturada, azúcares, sodio, fibra, lactosa). Te muestra de un vistazo cuál tiene "más" o "menos" de cada cosa.',
    sections: [
      {
        h: 'Cómo abrir la comparación',
        bullets: [
          'En **Recetas**, marca el checkbox de cada tarjeta que quieras incluir (mínimo 2).',
          'En la barra flotante inferior aparece el botón **⚖️ Comparar**. Clic.',
          'Se abre un modal con la tabla side-by-side. Cerrar con × o clic afuera.',
        ],
      },
      {
        h: 'Cómo leer los colores',
        bullets: [
          '**Verde (mejor)**: la receta tiene el valor "más conveniente" de la fila — menor azúcar, menor sodio, mayor proteína, etc.',
          '**Rojo (peor)**: la receta tiene el valor menos conveniente.',
          'Las filas técnicas (PAC, POD, FPD, grasa, agua, SNG, sólidos) NO se colorean — porque "menos PAC" no es ni mejor ni peor, depende del estilo objetivo. Solo se destacan los extremos en negrita.',
        ],
      },
      {
        h: 'Veredicto de balance',
        p: 'Bajo el nombre de cada receta verás el veredicto del balance (✓ Balanceada, ⚠ Aceptable, ✗ Fuera de rango), calculado para el tipo+subtipo configurado en cada receta. Úsalo para descartar rápido las que no están listas para producción.',
      },
      {
        h: 'Casos de uso típicos',
        bullets: [
          '**Variantes de un sabor**: comparas 3 versiones de pistacho para elegir la más barata o la de menor azúcar añadido.',
          '**Portafolio de productos**: ¿está balanceado tu menú? Con la comparación ves de un toque si todos tus sorbetes son altos en sodio o altos en azúcar.',
          '**Decisiones de etiquetado**: si una versión queda bajo el umbral chileno de "ALTO EN AZÚCARES", te conviene esa para el rotulado.',
        ],
      },
    ],
    tips: [
      'La comparación maneja sub-recetas: si una receta usa otra como ingrediente, se expande recursivamente para que la nutrición sea exacta.',
      'Para imprimir la comparación: usá el botón **📄 Generar reporte** del mismo selector — el reporte multi-receta también muestra las métricas, pero en formato impresión.',
      'La nutrición por 100 g es del producto antes de mantecar. Después de mantecar el aire baja la densidad pero no cambia los nutrientes por 100 g de mezcla.',
    ],
  },
  {
    id: 'recipe-addins',
    category: 'recipes',
    title: 'Add-ins / Inclusiones (chips, frutos secos, swirls)',
    intro: 'Los chips de chocolate, las nueces tostadas y los pedazos de fruta se incorporan **después** de la mantecación. No participan en el balance ni en el FPD, pero sí están en el producto final que el cliente come.',
    sections: [
      {
        h: 'Cómo marcar una fila como inclusión',
        p: 'En la tabla de formulación, al final de cada fila hay un botón **⊕** en la nueva columna "Incl.". Click → la fila se vuelve amarilla y queda marcada como inclusión.',
      },
      {
        h: '¿Qué pasa cuando marcas una fila?',
        bullets: [
          '**Sale del balance**: el panel de análisis, el cálculo de PAC/POD/FPD y el balanceador automático ignoran esa fila. Es como si no estuviera para efectos de la mezcla base.',
          '**Sigue contando para el peso final**: aparece una nueva fila *"Producto final"* en la tabla con el peso total y el costo incluyendo las inclusiones.',
          '**Sigue contando para nutrición y etiqueta**: el panel de nutrición y los sellos legales se calculan sobre el producto final (lo que el cliente ingiere).',
        ],
      },
      {
        h: 'Casos típicos',
        bullets: [
          'Stracciatella: la base es helado de vainilla, las virutas de chocolate son inclusión.',
          'Helado de cookies: la base + las galletas trituradas como inclusión.',
          'Helado napolitano con nueces: las nueces tostadas como inclusión.',
          'Variegato chocolate: NO es inclusión sino sub-receta (ver "Sub-recetas").',
        ],
      },
    ],
    tips: [
      'Si no marcas nada, todo entra al balance como antes — el comportamiento por defecto no cambió.',
      'Las inclusiones que tienen mucha grasa (chocolate cobertura) o mucho azúcar pueden alterar la nutrición declarada — por eso siguen contando para la etiqueta.',
    ],
  },
  {
    id: 'recipe-sub-recipes',
    category: 'recipes',
    title: 'Sub-recetas (variegatos, bases reutilizables)',
    intro: 'Una sub-receta es una receta que se incluye como un solo "ingrediente" dentro de otras recetas. Sirve para **no copiar y pegar** los mismos ingredientes en cada sabor.',
    sections: [
      {
        h: 'Cuándo usarla',
        bullets: [
          '**Variegatos / salsas**: salsa de chocolate, dulce de leche, caramelo, salsa de frambuesa que repites en varios sabores.',
          '**Bases reutilizables**: tu base blanca de helado (la mezcla leche+crema+azúcar+SMP+estabilizante que después le agregas el sabor).',
          '**Pastas caseras**: pasta de pistacho, praliné de avellana, manteca de almendra hechas en casa.',
        ],
      },
      {
        h: 'Cómo marcar una receta como sub-receta',
        p: 'En el header del editor de receta hay un checkbox **"📋 Es sub-receta"**. Cuando lo marcas, la cajita se vuelve violeta. Al guardar, esa receta queda disponible para usarse dentro de otras.',
      },
      {
        h: 'Cómo incluirla en otra receta',
        p: 'En cualquier receta nueva o existente, click en el dropdown de ingredientes. En la parte superior verás un grupo **"📋 Sub-recetas"** con todas las que marcaste. Selecciona una y pon los gramos que quieres usar.',
      },
      {
        h: 'Cómo se calcula',
        p: 'GelatoLab **expande automáticamente** la sub-receta en sus ingredientes reales, escalados proporcionalmente al peso que pusiste. Si tu variegato pesa 430 g en su receta original y agregas 100 g a un helado, GelatoLab calcula con 100/430 ≈ 23% de cada uno de sus componentes. Toda la composición (grasa, PAC, POD, FPD, costo) se refleja correctamente.',
      },
      {
        h: 'Beneficio principal',
        p: 'Si mañana cambias la fórmula del variegato (más cacao, menos azúcar), **todos los helados que lo usan se actualizan solos**. No tienes que ir receta por receta.',
      },
    ],
    tips: [
      'La sub-receta NO se vuelve invisible: sigue siendo una receta normal que puedes producir aparte. Solo es además reutilizable.',
      'No marques tus sabores finales (Pistacho, Vainilla, etc.) como sub-receta. Solo lo que reutilizas como ingrediente.',
      'Detecta ciclos: si A incluye a B y B incluye a A, GelatoLab corta la recursión silenciosamente para no colgar.',
    ],
  },

  {
    id: 'recipe-best-before',
    category: 'recipes',
    title: 'Vencimiento, lote y código QR',
    intro: 'Cada receta tiene su propio plazo de vencimiento (ej. 90 días). Cuando confirmas un lote, GelatoLab calcula la fecha de vencimiento concreta y agrega un QR de trazabilidad a la etiqueta.',
    sections: [
      {
        h: 'Configurar el plazo de vencimiento',
        p: 'En el header del editor de receta verás el campo **"Vence en: X d"**. Ingresa los días de vida útil desde producción. Default 90 días. Para sorbetes con alcohol o bases especiales puedes subirlo o bajarlo.',
      },
      {
        h: 'Cálculo automático en cada lote',
        p: 'Al confirmar una planificación, cada lote queda con un snapshot del plazo (no del cálculo de fecha). Si después cambias el plazo en la receta, los lotes ya producidos mantienen su fecha original — eso es deliberado para trazabilidad.',
      },
      {
        h: 'QR de trazabilidad en la etiqueta',
        p: 'La etiqueta de cada lote ahora incluye un código QR con: lote, nombre de receta, fecha de producción, fecha de vencimiento y volumen. Cualquier cliente o inspector puede escanearlo con la cámara del celular y ver la información en texto plano.',
      },
      {
        h: 'Casos de uso',
        bullets: [
          'Reclamación de cliente: pides el QR del envase, escaneas, ves de qué lote era exactamente.',
          'Auditoría sanitaria: el inspector escanea, verifica fecha y vence al instante.',
          'Devolución de un retailer: identificas el lote sin necesidad del recibo.',
        ],
      },
    ],
    tips: [
      'El QR es texto plano, no una URL. No depende de internet ni de un servidor — se lee con cualquier app de cámara.',
      'Si necesitas trazabilidad más fuerte (firmado), considera imprimir un código de barras con tu sistema de gestión externo además del QR.',
    ],
  },

  {
    id: 'recipe-history',
    category: 'recipes',
    title: '🕘 Historial de revisiones (versionado)',
    intro: 'Cada vez que guardas una receta, GelatoLab archiva una copia. Puedes ver las últimas 10 versiones y restaurar cualquiera si te equivocaste o quieres comparar con un balance anterior.',
    sections: [
      {
        h: 'Cómo se crean',
        p: 'Automáticamente: cada click en **Guardar** captura la receta completa (ingredientes, cantidades, tipo, subtipo, alérgenos, notas, FPD calculado, costo) en una nueva entrada del historial. No tienes que hacer nada extra.',
      },
      {
        h: 'Cómo verlas',
        p: 'En el header del editor de receta aparece el botón **🕘 Historial** (solo si la receta ya tiene revisiones). Click → modal con la lista cronológica, más reciente arriba, marcada como "Actual".',
      },
      {
        h: 'Cómo restaurar',
        bullets: [
          'Click en **Restaurar** sobre cualquier revisión.',
          'Confirma el cuadro de diálogo.',
          'La revisión se carga al editor — pero **NO se guarda automáticamente**.',
          'Revisa que esté correcta. Si te convence, click Guardar (eso crea otra entrada en el historial, así puedes deshacer).',
        ],
      },
      {
        h: 'Límite de 10',
        p: 'Solo las 10 revisiones más recientes se guardan. La más antigua se descarta cuando llega una nueva. Esto evita que tu navegador se llene de datos antiguos.',
      },
      {
        h: 'Casos de uso típicos',
        bullets: [
          'Probaste un balance nuevo y no te convenció: restaura la versión anterior.',
          'Cambiaste de proveedor de cacao y quieres comparar la receta vieja con la nueva.',
          'Un colega tocó una receta sin avisarte: revisa el historial para ver qué cambió.',
        ],
      },
    ],
    tips: [
      'El historial vive dentro del archivo de la receta. Si exportas un backup, las revisiones van incluidas.',
      'Si necesitas más de 10 versiones, exporta backups regularmente (Configuración del negocio → Backup).',
    ],
  },
  {
    id: 'recipe-wizard',
    category: 'recipes',
    title: '🪄 Asistente paso a paso (recipe wizard)',
    intro: 'Para empezar una receta sin tener que decidir todo desde cero. El asistente te pregunta una leche, una crema, un azúcar, un estabilizante y un sabor — y arma una receta con cantidades default razonables que después afinas.',
    sections: [
      {
        h: 'Cuándo usarlo',
        bullets: [
          'Cuando empiezas en GelatoLab y no sabes por dónde partir.',
          'Cuando vas a probar un sabor nuevo y prefieres no balancear desde cero.',
          'Para enseñar a alguien nuevo en tu cocina cómo se compone una receta básica.',
          'Como alternativa más rápida que las plantillas si quieres un blanco editable.',
        ],
      },
      {
        h: 'Cómo abrirlo',
        p: 'Página **Recetas** → botón violeta **🪄 Paso a paso** (al lado de "Desde plantilla" y "+ Nueva receta").',
      },
      {
        h: 'Los 6 pasos (helado/gelato)',
        bullets: [
          '**1. Lo básico**: nombre, tipo (helado/gelato/sorbete) y subtipo (base/fruta/chocolate-nuts/alcohol).',
          '**2. Una leche**: filtra automáticamente las opciones de tu base con grasa ≤5%.',
          '**3. Una crema**: filtra opciones con grasa >15%.',
          '**4. Un azúcar principal**: sacarosa default; puedes elegir dextrosa, glucosa, miel, etc.',
          '**5. Una leche en polvo (opcional)**: si quieres MSNF extra sin más agua.',
          '**6. Un estabilizante**: garrofín, guar, blends comerciales.',
          '**7. El sabor principal**: pasta de pistacho, cacao, vainilla, fruta, etc.',
        ],
      },
      {
        h: 'Para sorbete',
        p: 'En vez de leche/crema/SMP, te pregunta: agua, azúcar, glucosa (opcional), estabilizante y fruta. 5 pasos en total.',
      },
      {
        h: 'Cantidades default',
        p: 'El asistente usa cantidades predefinidas razonables para un batch de 1000g. Después tendrás que afinar:',
        bullets: [
          'Helado: 580g leche + 200g crema + 130g azúcar + 50g SMP + 5g estabilizante + 35g sabor.',
          'Gelato: 650g leche + 100g crema + 150g azúcar + 60g SMP + 5g estabilizante + 35g sabor.',
          'Sorbete: 600g agua + 250g azúcar + 30g glucosa + 5g estabilizante + 115g fruta.',
        ],
      },
      {
        h: 'Después del wizard',
        p: 'La receta se crea y se abre en el editor normal. Te recomendamos: 1) revisar las cantidades del sabor principal (la default 35g a veces es poca), 2) usar **⚖ Balancear** para ajustar PAC/POD/sólidos, 3) probar y ajustar.',
      },
    ],
    tips: [
      'Puedes saltar pasos: en cualquiera está el botón "Saltar este paso" si no quieres ese ingrediente.',
      'El wizard solo te muestra ingredientes que ya tienes en tu base. Si te falta alguno, agrégalo en Ingredientes y vuelve.',
    ],
  },

  // ── Ingredients ─────────────────────────────────────────────
  {
    id: 'ingredients-overview',
    category: 'ingredients',
    title: 'Base de ingredientes',
    intro: 'GelatoLab viene con 91 ingredientes precargados. Puedes editarlos, agregar nuevos o borrar los personalizados.',
    sections: [
      {
        h: 'Tres vistas',
        p: 'Arriba de la tabla hay tres pestañas según qué necesites ver:',
        bullets: [
          '**Formulación**: agua, grasa, SNG, azúcar, otros, PAC, POD, costo/kg',
          '**Nutrición**: kcal, proteína, grasas saturadas, trans, azúcares totales y añadidos, sodio (todo por 100g)',
          '**Inventario**: stock actual y mínimo (en gramos)',
        ],
      },
      {
        h: 'Editar valores',
        p: 'Clic en cualquier celda numérica → input → Enter para guardar o Esc para cancelar. Los ingredientes "default" se editan igual; al hacerlo se marcan como custom.',
      },
      {
        h: 'Importar / Exportar Excel',
        p: 'Botones de Excel arriba a la derecha. Puedes exportar tu base completa, modificarla en Excel y volver a importarla. La importación hace merge inteligente (actualiza si el nombre coincide, agrega si es nuevo).',
      },
      {
        h: 'Restaurar originales',
        p: '"Restaurar originales" devuelve a los 91 default. Pierdes los custom — pide confirmación antes.',
      },
    ],
    tips: [
      'Si tu proveedor te pasa una ficha técnica con valores distintos a los default, edítalos para que tus etiquetas reflejen lo real.',
      'Los códigos de barras (📷 Escanear) solo funcionan en la app iOS nativa, no en web.',
    ],
  },
  {
    id: 'allergens',
    category: 'ingredients',
    title: 'Alérgenos automáticos',
    intro: 'GelatoLab detecta automáticamente los alérgenos de cada receta a partir de los ingredientes que usa.',
    sections: [
      {
        h: 'Los 8 alérgenos relevantes',
        bullets: [
          'Leche', 'Huevo', 'Gluten (cereales)', 'Soya', 'Frutos secos', 'Maní', 'Sésamo', 'Sulfitos (en algunos licores y colorantes)',
        ],
      },
      {
        h: 'Cómo se asignan',
        p: 'Cada ingrediente trae sus alérgenos según una heurística inicial (ej. "Leche entera" → leche; "Pasta avellana" → frutos secos). Los puedes ver en la columna "Alérgenos" de la tabla de Ingredientes. **Importante**: si tu proveedor declara alérgenos distintos en su ficha técnica, edita esa información manualmente.',
      },
      {
        h: 'Dónde aparecen',
        bullets: [
          'En el panel **Nutrición** de cada receta: bloque rojo si hay alérgenos, verde si no',
          'En la **etiqueta imprimible**: recuadro amarillo destacado "CONTIENE: leche, frutos secos."',
        ],
      },
      {
        h: 'Declaración con 3 estados (contains / trace / none)',
        p: 'En el tab **Nutrición** de cada receta hay un panel **🚨 Declaración de alérgenos** que te permite refinar la declaración auto-detectada:',
        bullets: [
          '**Contiene** (rojo, default si está en los ingredientes): obligatorio declarar.',
          '**Trazas** (amarillo): el alérgeno NO está en tu fórmula pero podría haber contaminación cruzada en tu cocina (ej. usas la misma mantecadora para hacer helado de avellana otros días). En la etiqueta aparece "Puede contener trazas de…".',
          '**No** (gris): no se declara.',
        ],
      },
      {
        h: 'Cuándo usar trazas',
        bullets: [
          'Cocina compartida: produces helados con frutos secos en otros lotes — declara trazas en TODOS tus helados.',
          'Equipos compartidos: pasteurizadora usada para distintas mezclas.',
          'Cuando tu proveedor declara trazas en su ficha (ej. cacao en polvo "puede contener trazas de leche y soya").',
        ],
      },
      {
        h: 'Override marcado con punto violeta',
        p: 'Si modificas el estado por defecto, aparece un punto **·** violeta junto al alérgeno indicando que es un override manual. Si vuelves al estado automático (lo correspondiente a si el alérgeno está o no en los ingredientes), el override se borra.',
      },
    ],
    tips: [
      'Las trazas son legalmente importantes en EU y Latinoamérica para personas con alergia severa. Si no estás seguro, declara trazas — es mejor pasarse de cuidadoso.',
      'Cada lote producido toma un snapshot de los overrides al momento de producirse. Si después cambias la receta, los lotes anteriores mantienen su declaración original.',
    ],
  },

  // ── Inventory ───────────────────────────────────────────────
  {
    id: 'inventory-basics',
    category: 'inventory',
    title: 'Cómo funciona el inventario',
    intro: 'Cada ingrediente tiene un stock actual y un mínimo. Las producciones lo descuentan automáticamente.',
    sections: [
      {
        h: 'Definir stock y mínimo',
        p: 'En Ingredientes → vista **Inventario** verás dos columnas: "Stock g" y "Mín g". Edita los valores haciendo clic. Si pones Mín en 0, no hay alerta para ese ingrediente.',
      },
      {
        h: 'Registrar movimientos',
        p: 'Clic en **Inv.** en la fila del ingrediente. Se abre el modal con stock actual + formulario para registrar:',
        bullets: [
          '**Entrada**: compraste 5kg de azúcar → stock sube',
          '**Salida**: usaste o se mermó stock → stock baja',
          '**Ajuste**: corriges manualmente el saldo total (útil tras inventario físico)',
        ],
      },
      {
        h: 'Descuento automático en producción',
        p: 'Cuando llega la fecha de producción de un plan confirmado, el inventario se descuenta automáticamente para todos los ingredientes que usaste, en las cantidades correctas. Si eliminas un plan después de producir, el stock se revierte.',
      },
      {
        h: 'Alertas de stock bajo',
        p: 'Cuando un ingrediente tiene Stock ≤ Mín:',
        bullets: [
          'Aparece un badge rojo con número en el nav junto a "Ingredientes"',
          'En el Dashboard sale una card amarilla con la lista',
          'En la tabla, la fila se pone con fondo rosa + chip rojo "⚠ Stock bajo"',
        ],
      },
      {
        h: '💡 Prefill inteligente al registrar movimiento',
        p: 'Cuando abres el modal Inv. de un ingrediente que YA tuvo movimientos, el formulario aparece prellenado con los valores del último (tipo, cantidad, notas). El operador solo confirma o ajusta — sin retipear "Saco 25kg IANSA" cada vez.',
        bullets: [
          'Ejemplo: registraste un ingreso de Sacarosa de 25000g con notas "Saco IANSA 25kg".',
          'La próxima vez que abrás Inv. de Sacarosa, el form ya viene con tipo=Ingreso, qty=25000, notas="Saco IANSA 25kg".',
          'Si esa vez es distinto (ej. una merma), tocás "Limpiar" y rellenás de cero.',
          'Cada ingrediente tiene su propio prefill (no se mezcla con otros).',
        ],
      },
      {
        h: '💰 Precio y proveedor en cada entrada',
        p: 'Cuando el tipo de movimiento es **Entrada**, aparecen dos campos opcionales adicionales: **Precio total** (lo que pagaste por la compra completa) y **Proveedor**. La app calcula automáticamente el costo por kilo y lo guarda en el movimiento.',
        bullets: [
          'Si entrás "Precio total = 50000" para 25000g, queda guardado como 2000/kg.',
          'El campo Proveedor tiene autocomplete con tus proveedores ya registrados. Si escribís uno nuevo, se crea solo en el catálogo.',
          'Deja ambos campos en blanco si solo quieres ajustar stock sin tocar costos.',
          'En el modal verás un panel **Estadísticas de costo** con: último precio, promedio ponderado, mín/máx, total invertido en histórico.',
        ],
      },
    ],
    tips: [
      'Define stocks mínimos realistas (ej. 1500g de leche en polvo) — así te avisa antes de quedarte sin material.',
      'El historial completo de movimientos queda en el modal Inv. — útil para auditoría.',
      'Si tu ingrediente tiene varios códigos de barra (distintas marcas), todos descuentan del mismo stock — ver artículo "Múltiples códigos de barra".',
    ],
  },

  {
    id: 'suppliers-and-costs',
    category: 'inventory',
    title: 'Proveedores e historial de costos',
    intro: 'Catálogo único de proveedores reutilizable + costo por kg trazable en cada compra. Te permite saber cuánto pagaste y a quién, en cualquier momento.',
    sections: [
      {
        h: 'Catálogo de proveedores',
        p: 'En **Ingredientes** hay un botón 🚚 **Proveedores** que abre el catálogo. Crea una entrada por cada proveedor con: nombre, contacto, teléfono, email, lead time (días desde el pedido hasta la entrega) y notas.',
        bullets: [
          'El catálogo es global — un proveedor puede surtir varios ingredientes.',
          'Los proveedores se pueden crear de tres formas: desde este modal, desde el modal de Inv. al registrar una entrada (escribiendo el nombre — se crea solo), o de a poco mientras operás.',
          'La columna "Compras" muestra cuántos movimientos `in` lo referencian. Útil para no borrar uno con histórico.',
        ],
      },
      {
        h: 'Registrar costo en una entrada',
        p: 'Cuando registras un movimiento tipo **Entrada** en el modal Inv. de un ingrediente, aparecen los campos **Precio total** y **Proveedor**. Son opcionales — si los completas, queda guardado el costo por kg y la referencia al proveedor en el movimiento.',
        bullets: [
          'Precio total: lo que pagaste en esa compra completa (sin IVA o con IVA, según prefieras — la app no diferencia).',
          'La app calcula automáticamente el costo por kilo y lo muestra en vivo abajo del campo (ej. "= 2000 / kg").',
          'Proveedor: input con autocomplete que sugiere proveedores ya creados. Si tipeas uno nuevo, se crea solo al guardar.',
        ],
      },
      {
        h: 'Estadísticas de costo por ingrediente',
        p: 'En el modal Inv. de un ingrediente con histórico de costos verás un panel 💰 **Estadísticas de costo** con:',
        bullets: [
          '**Último**: precio por kg de la última compra registrada.',
          '**Promedio (ponderado)**: precio promedio ponderado por la cantidad comprada — refleja mejor lo que realmente pagaste.',
          '**Mín / Máx**: rango histórico de precios — te muestra volatilidad o errores de tipeo.',
          '**Total invertido**: suma de todas las compras + total kg recibidos. Útil para análisis de costos del periodo.',
        ],
      },
      {
        h: 'Historial completo en la tabla',
        p: 'La tabla de Historial dentro del modal Inv. ahora incluye dos columnas extra: **Costo / kg** y **Proveedor** — solo se llenan en movimientos tipo Entrada y solo si los completaste.',
      },
    ],
    tips: [
      'No es obligatorio capturar el precio en cada entrada — pero mientras más compras registres con costo, mejor el promedio ponderado refleja tu realidad.',
      'El campo lead time del proveedor te sirve para planificar: si tu proveedor tarda 5 días en entregar, no esperes hasta tener stock cero para pedir.',
      'Los proveedores y movimientos se guardan localmente. Si tienes el respaldo a carpeta activado, también van al backup automático y al snapshot diario.',
    ],
  },

  // ── Production ──────────────────────────────────────────────
  {
    id: 'production-flow',
    category: 'production',
    title: 'Flujo de producción',
    intro: 'Tres pasos: planificar → producir → registrar lotes.',
    sections: [
      {
        h: 'Planificación',
        p: 'En **Planificación** eliges una fecha y agregas recetas con litros a producir. La app calcula:',
        bullets: [
          'Cantidad de cada ingrediente que necesitas (lista consolidada)',
          'Costo total estimado',
          'Cantidad de bolas (~120g cada una)',
        ],
      },
      {
        h: 'Confirmar producción',
        p: 'Cuando llegues a la fecha (o ya la planeaste para hoy), clic en **Confirmar producción**. Esto:',
        bullets: [
          'Genera lotes con números únicos (LOTE-AÑO-NNNN)',
          'Crea snapshots con la composición exacta usada',
          'Descuenta automáticamente del inventario al cumplirse la fecha',
        ],
      },
      {
        h: 'Registro post-producción',
        p: 'En **Producción** ves el historial agrupado por fecha. Expandiendo cada lote puedes:',
        bullets: [
          'Ajustar pesos reales (lo que realmente usaste vs lo planificado)',
          'Anotar marca específica de cada ingrediente del lote',
          'Escribir notas del lote (rendimiento, observaciones)',
          'Imprimir etiqueta consumidor + hoja de proceso interna',
        ],
      },
      {
        h: 'Eliminar planes y lotes',
        p: 'Si tienes que cancelar un plan: ve a Planificación → fecha del plan → vacía las recetas → clic en **Eliminar plan**. Si los lotes ya se descontaron del inventario, también se revierte el stock.',
      },
    ],
    tips: [
      'Las fechas pasadas en Planificación quedan en read-only (no editables) — solo puedes consultar e imprimir.',
      'Si configuras tu plan para mañana, el inventario NO se descuenta hoy — se descuenta cuando llega esa fecha.',
    ],
  },
  {
    id: 'haccp-log',
    category: 'production',
    title: '🧪 Bitácora HACCP — chequeos sanitarios',
    intro: 'Registro auditable de los puntos críticos de control: temperaturas de cámara y mantenedora, pasteurización, recepción de materias primas y limpieza. Es lo que pide la autoridad sanitaria cuando inspecciona y la diferencia entre operación profesional vs. casera.',
    sections: [
      {
        h: 'Tipos de chequeo',
        bullets: [
          '**Cámara fría** (refrigeración) — ≤ 4 °C OK, 4-7 °C alerta, > 7 °C crítico.',
          '**Congelador** — ≤ -18 °C OK, -18 a -15 °C alerta, > -15 °C crítico.',
          '**Pasteurización** — ≥ 65 °C (LTLT) o ≥ 80 °C (HTST). Bajo 60 °C es crítico.',
          '**Recepción** — temperatura del producto al recibirlo. El status lo ponés vos según corresponda (refrigerado vs. congelado).',
          '**Limpieza** — checklist de superficies/máquinas. Sin valor numérico, solo OK/Alerta/Crítico + notas.',
          '**Otro** — cualquier chequeo personalizado: control de plagas, higiene del personal, etc.',
        ],
      },
      {
        h: 'Cómo registrar',
        p: 'Entra a **HACCP** desde el menú principal. Arriba tienes el formulario de nuevo chequeo:',
        bullets: [
          'Tipo: selecciona de la lista (cámara fría, congelador, pasteurización, recepción, limpieza, otro).',
          'Lugar: campo libre para identificar el equipo (ej. "Cámara 1", "Mantenedora vitrina B").',
          'Valor: temperatura medida (en °C). La app deriva automáticamente el status según los thresholds.',
          'Estado: dejalo en **Auto** para que se calcule, o forzá manualmente OK/Alerta/Crítico (útil para limpieza).',
          'Operador: tu nombre. La app recuerda el último que ingresaste.',
          'Notas: acción correctiva, modo de pasteurización, proveedor recibido, lo que sea relevante.',
        ],
      },
      {
        h: 'Resumen del día y filtros',
        p: 'Arriba siempre ves un resumen: cuántos chequeos llevas hoy y el desglose OK / Alerta / Crítico. Más abajo puedes filtrar el histórico por tipo y rango de fechas, agrupado por día.',
      },
      {
        h: 'Exportar a CSV',
        p: 'El botón **Exportar CSV** descarga el listado filtrado en formato planilla — listo para entregar a la autoridad sanitaria o archivarlo. Incluye fecha, hora, tipo, lugar, valor, unidad, status, operador y notas.',
      },
    ],
    tips: [
      'Hacé los chequeos en horario fijo (ej. 9 am al abrir, 2 pm post-pasteurización, 6 pm al cerrar). El registro a hora regular es más creíble que datos esporádicos.',
      'Si registras un crítico, anota la acción correctiva en notas (ej. "subo termostato a 4°C, reverificar 30 min"). La auditoría busca esto.',
      'La bitácora se respalda automáticamente a la carpeta de backup y al snapshot diario — no se pierde aunque cambies de PC.',
    ],
  },
  {
    id: 'mobile-warehouse',
    category: 'production',
    title: '📱 Bodega móvil — usa tu iPhone como escáner',
    intro: 'En vez de comprar un lector de códigos de barra USB ($150-300 USD), usas tu iPhone (o cualquier teléfono Android) caminando por la bodega. Apuntas la cámara, escaneas, registras ingresos o conteos. El PC ve los movimientos en segundos vía sincronización a Supabase.',
    sections: [
      {
        h: 'Por qué este modo',
        bullets: [
          'Cero hardware extra: el smartphone que ya tienes es el escáner.',
          'UI dedicada con botones grandes pensados para una mano.',
          'Sin App Store ni instalación: abres la URL en Safari/Chrome y "Add to Home Screen" para ícono.',
          'Sincronización con el PC en tiempo real (vía Supabase Realtime).',
        ],
      },
      {
        h: 'Configuración inicial (una vez)',
        bullets: [
          'En el PC: inicia sesión en GelatoLab con tu cuenta Supabase.',
          'En el teléfono: abre Safari y entra a la URL de GelatoLab + `/#/mobile`. Si estás en la misma red WiFi que el PC dev, va a `https://<ip-del-pc>:5173/#/mobile`. En producción, va a tu dominio + `/#/mobile`.',
          'Inicia sesión con la **misma cuenta** que usaste en el PC.',
          'Toca el menú compartir de Safari → "Add to Home Screen" → ícono en la pantalla principal.',
        ],
      },
      {
        h: 'Tres modos de uso',
        bullets: [
          '**📥 Ingreso de mercadería**: cuando llega un proveedor. Escaneás → te pide cuántos gramos llegaron → confirmás → suma al stock.',
          '**🧮 Conteo físico**: para inventarios mensuales. Escaneás → ingresás los gramos REALES contados → ajusta el stock al valor exacto.',
          '**🔍 Buscar ingrediente**: solo lectura. Escaneás → muestra qué ingrediente es y cuánto stock tiene. No modifica nada.',
        ],
      },
      {
        h: 'Si escaneas un código que aún no está asignado',
        bullets: [
          'El sistema te muestra el código detectado.',
          'Tocás "🔗 Asignar a un ingrediente".',
          'Aparece un buscador con tus ingredientes — buscás por nombre y tocás el correcto.',
          'El código queda asignado y continúa el flujo (te pide cantidad, confirmás).',
          'A futuro, cuando vuelvas a escanear ese mismo código, salta directo al paso de cantidad.',
        ],
      },
      {
        h: 'Permiso de cámara en iOS Safari',
        p: 'La primera vez Safari te pide permiso para usar la cámara. Acepta. Si por error denegaste, puedes volver a habilitarlo en **Ajustes iOS → Safari → Cámara → Preguntar** o **Permitir**.',
      },
      {
        h: 'HTTPS obligatorio para acceso a cámara',
        p: 'iOS Safari (y Chrome y todo navegador moderno) bloquea acceso a la cámara salvo que la URL sea HTTPS o localhost. En producción esto es transparente; en desarrollo local hay que arrancar el servidor con HTTPS habilitado.',
      },
    ],
    tips: [
      'Escanear varios items consecutivos del mismo proveedor: el formulario recuerda la cantidad y notas del último → solo confirmás.',
      'Si el iPhone va a estar en la cocina con manos sucias, considera ponerlo en una funda lavable o un soporte fijo en la bodega.',
      'Para sincronización offline (sin WiFi en bodega): los cambios se guardan en el iPhone y se suben automáticamente cuando vuelve la conexión.',
    ],
  },
  {
    id: 'ingredients-multi-barcodes',
    category: 'ingredients',
    title: '📷 Múltiples códigos de barra por ingrediente',
    intro: 'En la realidad un mismo ingrediente puede comprarse de marcas distintas (sacarosa IANSA y CCU, por ejemplo). Cada marca tiene su propio código de barras pero quieres que se descuente del MISMO stock. GelatoLab soporta múltiples códigos por ingrediente.',
    sections: [
      {
        h: 'Cómo agregar códigos a un ingrediente',
        bullets: [
          'Página **Ingredientes** → click sobre el ingrediente para abrir el modal de inventario.',
          'Sección **📷 Códigos de barra asociados** arriba del formulario de movimientos.',
          'Tipea o escanea un código y dale **+ Agregar**. Repetí para cada marca.',
          'Cada código aparece como chip con × para quitarlo.',
        ],
      },
      {
        h: 'Cómo agregar desde el iPhone (modo bodega)',
        bullets: [
          'Cuando llega una marca nueva del mismo producto, escaneas el código.',
          'El sistema dice "código no reconocido" y ofrece "🔗 Asignar a un ingrediente".',
          'Buscás el ingrediente existente (ej. Sacarosa) — ahora el picker muestra TODOS los ingredientes incluso los que ya tienen códigos (con un chip "N cód").',
          'Tocás el ingrediente → el código nuevo se **suma** a los existentes, no reemplaza.',
        ],
      },
      {
        h: 'Cómo se busca al escanear',
        p: 'Cuando escaneas CUALQUIER código (en PC o móvil), GelatoLab busca en TODOS los códigos de TODOS los ingredientes. Si el código aparece en alguno (ya sea el primero, segundo, quinto), abre ese ingrediente.',
      },
      {
        h: 'Compatibilidad backward',
        p: 'Si tenías el campo viejo `barcode` con un solo código, sigue funcionando. El nuevo `barcodes` (array) lo absorbe automáticamente la primera vez que toques al ingrediente. Cero migración manual.',
      },
    ],
    tips: [
      'Antes de cargar marcas distintas, verifica que efectivamente sean intercambiables en tus recetas. Si una marca tiene 99% sacarosa y otra 95%, mejor crearlas como ingredientes separados.',
      'Cada vez que tu proveedor cambie de proveedor de origen, escanea el primer envase que llegue para asociar el código nuevo. Los siguientes ya entran solos.',
    ],
  },
  {
    id: 'barcode-scanner',
    category: 'ingredients',
    title: '📷 Escáner de códigos de barra (cámara o lector USB)',
    intro: 'GelatoLab puede leer códigos de barra desde cualquier dispositivo con cámara. Funciona en el PC con webcam, en Tauri desktop, en iPhone Safari, en Chrome/Edge web — la misma URL, distinto contexto.',
    sections: [
      {
        h: 'Tres backends según contexto',
        bullets: [
          '**iOS / Android nativo (Capacitor)**: usa MLKit para lectura precisa con cámara del teléfono. La opción más rápida para producción.',
          '**Web/Tauri (ZXing)**: librería JavaScript que lee desde cualquier cámara accesible vía `getUserMedia`. Funciona en Chrome, Edge, Safari iOS, Tauri webview, etc. ~99% de los casos.',
          '**Lector USB tipo HID**: cualquier escáner barato que enchufas por USB y "tipea" el código en el campo con foco. Cero código, funciona automáticamente — solo necesitas tener foco en un input.',
        ],
      },
      {
        h: 'Formatos soportados',
        bullets: [
          'EAN-13 / EAN-8 (productos de retail típicos)',
          'UPC-A / UPC-E (productos americanos)',
          'Code 128, Code 39 (logística)',
          'QR (también detectables — útiles para tu propio etiquetado interno)',
          'Data Matrix, ITF, Codabar',
        ],
      },
      {
        h: 'Cuándo aparece el botón Escanear',
        p: 'El botón **📷 Escanear** aparece automáticamente en la página Ingredientes si tu navegador detecta una cámara accesible. Si estás en un PC sin webcam y sin lector USB, el botón se oculta — usa el ingreso manual.',
      },
      {
        h: 'Permisos',
        bullets: [
          '**Web/Tauri**: la primera vez te pide permiso de cámara. Si denegás, queda denegado hasta que lo cambies en la configuración del navegador.',
          '**iOS Safari**: solo funciona si la URL es HTTPS o localhost. Sin HTTPS, Safari bloquea la cámara silenciosamente.',
          '**Tauri desktop**: el permiso lo otorga el sistema operativo (Windows pide permiso la primera vez).',
        ],
      },
    ],
    tips: [
      'Si tienes mala luz en bodega, considerá un lector USB barato. La cámara del celular tiene problemas con códigos pequeños o brillosos en penumbra.',
      'Para etiquetar tus PROPIOS productos (helados artesanales) puedes generar QRs internos y leerlos con el mismo escáner.',
    ],
  },
  {
    id: 'desktop-app',
    category: 'getting-started',
    title: '💻 App de escritorio (Tauri)',
    intro: 'GelatoLab puede instalarse como aplicación nativa de Windows, macOS o Linux. Es la versión "profesional" para usar en el PC de la heladería: ícono en el menú inicio, ventana propia, respaldo automático en `Documents/GelatoLab/` desde el primer arranque, sin pedir permisos.',
    sections: [
      {
        h: 'Diferencias vs versión web',
        bullets: [
          '**Web** (Chrome/Edge): los datos viven en IndexedDB del navegador. Si limpias caché o cambias de equipo, podrías perderlos sin un backup ZIP.',
          '**Tauri desktop**: los datos viven igual en IndexedDB **pero** además se escriben automáticamente como JSON en `Documents/GelatoLab/`. Sobrevive a cualquier cosa del navegador.',
          '**Tamaño**: ~5 MB el ejecutable (vs ~80 MB de Electron). Arranque <1 segundo.',
          '**Performance**: igual que web, no más lento.',
        ],
      },
      {
        h: 'Cómo se distribuye',
        bullets: [
          'Generamos un **instalador `.exe`** (NSIS o MSI para Windows; DMG para macOS; AppImage/DEB para Linux) que el usuario baja y ejecuta.',
          'Doble-click → instala como cualquier programa estándar.',
          'Aparece como "GelatoLab" en el menú inicio.',
          'Se puede desinstalar normalmente desde Aplicaciones de Windows.',
        ],
      },
      {
        h: 'Respaldo automático garantizado',
        bullets: [
          'En el primer arranque crea automáticamente `C:\\Users\\<usuario>\\Documents\\GelatoLab\\`.',
          'Cada cambio en cualquier dato (recetas, lotes, ingredientes, inventario, proveedores, HACCP) se escribe como JSON en esa carpeta dentro de 2 segundos.',
          'Los archivos quedan visibles, copiables, editables.',
          'Si esa carpeta vive dentro de Drive/OneDrive/Dropbox, sync continuo a la nube automáticamente.',
        ],
      },
      {
        h: '📸 Snapshots diarios (historial día por día)',
        p: 'Una vez por día, además del respaldo "vivo" descrito arriba (que sobrescribe los mismos archivos), la app escribe una copia con timestamp dentro de `GelatoLab/snapshots/YYYY-MM-DD/`. Así tienes cómo volver atrás si alguien borra una receta o se corrompe un dato — abres la carpeta de la fecha que quieres y restaurás los JSON.',
        bullets: [
          'El snapshot del día se hace una sola vez por jornada (idempotente — si abres la app 5 veces, solo se escribe una).',
          'Incluye TODOS los stores: recipes, ingredients, productions, plans, inventory, business, suppliers, haccp, más un meta.json con fecha y runtime.',
          'Retención automática: 30 días. Los snapshots más viejos se borran solos para no acumular gigas.',
          'Funciona también en navegador (Chrome/Edge/Opera) si tienes conectada una carpeta vía File System Access API. En Tauri es transparente.',
          'Si guardás esa carpeta en Drive/OneDrive, la nube indexa cada snapshot — versionado real y gratuito.',
        ],
      },
      {
        h: 'Cuándo usar la app de escritorio',
        bullets: [
          'Heladería con un PC fijo en cocina/oficina donde GelatoLab corre todo el día.',
          'Cuando quieres respaldo sin depender del navegador ni de cuentas online.',
          'Cuando quieres que el equipo de cocina use la app sin saber de URLs ni navegadores.',
        ],
      },
      {
        h: 'Cuándo NO usar la app de escritorio',
        bullets: [
          'Acceso desde múltiples dispositivos (iPhone, tablet, varios PCs): la web + sync Supabase es mejor.',
          'Demos rápidas o testeo: la web es más portable.',
        ],
      },
    ],
    tips: [
      'Para distribuir, podemos firmar el .exe con un certificado EV de código (~$300/año) para evitar el warning "publisher desconocido" de Windows. Sin firma igual funciona, solo aparece un warning la primera vez.',
      'La carpeta de respaldo se puede cambiar manualmente: borrar el handle guardado en IndexedDB y al próximo arranque crea uno nuevo.',
      'Documentación técnica para compilar la app está en el archivo `TAURI.md` del proyecto.',
    ],
  },
  {
    id: 'observability',
    category: 'getting-started',
    title: '📊 Observabilidad — Sentry + Plausible',
    intro: 'GelatoLab puede reportar errores y métricas de uso a servicios externos en producción. Ambos son **opcionales**, **respetan el consentimiento de cookies** y **se cargan solo cuando hay variables de entorno configuradas**. En desarrollo nunca se activan.',
    sections: [
      {
        h: 'Sentry — captura de errores en producción',
        p: 'Cuando algo crashea en la app de un usuario, Sentry te avisa con stack trace, contexto y user-agent. Sin Sentry, los errores quedan solo en `localStorage` del usuario (visible vía la consola del browser) y nunca te enteras.',
        bullets: [
          'Crea un proyecto **React** en sentry.io (plan gratis = 5k errores/mes).',
          'Copia el DSN y agrega `VITE_SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/XXX` a tu `.env`.',
          'Build de producción: `npm run build` — Sentry se carga lazy en el primer error.',
          'Build de desarrollo (`npm run dev`): nunca carga Sentry. Los errores van a la consola y a `localStorage`.',
          '`logError(err, ctx)` — úsalo para reportar errores manuales con contexto extra.',
          '`setUserContext(user)` — adjunta el id del usuario a cada error que se reporte después.',
        ],
      },
      {
        h: 'Plausible — analytics privacy-friendly',
        p: 'Plausible es un servicio de analytics sin cookies, hosting europeo, GDPR-compliant. A diferencia de Google Analytics, no rastrea individuos — solo agrega métricas anónimas. Cuesta ~$9/mes (10k pageviews) o se puede self-host gratis.',
        bullets: [
          'Crea cuenta en plausible.io o levanta un servidor self-hosted.',
          'Agrega `VITE_PLAUSIBLE_DOMAIN=tudominio.com` a tu `.env`.',
          'Si self-hosteás, agrega también `VITE_PLAUSIBLE_HOST=https://tu-plausible.cl`.',
          'El script se carga solo cuando: (1) build de producción, (2) variable definida, (3) usuario aceptó cookies en el banner.',
          'Pageviews automáticos en cada cambio de ruta (vía `trackPageview()`).',
          'Custom events: usa `track(eventName, props)` para medir flujos clave.',
        ],
      },
      {
        h: 'Eventos custom rastreados actualmente',
        bullets: [
          '**Recetas**: `recipe_created`, `recipe_updated`, `recipe_wizard_created`, `template_used`, `recipes_compared`, `report_generated`',
          '**Auto-balance e IA**: `balance_applied_all`, `ai_recipe_analyzed`, `ai_ingredient_generated`',
          '**Producción**: `plan_confirmed`, `label_printed`, `production_sheet_printed`',
          '**Inventario**: `inventory_movement` (incluye `with_cost` y `with_supplier`), `stocktake_saved`, `barcode_scanned`',
          '**HACCP**: `haccp_check_recorded` (con `type` y `status`)',
          '**Proveedores**: `supplier_created`',
          '**Bodega móvil**: `mobile_scan_started`, `mobile_barcode_assigned`',
          '**Backup**: `folder_backup_connected`, `backup_exported`, `backup_imported`',
          '**Auth**: `signed_in`, `signed_out`',
        ],
      },
      {
        h: 'Privacidad y consentimiento',
        bullets: [
          'Plausible respeta el banner de cookies — si el usuario rechaza, no se carga el script.',
          'Sentry envía datos siempre que esté configurado (no requiere consentimiento legal por ser solo errores técnicos), pero `sendDefaultPii: false` evita IPs y emails.',
          'Ambos servicios filtran errores ruidosos comunes (`ResizeObserver loop`, fallos de red transitorios) para no saturar el dashboard.',
        ],
      },
    ],
    tips: [
      'En desarrollo local puedes probar Plausible con un dominio real (ej. localhost) si quieres ver eventos en el dashboard, pero asegúrate de NO commitear el DSN o el dominio a un repo público.',
      '`getErrorLog()` y `clearErrorLog()` — helpers para que el usuario te exporte los errores locales si Sentry no está activo.',
      'Si decidís NO usar analytics, simplemente no agregues `VITE_PLAUSIBLE_DOMAIN` ni `VITE_SENTRY_DSN`. La app funciona idéntico, solo que no reportás nada.',
    ],
  },
  {
    id: 'production-rating',
    category: 'production',
    title: '🌟 Cata multidimensional del lote',
    intro: 'Cuando produces un lote y lo pruebas, GelatoLab te permite registrar tu evaluación en 5 dimensiones independientes. Es feedback estructurado para iterar la receta o detectar problemas de proceso.',
    sections: [
      {
        h: 'Las 5 dimensiones',
        bullets: [
          '⭐ **General** — la nota global (la que aparece en la lista de lotes como resumen).',
          '✨ **Textura** — fineza del cristal, ausencia de granos, suavidad en boca.',
          '💪 **Cuerpo** — firmeza/cremosidad, resistencia a la deformación.',
          '👅 **Sabor** — intensidad y equilibrio del flavor; presencia de off-notes.',
          '🎨 **Color** — apariencia visual, uniformidad cromática, atractivo.',
        ],
      },
      {
        h: 'Cómo registrar',
        p: 'Producción → expandir un lote (botón "Ver detalle") → bloque **🌟 Cata de este lote**. Click en el número de estrellas que corresponde por dimensión. Click en la misma estrella nuevamente la limpia (rating 0 = sin evaluar).',
      },
      {
        h: 'Para qué sirve',
        bullets: [
          '**Diagnóstico**: si un lote sale con cuerpo bajo (3⭐) pero todo lo demás bien, sabes que tu mezcla está aguada o el overrun salió alto.',
          '**Comparación entre lotes**: dos lotes de la misma receta con resultados distintos te dicen si fue un problema de proceso (mantecación, pasteurización) y no de fórmula.',
          '**Ajuste de receta**: si todos los lotes de un sabor tienen sabor 4⭐+ pero color 2⭐, sabes dónde iterar.',
          '**Memoria**: pasados 6 meses, la nota explica por qué reformulaste un sabor.',
        ],
      },
      {
        h: 'En el listado',
        p: 'El rating general aparece como estrellas amarillas en el header de cada lote — escaneas la lista y ves de un golpe qué lotes salieron bien.',
      },
    ],
    tips: [
      'No todos los lotes necesitan rating. Si solo evalúas algunos, suficiente — los que no califiques quedan sin nota (no es 0).',
      'Calibra: si todos tus lotes son 5⭐, la escala no informa. Reserva el 5 para los excepcionales.',
    ],
  },
  {
    id: 'printing',
    category: 'production',
    title: 'Imprimir etiquetas y hojas de proceso',
    intro: 'Dos tipos de impresión por lote, cada una con un propósito diferente.',
    sections: [
      {
        h: 'Etiqueta consumidor (botón teal "Etiqueta")',
        p: 'Es la que pegarás en el envase del producto final. Tamaño 80×140mm. Incluye:',
        bullets: [
          'Nombre comercial de tu heladería',
          'Nombre del producto + lote + fecha + volumen',
          'Fecha de consumo preferente (3 meses por defecto)',
          'Sellos del país elegido (octógonos / lupa / semáforo)',
          'Lista de ingredientes',
          'Cuadro destacado con alérgenos',
          'Tabla nutricional por 100g y por porción',
          'Mantener congelado a -18°C',
          'Datos legales: razón social + ID tributario + reg. sanitario',
        ],
      },
      {
        h: 'Hoja de proceso (botón verde "Imprimir proceso")',
        p: 'Es la hoja A4 que llevas a la cocina. Para uso interno. Incluye:',
        bullets: [
          'Cabecera: receta + lote + fecha + volumen + masa total',
          'Tabla de ingredientes con columnas Base / Lote / Real / Marca (para que anotes lo realmente usado)',
          'Sección de proceso (las notas de la receta)',
          'Espacios firmados "Elaborado por" y "Verificado por"',
        ],
      },
      {
        h: 'Lista consolidada (en Planificación)',
        p: 'En Planificación, botón "Imprimir lista". Hoja A4 con todos los ingredientes que necesitas comprar/sacar de bodega para producir todo el plan del día. Incluye totales en gramos, kg y costo.',
      },
    ],
  },

  // ── Labeling ────────────────────────────────────────────────
  {
    id: 'labeling-systems',
    category: 'labeling',
    title: 'Sistemas de etiquetado por país',
    intro: 'GelatoLab soporta 24 países con 4 sistemas de etiquetado distintos. Elige el tuyo en el menú superior.',
    sections: [
      {
        h: '🛑 Octágono ALTO EN / EXCESO',
        p: 'Sello negro octagonal con texto blanco. Vigente en:',
        bullets: [
          '🇨🇱 Chile · 🇵🇪 Perú · 🇨🇴 Colombia (texto "ALTO EN")',
          '🇲🇽 México · 🇦🇷 Argentina · 🇺🇾 Uruguay (texto "EXCESO" / "EXCESO EN")',
        ],
      },
      {
        h: '🔍 Lupa ALTO EM / HIGH IN',
        p: 'Símbolo con cuerpo rectangular y círculo lateral. Vigente en:',
        bullets: [
          '🇧🇷 Brasil (RDC 429/2020 ANVISA, vigente desde oct 2022) — 3 nutrientes: azúcares añadidos, grasas saturadas, sodio',
          '🇨🇦 Canadá (Health Canada, vigente desde ene 2026) — mismos 3 nutrientes',
        ],
      },
      {
        h: '🚦 Semáforo nutricional',
        p: 'Tres bandas verde/amarillo/rojo para azúcares, grasas y sal. Solo:',
        bullets: ['🇪🇨 Ecuador (RTE INEN 022)'],
      },
      {
        h: 'Sin etiquetado obligatorio',
        p: 'Países sin sistema FOP (Front of Package) federal vigente:',
        bullets: [
          '🇻🇪 🇵🇾 🇧🇴 🇨🇷 🇵🇦 🇩🇴 🇸🇻 🇬🇹 🇭🇳 🇳🇮 🇨🇺 🇵🇷 🇺🇸',
          'En estos casos GelatoLab muestra solo la tabla nutricional sin sellos.',
        ],
      },
    ],
    tips: [
      'Los umbrales y textos se adaptan automáticamente al país. Si vendes en varios mercados, basta con cambiar el país en el selector y reimprimir.',
    ],
  },
  {
    id: 'labeling-thresholds',
    category: 'labeling',
    title: 'Umbrales por país (cuándo aparece cada sello)',
    intro: 'Los valores se evalúan por 100g de alimento sólido (helados/gelatos se consideran sólidos en todos los marcos regulatorios).',
    sections: [
      {
        h: '🇨🇱 Chile / 🇵🇪 Perú',
        bullets: [
          'Energía ≥ 275 kcal',
          'Azúcares totales ≥ 10 g',
          'Grasas saturadas ≥ 4 g',
          'Sodio ≥ 400 mg',
          '🇵🇪 Perú agrega Grasas trans ≥ 0.2 g',
        ],
      },
      {
        h: '🇲🇽 México (NOM-051 Fase 3, 2026)',
        bullets: [
          'Energía ≥ 275 kcal',
          'Azúcares añadidos ≥ 10% kcal',
          'Grasas saturadas ≥ 10% kcal',
          'Grasas trans ≥ 1% kcal',
          'Sodio ≥ 300 mg',
        ],
      },
      {
        h: '🇦🇷 Argentina / 🇺🇾 Uruguay / 🇨🇴 Colombia (perfil OPS)',
        bullets: [
          'Azúcares ≥ 10% kcal',
          'Grasas saturadas ≥ 10% kcal',
          'Grasas totales ≥ 30% kcal',
          'Sodio ≥ max(1 mg/kcal, 300 mg)',
          '🇦🇷 Argentina agrega Energía ≥ 275 kcal',
        ],
      },
      {
        h: '🇧🇷 Brasil',
        bullets: [
          'Azúcares **añadidos** ≥ 15 g (no totales)',
          'Grasas saturadas ≥ 6 g',
          'Sodio ≥ 600 mg',
        ],
      },
      {
        h: '🇨🇦 Canadá',
        bullets: [
          'Grasas saturadas ≥ 5 g',
          'Sodio ≥ 530 mg',
          'Azúcares totales ≥ 23 g',
        ],
      },
    ],
  },
  {
    id: 'business-data-on-labels',
    category: 'labeling',
    title: 'Datos del negocio en las etiquetas',
    intro: 'Tu nombre comercial, razón social, ID tributario y registro sanitario aparecen automáticamente en cada etiqueta.',
    sections: [
      {
        h: 'Configurar primera vez',
        p: 'Al iniciar la app por primera vez, aparece el wizard de 3 pasos: idioma → país → datos del negocio. El paso 3 pide:',
        bullets: [
          '**Nombre comercial** (obligatorio): aparece grande arriba en cada etiqueta y en el banner del menú superior',
          '**Razón social**: aparece al pie de la etiqueta',
          '**ID tributario**: el campo se etiqueta según tu país (RUT/CUIT/RFC/CNPJ/RUC/NIT/etc.)',
          '**Registro sanitario**: opcional, también con etiqueta correcta del país (DIGESA/INVIMA/ANVISA/RNE/etc.)',
          '**Dirección**: opcional',
        ],
      },
      {
        h: 'Editar después',
        p: 'Si necesitas corregir algo, ve al menú de usuario (icono de letra arriba a la derecha) → **⚙ Configuración del negocio**. Si no estás logueado, hay un ícono ⚙ standalone arriba a la derecha.',
      },
    ],
    tips: [
      'Verifica que la información sea correcta antes de imprimir lotes oficiales — los datos van en cada etiqueta y son legalmente vinculantes en la mayoría de países.',
    ],
  },

  {
    id: 'production-machine',
    category: 'production',
    title: 'Equipos: mantecador, pasteurizador y recomendaciones por modelo',
    intro: 'GelatoLab te deja registrar marca y modelo de tu mantecador y de tu pasteurizador. Con esa info te avisa si el lote queda fuera del rango operativo y te muestra setpoints específicos (temperatura, ciclo, tiempo) para tu equipo y tipo de receta.',
    sections: [
      {
        h: 'Cómo configurar tus equipos',
        p: 'Menú de usuario → **⚙ Configuración del negocio**. Hay dos campos:',
        bullets: [
          '**Mantecador / Batch freezer** — 27 opciones: 15 modelos hogareños/semipro (Lello Musso, Cuisinart ICE-100, KitchenAid, Whynter, Breville, Nemox, etc.) + comerciales europeos (Carpigiani Maestro RTX y LB 502, Frigomat M50, Telme Petra) + **fabricación chilena Icemel 15/30/60/90** + combos (Bravo Trittico, Carpigiani Maestro HE, Icemel C15).',
          '**Pasteurizador** — 23 opciones: Bravo Pastomaster 30/60/120, Carpigiani Pastomatic 60/120, Frigomat TM30/60, Telme Ecogel 30/60, **Icemel P30/P60/P120 + PD60/PD120 (doble cuba, fabricación chilena)**, 2 genéricos + los combos también listados aquí.',
          'Si tu máquina es **combo** (pastoriza + manteca, ej. Bravo Trittico) puedes seleccionarla en uno solo de los dos campos: GelatoLab muestra todas las etapas relevantes.',
        ],
      },
      {
        h: 'Aviso de volumen del lote',
        p: 'En **Lotes** (calculadora de escalado), debajo del input de litros, aparecen avisos independientes para mantecador y pasteurizador:',
        bullets: [
          '✓ Verde: el lote está dentro del rango operativo.',
          '⚠ Amarillo: bajo el mínimo. Mantecador → cristales grandes, mala incorporación de aire. Pasteurizador → calentamiento desigual, riesgo HACCP.',
          '⚠ Rojo: sobre el máximo. Mantecador → desborde, congelación irregular. Pasteurizador → la sonda no llega a la mezcla del fondo.',
          'Si seleccionaste un combo en ambos campos, el aviso aparece solo una vez.',
        ],
      },
      {
        h: 'Recomendaciones específicas por equipo (Receta → Proceso)',
        p: 'En el editor de receta, tab **Proceso**, panel lateral derecho, aparece una tarjeta **🛠 Tu equipo** que adapta los setpoints según el modelo seleccionado y el tipo de receta (helado / gelato / sorbete).',
        bullets: [
          'Pasteurización: modo (HTST / LTLT / CUSTOM), setpoint (°C) y tiempo de retención. Ej. Bravo Pastomaster 60 + helado → 85 °C / 15 s · ciclo P85.',
          'Enfriamiento y maduración: temperatura y duración objetivo.',
          'Mantecación: temperatura de extracción, tiempo de ciclo y overrun esperado. Ej. Trittico Executive 304 + gelato → -8 °C / 8-12 min / overrun 25-35%.',
          'Endurecimiento: temperatura de cámara objetivo.',
        ],
      },
      {
        h: 'De dónde salen los valores recomendados',
        p: 'Los valores combinan dos fuentes:',
        bullets: [
          '**Baseline por tipo de receta** — guías genéricas estándar de la industria (gelato 25-35% overrun, helado 60-100%, sorbete extracción a -5 °C, etc.).',
          '**Override por modelo** — ajustes finos para máquinas con ciclos preprogramados conocidos (Bravo Pastomaster con su ciclo P85, Trittico con HOT/COLD, etc.).',
          'Para máquinas sin overrides, GelatoLab cae al baseline. **Siempre cruza los valores con el manual del fabricante** — los firmwares varían entre generaciones.',
        ],
      },
      {
        h: 'Por qué importa el volumen',
        bullets: [
          '**Mínimo**: en mantecador, la pala no raspa cristal ni incorpora aire. En pasteurizador, la sonda y la pala calientan desigual la masa.',
          '**Máximo**: en mantecador, el aire infla la mezcla y rebalsa. En pasteurizador, la mezcla del fondo no llega a temperatura HACCP.',
          '**Óptimo**: zona donde el equipo trabaja como fue diseñado.',
        ],
      },
    ],
    tips: [
      'Si tu máquina no está en la lista, déjalo en "— Sin especificar —". No verás avisos ni recomendaciones específicas, pero el panel de Proceso sigue mostrando las guías genéricas por tipo de receta.',
      'Si usas un combo (Trittico, Maestro HE, Icemel C-line) y compras además un pasteurizador dedicado, selecciona el combo en Mantecador y el dedicado en Pasteurizador: GelatoLab evita duplicar la etapa de pasteurización.',
      'Los equipos **Icemel** (Chile, icemel.cl) usan dos convenciones distintas: en mantecadoras y combos C-line el número del modelo indica producción aproximada en **L/hora** (Icemel 30 ≈ 30 L/h con ~4 L por ciclo de 10 min); en pasteurizadores P y PD el número indica **capacidad máxima del tanque en L/ciclo** (P30 = 10-30 L por ciclo de 120 min).',
      'Para sumar una máquina nueva al catálogo, agrégala como issue en GitHub. Solo necesita litros mínimo / óptimo / máximo del fabricante.',
    ],
  },
  {
    id: 'ingredients-micronutrients',
    category: 'ingredients',
    title: 'Micronutrientes: vitamina D, calcio, hierro, potasio, colesterol',
    intro: 'Algunas regulaciones (FDA US 2020, Codex) requieren declarar micronutrientes específicos. GelatoLab los rastrea por ingrediente y los suma a la receta.',
    sections: [
      {
        h: 'Qué se rastrea',
        bullets: [
          '**Colesterol** (mg/100g) — requerido en muchos países, incluyendo Chile y México.',
          '**Vitamina D** (µg/100g) — FDA 2020 lo requiere; raro en LATAM pero útil para productos enriquecidos.',
          '**Calcio** (mg/100g) — FDA 2020. Naturalmente alto en lácteos.',
          '**Hierro** (mg/100g) — FDA 2020. Bajo en helado regular; relevante si fortificas.',
          '**Potasio** (mg/100g) — FDA 2020. Naturalmente presente en frutas y lácteos.',
        ],
      },
      {
        h: 'Cómo cargarlos',
        bullets: [
          'En la página **Ingredientes** → "+ Nuevo ingrediente" o editar uno existente, hay una sección "Micronutrientes (opcional)" en el modal.',
          'Si dejas todo en 0, no se muestran en la etiqueta — solo aparecen cuando al menos un ingrediente aporta valor.',
          'La función **✨ Auto-completar con IA** también estima estos campos cuando creas un ingrediente nuevo.',
        ],
      },
      {
        h: 'Dónde se muestran',
        p: 'En el editor de receta → tab **Nutrición**, la tabla nutricional principal incluye automáticamente las filas de micronutrientes cuando hay valores agregados. La etiqueta impresa los muestra solo si el país elegido tiene un sistema de etiquetado activo (octógonos, lupa, semáforo) — algunos países no requieren su declaración.',
      },
      {
        h: 'Valores típicos de referencia',
        bullets: [
          'Leche entera: 110 mg calcio, 0.5 µg vit D (si fortificada), 130 mg potasio, 10 mg colesterol por 100 g.',
          'Yema de huevo: ~250 mg colesterol, 2.7 mg hierro, 130 mg calcio por 100 g.',
          'Sacarosa, glucosa, dextrosa, agua: 0 en todos los micronutrientes.',
        ],
      },
    ],
    tips: [
      'No tienes que llenarlos todos — solo los relevantes para tu mercado. Para etiqueta chilena no son obligatorios; para FDA US sí.',
      'Si tu proveedor entrega ficha técnica con %DV (daily value), conviértelo a mg/µg con los valores estándar (calcio 1300 mg, hierro 18 mg, potasio 4700 mg, vit D 20 µg).',
    ],
  },

  // ── AI assistants ───────────────────────────────────────────
  {
    id: 'ai-overview',
    category: 'ai',
    title: 'Cómo activar los asistentes IA',
    intro: 'GelatoLab tiene dos asistentes IA: uno completa los datos nutricionales de un ingrediente nuevo, y otro analiza tu receta en su conjunto y propone los menos cambios posibles con máximo efecto. Ambos usan tu propia cuenta de OpenAI.',
    sections: [
      {
        h: 'Por qué la clave la pones tú',
        p: 'GelatoLab no cobra por la IA ni envía tus datos a un servidor intermedio. La clave que pegues queda **solo en tu navegador** (localStorage); cada llamada va directo de tu computador a OpenAI. Tú controlas el costo, tú ves el consumo en tu cuenta de OpenAI.',
      },
      {
        h: 'Crear la clave en OpenAI',
        bullets: [
          'Abre **platform.openai.com/api-keys** y entra con tu cuenta.',
          'Click en **"Create new secret key"**. Dale un nombre descriptivo (ej. "GelatoLab"). Copia la clave (empieza con `sk-proj-...`) — solo te la muestran una vez.',
          'Ve a **platform.openai.com/settings/billing** y carga al menos **5 USD**. Sin saldo, las llamadas fallan con error 429.',
        ],
      },
      {
        h: 'Configurar GelatoLab',
        bullets: [
          'Ve a Ingredientes → "+ Nuevo ingrediente" o al editor de cualquier receta → tab Análisis.',
          'Click en cualquier botón violeta **✨ Auto-completar** o **✨ Análisis con IA**.',
          'La primera vez se abre un modal pidiendo la clave. Pégala y guarda.',
          'Puedes elegir el modelo: **gpt-4o-mini** (rápido, ~$0.001/llamada — recomendado) o **gpt-4o** (mejor calidad, ~$0.02/llamada).',
        ],
      },
      {
        h: 'Costos típicos por mes',
        p: 'Para una heladería pequeña que usa la IA esporádicamente:',
        bullets: [
          'Auto-completar 20 ingredientes nuevos al mes: ~$0.02 USD',
          'Analizar 50 recetas al mes: ~$0.15 USD',
          'Total realista: **menos de $1 USD/mes** con gpt-4o-mini.',
        ],
      },
      {
        h: 'Borrar la clave',
        p: 'Vuelve a abrir el modal (cualquier botón ✨) → botón rojo **"Borrar clave"**. La clave se elimina de tu navegador y la IA queda nuevamente apagada.',
      },
    ],
    tips: [
      'Si compartes el computador, NO uses esta función. La clave queda en localStorage y cualquiera con acceso al navegador puede leerla.',
      'Si te aparece "AI_ERROR: 401" la clave es inválida. "AI_ERROR: 429" significa sin saldo o rate-limit.',
      'La IA estima, no garantiza. Siempre revisa los valores que devuelve antes de aceptarlos.',
    ],
  },
  {
    id: 'ai-ingredient',
    category: 'ai',
    title: '✨ Auto-completar un ingrediente con IA',
    intro: 'Al crear un ingrediente nuevo, en lugar de buscar uno por uno en internet los 14 campos nutricionales (water_pct, fat_pct, protein, lactosa, sodio, etc.), pegas el nombre y la IA estima todo.',
    sections: [
      {
        h: 'Cuándo usarlo',
        bullets: [
          'Ingredientes raros que no están en la base por defecto (ej. *paste de pistacho siciliano*).',
          'Productos comerciales específicos donde tienes la etiqueta solo parcial.',
          'Cuando conoces algunos campos (ej. la grasa por la etiqueta) pero no el PAC/POD.',
        ],
      },
      {
        h: 'Paso a paso',
        bullets: [
          'Ingredientes → **+ Nuevo ingrediente**.',
          'Escribe el **nombre** (lo más específico posible: "leche en polvo descremada 0% grasa" mejor que "leche en polvo").',
          'Opcional: llena los campos que ya conoces. La IA los respeta y completa los faltantes.',
          'Opcional: en el campo **"Fuente / comentario"** pega la lista de ingredientes del envase si la tienes. Eso aumenta la precisión muchísimo.',
          'Click **✨ Auto-completar**. Espera 2-5 segundos.',
          'Aparecerá un cuadro de color con el nivel de **confianza** (alta/media/baja) y la **explicación** de las suposiciones que hizo.',
        ],
      },
      {
        h: 'Qué campos completa',
        p: 'Estima los 14 campos nutricionales: water_pct, fat_pct, sng_pct, sugar_pct, others_pct, protein, satfat, trans_fat, sodium_mg, calories, sugars, added_sugars, **POD** y **PAC**.',
      },
      {
        h: 'Confianza alta vs baja',
        bullets: [
          '**Alta**: producto estándar y bien conocido (sacarosa, leche entera, agua). Puedes aceptar tal cual.',
          '**Media**: producto comercial común con variabilidad entre marcas. Verifica con la etiqueta del envase si la tienes.',
          '**Baja**: ingrediente exótico o ambiguo. Revisa cada campo y corrige a mano si tienes datos reales.',
        ],
      },
    ],
    tips: [
      'Después de auto-completar, **siempre revisa** y corrige antes de guardar. La IA no es infalible.',
      'Si tienes la etiqueta nutricional en una foto, transcribe los valores conocidos primero — eso le da contexto a la IA y mejora la calidad.',
      'POD y PAC son los más difíciles de estimar para ingredientes novedosos. Si la confianza es media o baja, busca referencias técnicas.',
    ],
  },
  {
    id: 'ai-recipe',
    category: 'ai',
    title: '✨ Análisis holístico de receta con IA',
    intro: 'Mientras el balance interno te dice "POD bajo, sube azúcar", la IA mira la receta entera y te propone los menos cambios posibles con máximo efecto: a veces un solo reemplazo corrige varios desbalances al mismo tiempo.',
    sections: [
      {
        h: 'Cuándo usarlo',
        bullets: [
          'Cuando llevas rato aplicando sugerencias del balance interno y siguen apareciendo nuevos problemas.',
          'Cuando el verdict global está en amarillo o rojo y no entiendes el patrón causal.',
          'Cuando empiezas con una receta importada de otro lado y necesitas un diagnóstico rápido.',
        ],
      },
      {
        h: 'Paso a paso',
        bullets: [
          'En el editor de receta, abre la tab **Análisis**.',
          'Scroll hasta el final → card **"✨ Análisis con IA"**.',
          'Click **Analizar receta**. Espera 3-8 segundos.',
          'Aparece un párrafo de texto con el diagnóstico holístico y las acciones concretas sugeridas.',
        ],
      },
      {
        h: 'Qué información usa',
        p: 'La IA recibe: tipo y subtipo, parámetros calculados con sus rangos óptimos, FPD, lista completa de ingredientes con cantidades y aportes (fat, sugar, MSNF, PAC, POD por ingrediente). NO recibe datos de tu negocio, lotes, ni clientes.',
      },
      {
        h: 'Estilo de las respuestas',
        bullets: [
          'Texto plano, sin markdown ni código.',
          'Tono profesional, como hablándole a un formulador con experiencia.',
          'Identifica patrones causales (ej. "la leche entera está causando bajo fat **y** alto MSNF al mismo tiempo").',
          'Propone reemplazos o ajustes mínimos (ej. "100g de leche → 50g crema + 50g leche en polvo").',
          'NO da consejos de mantecación ni servicio.',
        ],
      },
      {
        h: 'IA vs balance interno: cuál usar cuándo',
        bullets: [
          '**Balance interno (⚖)**: ajustes mecánicos pequeños sobre ingredientes que ya tienes. Determinístico, gratis, instantáneo, respeta tu T° de servicio.',
          '**Análisis IA (✨)**: re-pensar la receta. Puede sugerir agregar ingredientes nuevos o reemplazar uno por otro. Cuesta $0.001-0.02 USD por llamada.',
          'Lo ideal: usa el balance interno para iterar rápido y la IA para una revisión holística cuando te trabes.',
        ],
      },
    ],
    tips: [
      'Si la IA propone un ingrediente que no tienes en la base, créalo primero (puedes auto-completarlo con la otra IA).',
      'La IA no aplica los cambios automáticamente — solo los sugiere. Tú los implementas a mano.',
      'Si quieres re-analizar después de aplicar cambios, click "Volver a analizar".',
    ],
  },

  // ── Glossary ────────────────────────────────────────────────
  {
    id: 'glossary',
    category: 'glossary',
    title: 'Glosario técnico',
    intro: 'Términos clave para entender los cálculos.',
    sections: [
      {
        h: 'PAC — Poder anticongelante',
        p: 'Capacidad de un ingrediente de bajar el punto de congelación. Sacarosa = 100. Dextrosa = 190 (más anticongelante). Más PAC total = helado más blando a la misma temperatura.',
      },
      {
        h: 'POD — Poder edulcorante',
        p: 'Capacidad de aportar dulzor percibido. Sacarosa = 100. Fructosa = 175 (más dulce). Trehalosa = 45 (menos dulce). Te permite balancear dulzor sin disparar el PAC.',
      },
      {
        h: 'FPD — Freezing Point Depression',
        p: 'Cuántos grados por debajo de 0°C empieza a congelar tu mezcla. Calculado a partir del PAC, el % de agua y los sólidos. Típico para helado: -2 a -3 °C. Para gelato: -2.5 a -3.5 °C.',
      },
      {
        h: 'MSNF / SNG — Sólidos lácteos no grasos',
        p: 'Proteínas, lactosa y minerales del lácteo. Aporta cuerpo y estructura. Demasiado = textura arenosa por exceso de lactosa. Rango óptimo helado: 8-11%. Gelato: 9-12%.',
      },
      {
        h: 'Overrun',
        p: 'Aire incorporado durante la mantecación, expresado como % de aumento de volumen. Helado americano: 60-100%. Gelato italiano: 25-40%. Sorbete: 15-25%. Más overrun = textura más liviana, menos sabor concentrado.',
      },
      {
        h: 'Sólidos totales',
        p: 'Todo lo que no es agua: grasa + SNG + azúcares + otros. Para helado/gelato: 36-42%. Para sorbete: 28-34%.',
      },
      {
        h: 'Azúcares añadidos vs totales',
        p: 'Brasil y México distinguen: **añadidos** son los que tú agregas (sacarosa, dextrosa, miel); **totales** incluyen también los naturales del ingrediente (fructosa de la fruta, lactosa de la leche). GelatoLab tiene ambos campos por ingrediente.',
      },
      {
        h: 'Pasteurización',
        p: 'Tratamiento térmico para eliminar microorganismos. **HTST**: 72°C × 15 segundos. **LTLT**: 63°C × 30 minutos (recomendado con yema de huevo). Después: enfriar rápido a 4°C.',
      },
      {
        h: 'Maduración (aging)',
        p: 'Reposo de la mezcla en frío (~4°C) durante 4-12h antes de mantecar. Mejora cuerpo, estabilidad y textura. Crítico para helados con grasa alta o yema.',
      },
      {
        h: 'Mantecación (churning)',
        p: 'Proceso de batido y congelación simultánea en la mantecadora. Incorpora aire (overrun) y forma cristales pequeños de hielo.',
      },
    ],
  },
];
