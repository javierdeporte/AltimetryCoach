import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

export interface RouteType {
  id: string;
  key: string;
  label_es: string;
  label_en: string;
  color_classes: string;
  display_order: number;
}

export const useRouteTypes = () => {
  const { i18n } = useTranslation();
  
  const { data: routeTypes, isLoading, error } = useQuery({
    queryKey: ['route-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_types')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as RouteType[];
    },
  });

  // Helper to get label in current language
  const getLabel = (routeType: RouteType) => {
    return i18n.language === 'es' ? routeType.label_es : routeType.label_en;
  };

  // Helper to get route type by key
  const getByKey = (key: string) => {
    return routeTypes?.find(rt => rt.key === key);
  };

  // Helper to get label by key
  const getLabelByKey = (key: string) => {
    const routeType = getByKey(key);
    return routeType ? getLabel(routeType) : key;
  };

  // Helper to get color classes by key
  const getColorByKey = (key: string) => {
    const routeType = getByKey(key);
    return routeType?.color_classes || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  return {
    routeTypes: routeTypes || [],
    isLoading,
    error,
    getLabel,
    getByKey,
    getLabelByKey,
    getColorByKey,
  };
};
