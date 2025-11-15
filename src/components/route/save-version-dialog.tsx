import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface SaveVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (versionName: string) => Promise<void>;
  isLoading: boolean;
}

export const SaveVersionDialog: React.FC<SaveVersionDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  isLoading,
}) => {
  const [versionName, setVersionName] = useState('');

  const handleSave = async () => {
    if (!versionName.trim()) return;
    
    await onSave(versionName.trim());
    setVersionName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && versionName.trim()) {
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Guardar Versión de Análisis</DialogTitle>
          <DialogDescription>
            Dale un nombre a esta versión para poder volver a ella más tarde
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="version-name">Nombre de la versión</Label>
            <Input
              id="version-name"
              placeholder="Ej: Análisis Race Day, Opción 1..."
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!versionName.trim() || isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
