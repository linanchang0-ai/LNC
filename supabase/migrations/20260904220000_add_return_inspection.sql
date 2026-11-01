ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS inspection_notes TEXT,
  ADD COLUMN IF NOT EXISTS restock_approved BOOLEAN;