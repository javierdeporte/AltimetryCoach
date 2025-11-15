-- Create route_analysis_versions table to store saved analysis snapshots
CREATE TABLE IF NOT EXISTS public.route_analysis_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  version_name TEXT NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('experimental', 'advanced', 'gradient', 'none')),
  analysis_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  show_grade_labels BOOLEAN NOT NULL DEFAULT false,
  segments_snapshot JSONB,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add version_id to shared_routes to link shares to specific versions
ALTER TABLE public.shared_routes 
ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES public.route_analysis_versions(id) ON DELETE SET NULL;

-- Enable RLS on route_analysis_versions
ALTER TABLE public.route_analysis_versions ENABLE ROW LEVEL SECURITY;

-- Users can view their own versions
CREATE POLICY "Users can view own versions"
ON public.route_analysis_versions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own versions
CREATE POLICY "Users can insert own versions"
ON public.route_analysis_versions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own versions
CREATE POLICY "Users can update own versions"
ON public.route_analysis_versions
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own versions
CREATE POLICY "Users can delete own versions"
ON public.route_analysis_versions
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_route_analysis_versions_route_id ON public.route_analysis_versions(route_id);
CREATE INDEX IF NOT EXISTS idx_route_analysis_versions_user_id ON public.route_analysis_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_routes_version_id ON public.shared_routes(version_id);

-- RPC function to get shared route with version support
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