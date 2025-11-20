import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRouteTypes } from '@/hooks/useRouteTypes';
import { useDifficultyLevels } from '@/hooks/useDifficultyLevels';

interface EditRouteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  route: {
    id: string;
    name: string;
    description?: string | null;
    route_type?: string | null;
    gpx_capture_date?: string | null;
    difficulty_level?: string | null;
  };
  onRouteUpdated: () => void;
}

export const EditRouteDialog: React.FC<EditRouteDialogProps> = ({
  isOpen,
  onClose,
  route,
  onRouteUpdated,
}) => {
  const { t } = useTranslation();
  const { routeTypes, isLoading: isLoadingTypes, getLabel: getRouteTypeLabel } = useRouteTypes();
  const { difficultyLevels, isLoading: isLoadingLevels, getLabel: getDifficultyLabel } = useDifficultyLevels();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: route.name,
    description: route.description || '',
    route_type: route.route_type || 'training',
    gpx_capture_date: route.gpx_capture_date ? route.gpx_capture_date.split('T')[0] : '',
    difficulty_level: route.difficulty_level || 'medium',
  });

  useEffect(() => {
    setFormData({
      name: route.name,
      description: route.description || '',
      route_type: route.route_type || 'training',
      gpx_capture_date: route.gpx_capture_date ? route.gpx_capture_date.split('T')[0] : '',
      difficulty_level: route.difficulty_level || 'medium',
    });
  }, [route]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('routes')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          route_type: formData.route_type,
          gpx_capture_date: formData.gpx_capture_date ? new Date(formData.gpx_capture_date).toISOString() : null,
          difficulty_level: formData.difficulty_level,
          updated_at: new Date().toISOString(),
        })
        .eq('id', route.id);

      if (error) throw error;

      toast.success(t('edit_route_dialog.success_title'), {
        description: t('edit_route_dialog.success_description'),
      });
      onRouteUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating route:', error);
      toast.error(t('edit_route_dialog.error_title'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('edit_route_dialog.title')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('edit_route_dialog.name_label')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('edit_route_dialog.name_placeholder')}
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('edit_route_dialog.description_label')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('edit_route_dialog.description_placeholder')}
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="route_type">{t('edit_route_dialog.route_type_label')}</Label>
              <Select
                value={formData.route_type}
                onValueChange={(value) => setFormData({ ...formData, route_type: value })}
                disabled={isLoadingTypes}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {routeTypes.map((type) => (
                    <SelectItem key={type.id} value={type.key}>
                      {getRouteTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gpx_capture_date">{t('edit_route_dialog.date_label')}</Label>
              <Input
                id="gpx_capture_date"
                type="date"
                value={formData.gpx_capture_date}
                onChange={(e) => setFormData({ ...formData, gpx_capture_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty_level">{t('edit_route_dialog.difficulty_label')}</Label>
              <Select
                value={formData.difficulty_level}
                onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
                disabled={isLoadingLevels}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficultyLevels.map((level) => (
                    <SelectItem key={level.id} value={level.key}>
                      {getDifficultyLabel(level)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {t('edit_route_dialog.cancel_button')}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isLoadingTypes || isLoadingLevels}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? t('edit_route_dialog.saving_button') : t('edit_route_dialog.save_button')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
