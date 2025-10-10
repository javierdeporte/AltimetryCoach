import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ShareRouteParams {
  routeId: string;
  analysisType: 'experimental' | 'advanced' | 'gradient' | 'none';
  analysisParams: any;
}

export const useShareRoute = () => {
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const shareRoute = async (params: ShareRouteParams): Promise<string | null> => {
    setIsSharing(true);
    
    try {
      // Generate a unique slug
      const { data: slugData, error: slugError } = await supabase
        .rpc('generate_share_slug');

      if (slugError) throw slugError;
      
      const shareSlug = slugData as string;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Insert shared route
      const { data, error } = await supabase
        .from('shared_routes')
        .insert({
          share_slug: shareSlug,
          route_id: params.routeId,
          user_id: user.id,
          analysis_type: params.analysisType,
          analysis_params: params.analysisParams,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: '¡Ruta compartida!',
        description: 'Se ha generado el enlace público para compartir',
      });

      return shareSlug;
    } catch (error) {
      console.error('Error sharing route:', error);
      toast({
        title: 'Error al compartir',
        description: error instanceof Error ? error.message : 'No se pudo generar el enlace',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSharing(false);
    }
  };

  const getSharedRoute = async (shareSlug: string) => {
    try {
      const { data, error } = await supabase
        .from('shared_routes')
        .select(`
          *,
          routes (
            id,
            name,
            description,
            distance_km,
            elevation_gain_m,
            elevation_loss_m,
            difficulty_level,
            created_at,
            gpx_capture_date,
            gpx_data,
            route_type,
            date_source
          )
        `)
        .eq('share_slug', shareSlug)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      // Increment view count
      await supabase
        .from('shared_routes')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('share_slug', shareSlug);

      return data;
    } catch (error) {
      console.error('Error fetching shared route:', error);
      return null;
    }
  };

  return {
    shareRoute,
    getSharedRoute,
    isSharing
  };
};
