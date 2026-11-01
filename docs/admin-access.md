# Administrator Access

Administrator access is granted by the `admin_users` table using the Supabase Auth user ID. An email address or application environment variable cannot grant administrative access.

## Grant Access

1. Create the user in Supabase Auth, or let the user register and verify their email address.
2. In the Supabase SQL Editor, run the query below. Replace `<ADMIN_EMAIL>` with the verified account email.

```sql
INSERT INTO public.admin_users (user_id, role)
SELECT id
FROM auth.users
WHERE email = '<ADMIN_EMAIL>'
ON CONFLICT (user_id) DO NOTHING;
```

3. The user can now sign in at `/admin/login`.

## Revoke Access

```sql
DELETE FROM public.admin_users
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = '<ADMIN_EMAIL>'
);
```

Keep email confirmation enabled in Supabase Auth. Administrative access is still independent of email ownership, but verified accounts reduce account-recovery risk.

## Roles

- `admin`: all panel actions and access management.
- `operations`: products, orders, returns, messages, and reports.
- `support`: customers, returns, and messages.
- `warehouse`: orders and returns.
- `finance`: orders, refunds, and reports.

Use `UPDATE public.admin_users SET role = '<ROLE>' WHERE user_id = (SELECT id FROM auth.users WHERE email = '<ADMIN_EMAIL>');` to change a role.