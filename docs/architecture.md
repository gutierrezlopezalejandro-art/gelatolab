# Arquitectura GelatoLab

Diagrama de arquitectura de la aplicación, sus dependencias y servicios externos.

```mermaid
graph TB
    subgraph "Clientes"
        Web[gelatolab.app<br/>React + Vite<br/>HashRouter]
        Desktop[Tauri Desktop<br/>Win/Mac/Linux<br/>v1.0.6]
        Mobile[Capacitor iOS<br/>en desarrollo]
    end

    subgraph "Frontend React"
        Pages[Pages<br/>Landing · Auth · Dashboard<br/>Recipes · Plan · Production<br/>HACCP · IngredientDB · Help]
        Stores[Zustand Stores<br/>auth · recipe · ingredient<br/>plan · production · business<br/>country · ai · app]
        Components[UI Components<br/>UserMenu · BackupReminder<br/>WelcomeTour · BusinessSettings<br/>ProGate · UpgradeModal]
        i18n[i18n<br/>es · en · pt · fr · de · it<br/>+ ja · ko parciales]
    end

    subgraph "Almacenamiento Local"
        IDB[IndexedDB<br/>localStorage]
        FolderSync[Folder Backup<br/>Documents/GelatoLab/<br/>Drive/Dropbox/OneDrive]
    end

    subgraph "Backend Supabase"
        Auth[Supabase Auth<br/>email + Google OAuth]
        DB[(Postgres + RLS<br/>profiles · recipes<br/>ingredients · batches<br/>haccp_logs · plans)]
        ProfilesTable[profiles<br/>plan: free/pro/admin<br/>plan_expires_at]
    end

    subgraph "Distribución y CI/CD"
        GH[GitHub<br/>código + releases]
        Pages_GH[GitHub Pages<br/>deploy.yml]
        Releases[GitHub Releases<br/>release-desktop.yml<br/>.exe .msi .dmg<br/>.AppImage .deb<br/>+ .sig + latest.json]
    end

    subgraph "Servicios Externos"
        OpenAI[Marco IA<br/>OpenAI API<br/>clave del usuario]
        Plausible[Plausible<br/>analytics opcional]
        Sentry[Sentry<br/>errores opcional]
        Resend[Resend<br/>email transaccional<br/>planeado]
        Stripe[Stripe<br/>pagos<br/>planeado Fase 2]
        SSL[SSL.com<br/>Authenticode Windows<br/>en proceso]
    end

    subgraph "Infraestructura Marca"
        SpA[Llanquihue Tech SpA<br/>Chile · constituida 2026-05-04]
        Domain[gelatolab.app<br/>Let's Encrypt + HSTS]
    end

    Web --> Pages
    Desktop --> Pages
    Mobile --> Pages
    Pages --> Stores
    Pages --> Components
    Components --> i18n
    Stores --> IDB
    Desktop --> FolderSync

    Stores -. opcional sync .-> Auth
    Auth --> DB
    DB --> ProfilesTable

    GH --> Pages_GH
    GH --> Releases
    Pages_GH --> Web
    Releases --> Desktop

    Desktop -. auto-updater<br/>valida con minisign .-> Releases

    Pages -. Marco IA .-> OpenAI
    Pages -. tracking .-> Plausible
    Pages -. errores .-> Sentry
    Auth -. emails .-> Resend
    Stripe -. webhooks .-> DB
    SSL -. firma instaladores .-> Releases

    SpA --> Domain
    SpA --> SSL

    style Desktop fill:#1a5c3a,color:#fff
    style Web fill:#1a5c3a,color:#fff
    style Mobile fill:#666,color:#fff
    style DB fill:#3ECF8E,color:#000
    style Stripe fill:#aaa,color:#000
    style Resend fill:#aaa,color:#000
    style Mobile fill:#aaa,color:#000
```

## Conceptos clave

- **Local-first**: los datos viven en IndexedDB del cliente. La nube (Supabase) es opcional, solo para sync entre dispositivos.
- **Free vs Pro**: gating en `lib/entitlement.js`. La bandera `profiles.plan` en Supabase decide qué features se desbloquean.
- **Auto-updater desktop**: la app valida cada release con minisign (clave keyless), los `.sig` se generan en `release-desktop.yml`.
- **Componentes en gris**: aún no implementados pero forman parte del plan (Mobile, Stripe, Resend, Authenticode).
