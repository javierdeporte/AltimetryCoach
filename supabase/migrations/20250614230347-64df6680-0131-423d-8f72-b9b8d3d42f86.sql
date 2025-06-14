
-- Add route_type column to routes table
ALTER TABLE public.routes 
ADD COLUMN route_type TEXT DEFAULT 'training' 
CHECK (route_type IN ('training', 'race_profile', 'route_planning', 'custom'));

-- Add a column to indicate if the date source is reliable (from GPS metadata vs file date)
ALTER TABLE public.routes 
ADD COLUMN date_source TEXT DEFAULT 'file' 
CHECK (date_source IN ('gps_metadata', 'file', 'manual'));

-- Add index for better performance on filtering by route type
CREATE INDEX idx_routes_route_type ON public.routes(route_type);

-- Add index for filtering by date source
CREATE INDEX idx_routes_date_source ON public.routes(date_source);
