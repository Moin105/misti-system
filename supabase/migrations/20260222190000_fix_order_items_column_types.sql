-- Fix schema drift for order_items causing integer cast errors on checkout.
-- Error addressed: invalid input syntax for type integer: "1.791" (22P02)

ALTER TABLE public.order_items
ALTER COLUMN quantity TYPE integer
USING (
  CASE
    WHEN quantity::text ~ '^-?\d+(\.\d+)?$'
      THEN GREATEST(1, ROUND((quantity::text)::numeric))::integer
    ELSE 1
  END
),
ALTER COLUMN unit_price TYPE numeric(12,2)
USING (
  CASE
    WHEN unit_price::text ~ '^-?\d+(\.\d+)?$'
      THEN (unit_price::text)::numeric(12,2)
    ELSE 0
  END
);

ALTER TABLE public.order_items
ALTER COLUMN quantity SET DEFAULT 1,
ALTER COLUMN unit_price SET DEFAULT 0;
