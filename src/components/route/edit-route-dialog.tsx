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

      toast.success('Ruta actualizada correctamente');
      onRouteUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating route:', error);
      toast.error('Error al actualizar la ruta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Ruta</DialogTitle>
          <DialogDescription>
            Actualiza la información de tu ruta
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la ruta *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Subida al Aconcagua"
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe tu ruta..."
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="route_type">Tipo de ruta</Label>
              <Select
                value={formData.route_type}
                onValueChange={(value) => setFormData({ ...formData, route_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">Entrenamiento</SelectItem>
                  <SelectItem value="race_profile">Perfil de Carrera</SelectItem>
                  <SelectItem value="route_planning">Planificación de Ruta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gpx_capture_date">Fecha de captura</Label>
              <Input
                id="gpx_capture_date"
                type="date"
                value={formData.gpx_capture_date}
                onChange={(e) => setFormData({ ...formData, gpx_capture_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty_level">Dificultad</Label>
              <Select
                value={formData.difficulty_level}
                onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
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
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
