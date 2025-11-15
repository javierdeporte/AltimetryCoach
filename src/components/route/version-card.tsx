import React from 'react';
import { AnalysisVersion } from '@/hooks/useAnalysisVersions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Star, Play, Share2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface VersionCardProps {
  version: AnalysisVersion;
  onLoad: () => void;
  onShare: () => void;
  onDelete: () => void;
  onToggleFavorite: (isFavorite: boolean) => void;
}

const getAnalysisLabel = (type: string) => {
  switch (type) {
    case 'experimental': return 'Experimental V2';
    case 'advanced': return 'Avanzado V1';
    case 'gradient': return 'Por Gradiente';
    default: return 'Básico';
  }
};

const getAnalysisColor = (type: string) => {
  switch (type) {
    case 'experimental': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'advanced': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'gradient': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  }
};

export const VersionCard: React.FC<VersionCardProps> = ({
  version,
  onLoad,
  onShare,
  onDelete,
  onToggleFavorite,
}) => {
  return (
    <Card className="p-4 hover:border-primary transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-sm truncate">{version.version_name}</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onToggleFavorite(!version.is_favorite)}
            >
              <Star
                className={`h-4 w-4 ${
                  version.is_favorite 
                    ? 'fill-yellow-400 text-yellow-400' 
                    : 'text-muted-foreground'
                }`}
              />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="secondary" className={getAnalysisColor(version.analysis_type)}>
              {getAnalysisLabel(version.analysis_type)}
            </Badge>
            {version.show_grade_labels && (
              <Badge variant="outline" className="text-xs">
                % visible
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(version.created_at).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoad}
            title="Cargar esta versión"
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onShare}
            title="Compartir esta versión"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                title="Eliminar versión"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar versión?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminará permanentemente "{version.version_name}". Los enlaces compartidos asociados dejarán de funcionar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );
};
