
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Route {
  id: string;
  name: string;
  description?: string;
  distance_km: number;
  elevation_gain_m: number;
  difficulty_level: string;
  created_at: string;
  gpx_data?: string;
}

export const useRoutes = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('routes')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        setRoutes(data || []);
      } catch (err) {
        console.error('Error loading routes:', err);
        setError(err instanceof Error ? err.message : 'Error loading routes');
      } finally {
        setIsLoading(false);
      }
    };

    loadRoutes();
  }, []);

  const refreshRoutes = async () => {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRoutes(data);
    }
  };

  return { routes, isLoading, error, refreshRoutes };
};
