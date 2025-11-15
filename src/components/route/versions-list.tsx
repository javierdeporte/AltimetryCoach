import React, { useEffect, useState } from 'react';
import { AnalysisVersion, useAnalysisVersions } from '@/hooks/useAnalysisVersions';
import { VersionCard } from './version-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText } from 'lucide-react';

interface VersionsListProps {
  routeId: string;
  onLoadVersion: (version: AnalysisVersion) => void;
  onShareVersion: (version: AnalysisVersion) => void;
  refreshTrigger?: number;
}

export const VersionsList: React.FC<VersionsListProps> = ({
  routeId,
  onLoadVersion,
  onShareVersion,
  refreshTrigger = 0,
}) => {
  const [versions, setVersions] = useState<AnalysisVersion[]>([]);
  const { getVersions, deleteVersion, toggleFavorite } = useAnalysisVersions();

  const loadVersions = async () => {
    const data = await getVersions(routeId);
    setVersions(data);
  };

  useEffect(() => {
    loadVersions();
  }, [routeId, refreshTrigger]);

  const handleDelete = async (versionId: string) => {
    const success = await deleteVersion(versionId);
    if (success) {
      setVersions(versions.filter(v => v.id !== versionId));
    }
  };

  const handleToggleFavorite = async (versionId: string, isFavorite: boolean) => {
    const success = await toggleFavorite(versionId, isFavorite);
    if (success) {
      setVersions(versions.map(v => 
        v.id === versionId ? { ...v, is_favorite: isFavorite } : v
      ));
    }
  };

  if (versions.length === 0) {
    return (
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          No hay versiones guardadas. Ajusta los parámetros de análisis y haz clic en "Guardar Versión" para crear tu primera snapshot.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-3">
        {versions.map((version) => (
          <VersionCard
            key={version.id}
            version={version}
            onLoad={() => onLoadVersion(version)}
            onShare={() => onShareVersion(version)}
            onDelete={() => handleDelete(version.id)}
            onToggleFavorite={(isFavorite) => handleToggleFavorite(version.id, isFavorite)}
          />
        ))}
      </div>
    </ScrollArea>
  );
};
