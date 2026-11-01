# LNC SPORTS

E-commerce premium para México con enfoque en lifestyle, diseño y alto ticket.

## Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- Vercel ready
- PayPal ready
- Supabase ready
- Resend optional for transactional email

## Scripts

```bash
npm install
npm run dev
npm run build
npm run start
```

## Variables de entorno

Crea un archivo `.env.local` con las siguientes variables:

```bash
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role
PAYPAL_CLIENT_ID=tu-client-id
NEXT_PUBLIC_PAYPAL_CLIENT_ID=tu-client-id
PAYPAL_CLIENT_SECRET=tu-client-secret
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_WEBHOOK_ID=tu-webhook-id
EMAIL_FROM=hola@tu-dominio.com
```

Para enviar confirmaciones de pedido y avisos de envío, agrega también `RESEND_API_KEY` en Vercel y verifica el dominio de `EMAIL_FROM` en Resend. Sin esa clave los pagos y envíos continúan funcionando, pero no se enviarán correos.

Para activar límite de solicitudes global entre instancias de Vercel, crea una base de datos Redis en Upstash y configura `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` en Vercel. Sin estas variables, el sitio conserva un límite de seguridad local por instancia.

Para monitorear errores de producción con Sentry, crea un proyecto Next.js en Sentry y configura su DSN como `NEXT_PUBLIC_SENTRY_DSN` en Vercel. Sin este valor, el monitoreo queda desactivado sin afectar el sitio.

El procedimiento de respaldo, recuperación y simulacros está en [docs/backup-recovery.md](docs/backup-recovery.md). Los respaldos de base de datos no incluyen los archivos del bucket de Storage, por lo que las imágenes deben conservarse por separado.

El procedimiento para identificar y reparar pedidos históricos incompletos está en [docs/order-reconciliation.md](docs/order-reconciliation.md).

El acceso al panel se concede por usuario de Supabase, siguiendo [docs/admin-access.md](docs/admin-access.md).

Antes de activar pagos reales, configura en PayPal el webhook `PAYMENT.CAPTURE.COMPLETED` y los eventos `PAYMENT.REFUND.*` apuntando a `https://tu-dominio.com/api/paypal/webhook`. Ejecuta todas las migraciones de `supabase/migrations` y verifica que `GET /api/health` responda `200` antes de publicar.

Para administrar el carrusel de inicio, ejecuta también la migración `20261022120000_create_homepage_slides.sql`. Después, las cuentas con rol `admin` u `operations` pueden subir y ordenar imágenes desde `/admin/slides`.

## Estado actual

El proyecto ya incluye:

- layout principal y branding premium
- páginas públicas del storefront
- catálogo y detalle de producto
- carrito, checkout y cuentas
- estructura modular para Supabase, PayPal y env validation
- contenido en español mexicano

Este sitio está listo para continuar desarrollando la integración real con PayPal, Supabase, Resend y el panel administrativo protegible.
