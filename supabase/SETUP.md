# Configuración de Supabase para GelatoLab

Guía paso a paso para habilitar autenticación y sincronización en la nube.

**⏱ Tiempo estimado: 15 minutos**

---

## 1. Crear cuenta en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta (puedes usar GitHub o Google)
2. Haz clic en **"New Project"**
3. Completa:
   - **Name**: `gelatolab` (o el nombre que prefieras)
   - **Database Password**: genera una contraseña segura y **guárdala**
   - **Region**: elige la más cercana a tus usuarios (ej. `South America (São Paulo)` para Chile)
   - **Plan**: Free tier es suficiente para empezar
4. Espera ~2 minutos a que se aprovisione el proyecto

---

## 2. Obtener las credenciales

Una vez creado el proyecto:

1. Ve a **Project Settings** (⚙️ en la barra lateral)
2. Clic en **API** (panel izquierdo)
3. Copia dos valores:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - **anon public** key (una cadena larga que empieza con `eyJ...`)

---

## 3. Configurar variables de entorno

En la raíz del proyecto GelatoLab:

1. Copia `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edita `.env` con tus valores:
   ```
   VITE_SUPABASE_URL=https://abcdefgh.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...
   ```
3. **IMPORTANTE**: `.env` ya está en `.gitignore` y no se sube a GitHub.

---

## 4. Crear el schema de base de datos

1. En Supabase, ve a **SQL Editor** (panel izquierdo)
2. Clic en **"New query"**
3. Abre el archivo `supabase/schema.sql` de este proyecto
4. Copia TODO el contenido y pégalo en el editor SQL
5. Clic en **"Run"** (o `Ctrl+Enter`)

Deberías ver "Success. No rows returned". Esto crea:
- 4 tablas de sincronización (`user_recipes`, `user_ingredients`, `user_productions`, `user_plans`)
- Tabla `profiles` con plan de subscripción
- Row-Level Security (cada usuario solo ve sus datos)
- Trigger automático que crea un profile al registrarse

---

## 5. Configurar autenticación

### Email/Password (mínimo)

Ya viene habilitado por defecto. Puedes verificarlo en:
**Authentication → Providers → Email**

### Confirmación de email (recomendado)

Por defecto Supabase envía un email de confirmación. Puedes:
- Dejarlo habilitado (seguro, requiere verificación)
- Deshabilitarlo para pruebas: **Authentication → Providers → Email → Confirm email: OFF**

### Google OAuth (opcional pero recomendado)

1. Ve a **Authentication → Providers → Google**
2. Habilítalo
3. Necesitas crear credenciales en [Google Cloud Console](https://console.cloud.google.com):
   - Crear proyecto
   - Habilitar **Google+ API**
   - Crear OAuth 2.0 Client ID (tipo Web application)
   - Como "Authorized redirect URIs" agrega la URL que te muestra Supabase
4. Copia Client ID y Client Secret a Supabase
5. Guarda

---

## 6. Habilitar Realtime (para sync en tiempo real)

El SQL ya incluye la activación, pero verifícalo:

1. **Database → Replication** (panel lateral)
2. Busca las tablas `user_recipes`, `user_ingredients`, `user_productions`, `user_plans`
3. Asegúrate que tengan el toggle "Realtime" activo

---

## 7. Probar

1. Reinicia el dev server: `npm run dev`
2. Abre la app → ahora deberías ver un botón "Iniciar sesión" en el navbar
3. Crea una cuenta de prueba
4. Crea una receta → se sincroniza automáticamente a Supabase
5. Inicia sesión en otro navegador o en modo incógnito → ¡las recetas aparecen!

---

## Estructura de datos

Cada usuario tiene 4 filas (una por tipo de dato) en tablas separadas. La columna `data` es JSONB y contiene el estado completo del store Zustand. Esto es intencional para simplicidad; se puede normalizar después si se necesita búsqueda compleja en servidor.

```
profiles (user_id, plan, stripe_customer_id, ...)
user_recipes (user_id, data: { recipes: [...], nextId }, updated_at)
user_ingredients (user_id, data: { ingredients: [...], nextId }, updated_at)
user_productions (user_id, data: { log: [...], nextId, nextLote }, updated_at)
user_plans (user_id, data: { plans: {...} }, updated_at)
```

---

## Plan Free vs Pro (futuro)

En el schema ya existe la columna `profiles.plan`. En la siguiente fase conectaremos con Stripe para:
- **Free**: sin sync cloud, solo local
- **Pro**: sync cloud activo, multi-dispositivo
- **Team**: multi-usuario con roles

---

## Troubleshooting

**"Cloud not configured"** → No tienes `.env` o las variables están mal. Verifica Paso 3.

**"Invalid login credentials"** → Email/password incorrecto, o el email no está confirmado (revisa bandeja de entrada).

**Los datos no se sincronizan** → Abre las DevTools → Console. Busca errores de Supabase. También revisa **Database → Logs** en el dashboard.

**"row-level security policy violated"** → Alguna policy del SQL no se aplicó. Re-ejecuta el schema completo.

---

## Coste

Supabase tier Free incluye:
- 500 MB de BD
- 1 GB de storage
- 50,000 monthly active users
- 2 GB de ancho de banda

Para GelatoLab (app pequeña de formulación) esto cubre **cientos de usuarios** sin costo. Cuando escales, el tier Pro empieza en $25/mes.
