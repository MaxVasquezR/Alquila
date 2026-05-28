# Alquila

Marketplace P2P de alquiler de productos en Lima Metropolitana. El backend prioriza la **privacidad del propietario**: ubicación difusa (~500 m), datos de contacto cifrados y revelación controlada vía chat.

## Estructura

```text
Alquila/
├── backend/          # API REST (Express + TypeORM)
├── web/              # Frontend (React + Vite)
└── README.md
```

## Requisitos

- Node.js 20+
- Docker Desktop (recomendado) o PostgreSQL 15+

## Inicio rápido

```bash
cd backend
cp .env.example .env
npm install
npm run db:up      # levanta PostgreSQL (requiere Docker Desktop abierto)
npm run dev
```

### Si usas WSL y `docker` no se encuentra

1. Abre **Docker Desktop** en Windows y espera a que diga **Running**.
2. Ve a **Settings → Resources → WSL Integration** y activa tu distro (Ubuntu).
3. En PowerShell: `wsl --shutdown`, luego abre de nuevo la terminal WSL.
4. En `backend/`: `npm run db:up` y después `npm run dev`.

`npm run db:up` usa `docker.exe` de Windows si `docker` no está en el PATH de WSL.

### Sin Docker (PostgreSQL directo en WSL)

```bash
cd backend
bash scripts/install-postgres-wsl.sh
npm run dev
```

API: `http://localhost:3000` · Web: `http://localhost:5173`

### Frontend (sitio web)

```bash
cd web
npm install
npm run dev
```

Abre **http://localhost:5173** (el backend debe estar corriendo en el puerto 3000).

## Variables de entorno

Ver [`backend/.env.example`](backend/.env.example):

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto del servidor (default 3000) |
| `DATABASE_URL` | Conexión PostgreSQL |
| `JWT_SECRET` | Secreto para tokens JWT |
| `ENCRYPTION_KEY` | 64 caracteres hex (32 bytes) para AES-256-GCM |
| `LOCATION_FUZZ_RADIUS_METERS` | Radio de difuminado (default 500) |

## Endpoints principales

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | No | Registro (requiere `acceptTerms: true`) |
| POST | `/api/v1/auth/login` | No | Login → JWT |
| POST | `/api/v1/auth/email/send` | Sí | Reenviar verificación de correo |
| POST | `/api/v1/auth/email/verify` | No | Confirmar correo con token |
| GET | `/api/v1/products` | No | Listado público (sin datos sensibles) |
| GET | `/api/v1/products/:id` | No | Detalle público |
| POST | `/api/v1/products` | Sí | Crear producto (fuzz + cifrado) |
| GET | `/api/v1/products/me` | Sí | Mis productos (con ubicación exacta) |
| POST | `/api/v1/checkout/membership` | Sí | Suscripción Premium (mock) |
| GET | `/api/v1/ads/featured` | No | Productos destacados |
| POST | `/api/v1/ads/checkout` | Sí | Checkout `Super Promo` |
| POST | `/api/v1/ads/checkout/:paymentId/confirm` | Sí | Confirmar `Super Promo` |
| POST | `/api/v1/rental-requests` | Sí | Solicitud express de alquiler |
| POST | `/api/v1/chat/threads` | Sí | Abrir chat sobre producto |
| POST | `/api/v1/chat/threads/:id/messages` | Sí | Enviar mensaje / cuestionario |
| PATCH | `/api/v1/chat/threads/:id/accept-contact` | Sí | Dueño acepta contacto |
| GET | `/api/v1/chat/threads/:id/reveal-location` | Sí | Revelar dirección exacta |

## Ejemplos curl

### Registro

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dueno@ejemplo.com",
    "password": "password123",
    "displayName": "Carlos",
    "phone": "999888777",
    "acceptTerms": true
  }'
```

### Crear producto (requiere token)

```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "title": "Andamio metálico",
    "description": "Andamio de 2m en buen estado, ideal para pintura.",
    "category": "construccion",
    "pricePerDay": 45,
    "district": "Los Olivos",
    "locationReference": "Plaza Norte",
    "exactAddress": "Av. Alfredo Mendiola 1234",
    "exactLat": -11.998,
    "exactLng": -77.061
  }'
