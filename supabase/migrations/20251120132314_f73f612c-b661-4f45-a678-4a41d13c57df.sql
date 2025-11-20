-- Create route_types table
CREATE TABLE IF NOT EXISTS public.route_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label_es TEXT NOT NULL,
  label_en TEXT NOT NULL,
  color_classes TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create difficulty_levels table
CREATE TABLE IF NOT EXISTS public.difficulty_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label_es TEXT NOT NULL,
  label_en TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.route_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.difficulty_levels ENABLE ROW LEVEL SECURITY;

-- Create policies (everyone can read, no one can modify - admin UI will handle writes later)
CREATE POLICY "Anyone can view route types"
  ON public.route_types
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view difficulty levels"
  ON public.difficulty_levels
  FOR SELECT
  USING (true);

-- Insert initial route types
INSERT INTO public.route_types (key, label_es, label_en, color_classes, display_order) VALUES
  ('training', 'Entrenamiento', 'Training', 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', 1),
  ('race_profile', 'Perfil de Carrera', 'Race Profile', 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', 2),
  ('route_planning', 'Planificación de Ruta', 'Route Planning', 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', 3);

-- Insert initial difficulty levels
INSERT INTO public.difficulty_levels (key, label_es, label_en, display_order) VALUES
  ('easy', 'Fácil', 'Easy', 1),
  ('medium', 'Media', 'Medium', 2),
  ('hard', 'Difícil', 'Hard', 3);