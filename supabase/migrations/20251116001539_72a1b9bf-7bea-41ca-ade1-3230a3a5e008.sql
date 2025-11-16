-- Update get_shared_route_with_version to include show_grade_labels
CREATE OR REPLACE FUNCTION public.get_shared_route_with_version(p_share_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  payload jsonb;
BEGIN
  SELECT 
    to_jsonb(sr.*) || 
    jsonb_build_object('routes', to_jsonb(r.*)) ||
    CASE 
      WHEN sr.version_id IS NOT NULL THEN
        jsonb_build_object('version', to_jsonb(v.*))
      ELSE
        jsonb_build_object('version', null)
    END
  INTO payload
  FROM public.shared_routes sr
  JOIN public.routes r ON r.id = sr.route_id
  LEFT JOIN public.route_analysis_versions v ON v.id = sr.version_id
  WHERE sr.share_slug = p_share_slug
    AND sr.is_active = true
  LIMIT 1;

  RETURN payload;
END;
$function$;