```

### Listar productos (público)

```bash
curl "http://localhost:3000/api/v1/products?district=Los%20Olivos&sort=price_asc"
```

### Membresía Premium (mock)

```bash
curl -X POST http://localhost:3000/api/v1/checkout/membership \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{"plan": "PREMIUM_19", "paymentToken": "simulated"}'
```

## Checklist de pruebas manuales

- [ ] Registrar dueño con `acceptTerms: true`
- [ ] Verificar correo desde el link enviado
- [ ] Verificar celular
- [ ] Completar KYC con `dniHash` único
- [ ] Publicar con `1-3` imágenes reales (`jpg/png/webp`)
- [ ] Primera publicación dentro del primer mes queda activa gratis por `30 días`
- [ ] Segunda publicación del mismo usuario pide pago estándar
- [ ] Activar `Super Promo` y validar badge/visibilidad destacada
- [ ] `GET /products` no incluye teléfono, email del dueño ni dirección exacta
- [ ] Coordenadas públicas difieren de las exactas (~500 m)
- [ ] `POST /checkout/membership` activa `PREMIUM` por 30 días
- [ ] Abrir chat: inquilino debe enviar cuestionario si `requiresQuestionnaire` está activo
- [ ] Dueño hace `accept-contact` → inquilino puede `reveal-location`

## Medidas de privacidad implementadas

1. **Fuzzing geográfico**: coordenadas públicas desplazadas aleatoriamente dentro de 500 m.
2. **Cifrado AES-256-GCM**: dirección exacta y coordenadas precisas en reposo.
3. **DTO público**: mapper que excluye teléfono, apellidos, email y campos `exact*`.
4. **Revelación auditada**: log en `privacy_audit_logs` al mostrar ubicación exacta.
5. **Chat con cuestionario**: anti-spam configurable por propietario.

## Scripts

```bash
npm run dev          # Desarrollo con hot reload
npm run build        # Compilar TypeScript
npm run start        # Producción
npm run migration:run
```

## Despliegue rápido

### URLs en Render (producción actual)

| Servicio | URL | Rol |
|----------|-----|-----|
| Web (SPA) | `https://alquila-1.onrender.com` | Frontend React |
| API | `https://alquila.onrender.com` | Backend Express + Postgres |

La web debe llamar a la API en `alquila.onrender.com`, no al dominio del SPA. El archivo [`web/.env.production`](web/.env.production) fija `VITE_API_URL=https://alquila.onrender.com` en cada `npm run build`.

### Web en Vercel o Render (estático)

- Copia [`web/.env.example`](web/.env.example) a `.env.local` solo si necesitas override local.
- En producción, `VITE_API_URL` ya viene en `.env.production`; en el panel de Render/Vercel puedes repetir la misma variable por si el build no lee el archivo del repo.
- Ejecuta el build desde `web/` con `npm run build`.
- Publica el directorio `web/dist` como proyecto independiente.
- El archivo `web/vercel.json` ya deja configurado el rewrite SPA hacia `index.html`.
- Tras cambiar la URL de la API, **vuelve a desplegar** el frontend (Vite inyecta `VITE_*` solo en build time).

### Backend en Railway o Render

- Usa `DB_DRIVER=postgres` y configura `DATABASE_URL`.
- Define secretos reales para `JWT_SECRET`, `ENCRYPTION_KEY`, `KYC_WEBHOOK_SECRET` y `CORS_ORIGIN`.
- En Render, `CORS_ORIGIN` debe incluir el origen del frontend (p. ej. `https://alquila-1.onrender.com`).
- Deja `SEED_DEMO_DATA=false` en producción.
- Ejecuta `npm run build && npm run start`.
- Si despliegas en Render, el archivo `render.yaml` ya deja preparada la app Node + Postgres gestionado.

## Smoke checklist de producción

- Registro y login de cuenta real.
- Verificación de correo por proveedor SMTP real.
- Verificación de celular.
- Inicio de flujo KYC desde proveedor configurado.
- Upload móvil de `3` imágenes.
- Publicación gratis elegible en primer mes.
- Publicación estándar pagada fuera del beneficio.
- Activación y expiración de `Super Promo`.
- Apertura de chat y actualización del trato.
- Confirmación de pago desde webhook o integración real.
- Reporte y bloqueo de usuarios.
