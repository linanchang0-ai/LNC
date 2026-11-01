CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_users FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_users TO service_role;