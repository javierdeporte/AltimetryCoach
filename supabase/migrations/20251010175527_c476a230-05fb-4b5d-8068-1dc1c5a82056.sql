-- Fix security warning: set search_path for function
DROP FUNCTION IF EXISTS generate_share_slug();

CREATE OR REPLACE FUNCTION generate_share_slug()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  slug text;
  slug_exists boolean;
BEGIN
  LOOP
    slug := '';
    FOR i IN 1..8 LOOP
      slug := slug || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.shared_routes WHERE share_slug = slug) INTO slug_exists;
    EXIT WHEN NOT slug_exists;
  END LOOP;
  
  RETURN slug;
END;
$$;