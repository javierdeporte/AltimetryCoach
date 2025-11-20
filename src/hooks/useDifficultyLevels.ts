import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

export interface DifficultyLevel {
  id: string;
  key: string;
  label_es: string;
  label_en: string;
  display_order: number;
}

export const useDifficultyLevels = () => {
  const { i18n } = useTranslation();
  
  const { data: difficultyLevels, isLoading, error } = useQuery({
    queryKey: ['difficulty-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('difficulty_levels')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as DifficultyLevel[];
    },
  });

  // Helper to get label in current language
  const getLabel = (level: DifficultyLevel) => {
    return i18n.language === 'es' ? level.label_es : level.label_en;
  };

  // Helper to get difficulty level by key
  const getByKey = (key: string) => {
    return difficultyLevels?.find(dl => dl.key === key);
  };

  // Helper to get label by key
  const getLabelByKey = (key: string) => {
    const level = getByKey(key);
    return level ? getLabel(level) : key;
  };

  return {
    difficultyLevels: difficultyLevels || [],
    isLoading,
    error,
    getLabel,
    getByKey,
    getLabelByKey,
  };
};
