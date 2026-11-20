ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order integer;

WITH ordered AS (
  SELECT id, row_number() OVER (
    ORDER BY CASE WHEN slug = 'camisetas-liga-mx' THEN 0
                  WHEN slug = 'camiseta-de-baloncesto-nba' THEN 2
                  ELSE 1 END, name, id
  ) - 1 AS position
  FROM public.categories
)
UPDATE public.categories AS categories
SET sort_order = ordered.position
FROM ordered
WHERE categories.id = ordered.id AND categories.sort_order IS NULL;

CREATE OR REPLACE FUNCTION public.set_category_order(category_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total integer;
BEGIN
  LOCK TABLE public.categories IN EXCLUSIVE MODE;
  SELECT count(*) INTO total FROM public.categories;
  IF category_ids IS NULL OR cardinality(category_ids) <> total
     OR (SELECT count(DISTINCT id) FROM unnest(category_ids) AS ids(id)) <> total
     OR EXISTS (SELECT 1 FROM unnest(category_ids) AS ids(id)
                WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE categories.id = ids.id)) THEN
    RAISE EXCEPTION 'category list changed';
  END IF;
  UPDATE public.categories AS categories
  SET sort_order = ordered.position - 1
  FROM unnest(category_ids) WITH ORDINALITY AS ordered(id, position)
  WHERE categories.id = ordered.id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_category_order(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_category_order(uuid[]) TO service_role;
