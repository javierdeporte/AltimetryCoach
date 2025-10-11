-- Create secure RPCs for public shared route fetch and view counting
CREATE OR REPLACE FUNCTION public.get_shared_route(p_share_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  payload jsonb;
BEGIN
  SELECT 
    to_jsonb(sr.*) || jsonb_build_object('routes', to_jsonb(r.*))
  INTO payload
  FROM public.shared_routes sr
  JOIN public.routes r ON r.id = sr.route_id
  WHERE sr.share_slug = p_share_slug
    AND sr.is_active = true
  LIMIT 1;

  RETURN payload;
END;
$$;

-- Increment view count safely for public shares
CREATE OR REPLACE FUNCTION public.increment_share_view(p_share_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  UPDATE public.shared_routes
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE share_slug = p_share_slug
    AND is_active = true;
END;
$$;