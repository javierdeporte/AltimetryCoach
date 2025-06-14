
-- Añadir nuevas columnas a la tabla routes
ALTER TABLE public.routes 
ADD COLUMN elevation_loss_m INTEGER,
ADD COLUMN gpx_capture_date TIMESTAMP WITH TIME ZONE;

-- Actualizar los comentarios de las columnas para documentar el propósito
COMMENT ON COLUMN public.routes.elevation_loss_m IS 'Total elevation loss in meters calculated from GPX data';
COMMENT ON COLUMN public.routes.gpx_capture_date IS 'Date when the GPX track was captured, extracted from GPX metadata or file creation date';

-- Crear función para migrar datos existentes con nuevos criterios de dificultad
CREATE OR REPLACE FUNCTION public.migrate_route_difficulty()
RETURNS void AS $$
BEGIN
  -- Actualizar criterios de dificultad según los nuevos rangos
  UPDATE public.routes 
  SET difficulty_level = CASE
    WHEN elevation_gain_m < 500 THEN 'easy'
    WHEN elevation_gain_m >= 500 AND elevation_gain_m <= 900 THEN 'medium'
    WHEN elevation_gain_m > 900 THEN 'hard'
    ELSE 'easy'
  END
  WHERE elevation_gain_m IS NOT NULL;
  
  -- Para rutas sin datos de elevación, establecer como 'easy'
  UPDATE public.routes 
  SET difficulty_level = 'easy'
  WHERE elevation_gain_m IS NULL AND difficulty_level IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la migración de dificultad
SELECT public.migrate_route_difficulty();

-- Eliminar la función temporal después de usarla
DROP FUNCTION public.migrate_route_difficulty();
