-- Create table for shared routes with analysis configuration
CREATE TABLE IF NOT EXISTS public.shared_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_slug text UNIQUE NOT NULL,
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  analysis_type text NOT NULL CHECK (analysis_type IN ('experimental', 'advanced', 'gradient', 'none')),
  analysis_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  view_count integer DEFAULT 0,
  is_active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE public.shared_routes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active shared routes (public access)
CREATE POLICY "Anyone can view active shared routes"
ON public.shared_routes
FOR SELECT
TO public
USING (is_active = true);

-- Policy: Users can create shares for their own routes
CREATE POLICY "Users can create shares for own routes"
ON public.shared_routes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.routes
    WHERE routes.id = shared_routes.route_id
    AND routes.user_id = auth.uid()
  )
);

-- Policy: Users can update their own shares
CREATE POLICY "Users can update own shares"
ON public.shared_routes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.routes
    WHERE routes.id = shared_routes.route_id
    AND routes.user_id = auth.uid()
  )
);

-- Policy: Users can delete their own shares
CREATE POLICY "Users can delete own shares"
ON public.shared_routes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.routes
    WHERE routes.id = shared_routes.route_id
    AND routes.user_id = auth.uid()
  )
);

-- Create index for faster lookups by slug
CREATE INDEX idx_shared_routes_slug ON public.shared_routes(share_slug);
CREATE INDEX idx_shared_routes_route_id ON public.shared_routes(route_id);

-- Function to generate a unique short slug
CREATE OR REPLACE FUNCTION generate_share_slug()
RETURNS text
LANGUAGE plpgsql
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