# Backup and Recovery Runbook

## Objectives

- Keep a recoverable database copy outside the application deployment flow.
- Validate recovery before an incident, not during one.
- Avoid restoring production until the recovery point and impact are approved.

## Ownership and Schedule

| Task | Owner | Frequency | Evidence |
| --- | --- | --- | --- |
| Confirm Supabase backup status | Store owner | Weekly | Dashboard screenshot or written log |
| Export a logical database backup | Store owner | Weekly on Free plan; monthly on paid plans | Encrypted off-site archive |
| Validate a restore in an isolated project | Store owner | Quarterly and after a major schema change | Test record and health check result |
| Review Storage object retention | Store owner | Quarterly | Storage export inventory |

## Backup Procedure

1. In Supabase, open Database > Backups and confirm that the latest scheduled backup completed. Paid plans provide daily backups; retention depends on the plan.
2. On the Free plan, create a logical export regularly with the Supabase CLI `db dump` command. Store the output in an encrypted location outside Supabase and Vercel.
3. Keep the migration files in `supabase/migrations` in Git. They are the schema history and must be restored before application traffic is enabled.
4. Export or retain product images from the `product-images` Storage bucket separately. Database backups only retain Storage metadata, not deleted object contents.
5. Never commit database dumps, environment files, PayPal credentials, or Resend/Upstash/Sentry keys to Git.

## Restore Drill

Run this in a new Supabase project. Do not use production as the target of a drill.

1. Record the backup timestamp and the migration commit being tested.
2. Create an isolated Supabase project and restore the selected database backup into it, or import the logical export.
3. Apply any migrations that occurred after the backup when validating a forward recovery.
4. Restore the required Storage objects into the isolated project's `product-images` bucket.
5. Use isolated test environment variables only. Do not point a recovered project at production PayPal webhooks or production email credentials.
6. Verify that `products`, `orders`, `order_items`, `payments`, `refunds`, `returns`, `admin_audit_logs`, and `checkout_drafts` have expected counts and relationships.
7. Sign in as an administrator, load the catalog, load an order detail, and call `/api/health` against the isolated deployment.
8. Record the recovery duration, data gap, failures, and corrective actions.

## Production Incident Recovery

1. Stop write traffic: disable checkout through Vercel or temporarily protect the storefront before any restore.
2. Identify the last known-good timestamp and estimate the data loss window. Obtain business approval before restoring.
3. Prefer restoring first to a new Supabase project for validation. A direct restore makes the production project unavailable while it runs.
4. Validate schema, critical table counts, Storage objects, and administrator access in the recovered project.
5. Update Vercel Production environment variables only after validation. Confirm PayPal webhook delivery is directed to the intended deployment.
6. Run the health check, a catalog read, an administrator order lookup, and a controlled checkout test before reopening sales.
7. Reconcile orders, captures, refunds, and inventory that occurred after the restore point using PayPal and webhook records.
8. Record the incident, timeline, recovery point, data reconciliation, and follow-up changes in the administrative audit process.

## Recovery Targets

- Daily backup recovery: recovery point can be up to one day old.
- PITR: supports a finer recovery point and has an approximate two-minute worst-case RPO, but requires an eligible paid Supabase plan and add-on.
- Storage: use a separate retention/export process; database recovery alone is insufficient for deleted image objects.