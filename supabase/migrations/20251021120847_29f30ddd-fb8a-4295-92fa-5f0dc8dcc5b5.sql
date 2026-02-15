-- Fix existing game slugs with whitespace
UPDATE games SET slug = trim(lower(slug)) WHERE slug != trim(lower(slug));