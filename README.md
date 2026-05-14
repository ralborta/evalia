# EvalIA

MVP de entrevistas orales en inglés (ElevenLabs) + panel evaluador/agente + informes con IA.

## Despliegue (Vercel + Railway)

1. **Railway**: servicio **PostgreSQL**; copia `DATABASE_URL`.
2. **Vercel** (o Railway para la app): conecta el repo e importa variables desde [`.env.example`](./.env.example).
   - Obligatorias en producción: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` (todas con tu URL **https://** real, sin `/` final).
   - Vercel inyecta `VERCEL_URL`; si no defines `NEXT_PUBLIC_APP_URL`, la app intentará usarla para links públicos.
3. Aplica el esquema a la BD de producción (desde tu máquina con `DATABASE_URL` de Railway o en CI):

```bash
pnpm install
pnpm exec prisma db push
pnpm exec prisma db seed
```

## Desarrollo local

```bash
pnpm install
cp .env.example .env
# Edita .env (Postgres local o DATABASE_URL de Railway)
pnpm dev
```

Abre la URL que indique el terminal (suele ser `http://localhost:3000`).

## Más

- Plantilla original: [Next.js](https://nextjs.org).
