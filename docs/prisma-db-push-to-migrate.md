# Transición segura: `db push` → `prisma migrate`

EvalIA todavía sincroniza el schema con `prisma db push`. No hay historial en `prisma/migrations`.

## Qué no hacer

- `prisma migrate reset`
- `prisma db push --force-reset`
- `prisma db push --accept-data-loss`
- Borrar tablas para “empezar limpio”

## Camino recomendado (después de estabilizar Talent en staging)

1. Backup verificado.
2. Congelar el schema.
3. Generar el SQL baseline **sin aplicarlo**:

```sh
pnpm exec prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/evalia-baseline.sql
```

4. Revisar el SQL. No debe haber `DROP TABLE` de modelos existentes.
5. Crear `prisma/migrations/0_baseline/migration.sql` con ese contenido **solo cuando** el schema de staging ya coincida.
6. Marcar como aplicada, sin reejecutarla:

```sh
pnpm exec prisma migrate resolve --applied 0_baseline
```

7. A partir de ahí, cambios nuevos con `prisma migrate dev --create-only`, revisión del SQL, y `migrate deploy` en staging.

Hasta ese corte, el comando operativo sigue siendo `pnpm db:apply-schema` / `pnpm db:apply-talent`.
