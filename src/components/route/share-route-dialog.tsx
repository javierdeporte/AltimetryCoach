import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Copy, Share2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareRouteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
}

export const ShareRouteDialog: React.FC<ShareRouteDialogProps> = ({
  isOpen,
  onClose,
  shareUrl
}) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: '¡Copiado!',
        description: 'El enlace se ha copiado al portapapeles',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar el enlace',
        variant: 'destructive',
      });
    }
  };

  const handleOpenInNewTab = () => {
    window.open(shareUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary-600" />
            Compartir Ruta
          </DialogTitle>
          <DialogDescription>
            Comparte esta ruta con su configuración de análisis. Cualquiera con este enlace podrá ver la ruta tal como la configuraste.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="flex items-center space-x-2">
            <Input
              readOnly
              value={shareUrl}
              className="flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleOpenInNewTab}
              className="flex-1"
              variant="outline"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir en nueva pestaña
            </Button>
            <Button
              onClick={onClose}
              className="flex-1"
            >
              Cerrar
            </Button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">💡 Nota:</p>
            <p>Este enlace es público y no requiere autenticación. La ruta se mostrará con la configuración exacta de parámetros que tenías al momento de compartir.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
