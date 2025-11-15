import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AnalysisVersion {
  id: string;
  route_id: string;
  user_id: string;
  version_name: string;
  analysis_type: 'experimental' | 'advanced' | 'gradient' | 'none';
  analysis_params: any;
  show_grade_labels: boolean;
  segments_snapshot: any;
  is_favorite: boolean;
  created_at: string;
}

export interface SaveVersionParams {
  routeId: string;
  versionName: string;
  analysisType: 'experimental' | 'advanced' | 'gradient' | 'none';
  analysisParams: any;
  showGradeLabels: boolean;
  segmentsSnapshot?: any;
}

export const useAnalysisVersions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const saveVersion = async (params: SaveVersionParams): Promise<string | null> => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase
        .from('route_analysis_versions')
        .insert({
          route_id: params.routeId,
          user_id: user.id,
          version_name: params.versionName,
          analysis_type: params.analysisType,
          analysis_params: params.analysisParams,
          show_grade_labels: params.showGradeLabels,
          segments_snapshot: params.segmentsSnapshot,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: '¡Versión guardada!',
        description: `"${params.versionName}" guardada correctamente`,
      });

      return data.id;
    } catch (error) {
      console.error('Error saving version:', error);
      toast({
        title: 'Error al guardar',
        description: error instanceof Error ? error.message : 'No se pudo guardar la versión',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getVersions = async (routeId: string): Promise<AnalysisVersion[]> => {
    try {
      const { data, error } = await supabase
        .from('route_analysis_versions')
        .select('*')
        .eq('route_id', routeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []) as AnalysisVersion[];
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast({
        title: 'Error al cargar versiones',
        description: 'No se pudieron cargar las versiones guardadas',
        variant: 'destructive',
      });
      return [];
    }
  };

  const deleteVersion = async (versionId: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('route_analysis_versions')
        .delete()
        .eq('id', versionId);

      if (error) throw error;

      toast({
        title: 'Versión eliminada',
        description: 'La versión se eliminó correctamente',
      });

      return true;
    } catch (error) {
      console.error('Error deleting version:', error);
      toast({
        title: 'Error al eliminar',
        description: 'No se pudo eliminar la versión',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (versionId: string, isFavorite: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('route_analysis_versions')
        .update({ is_favorite: isFavorite })
        .eq('id', versionId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }
  };

  return {
    saveVersion,
    getVersions,
    deleteVersion,
    toggleFavorite,
    isLoading
  };
};
