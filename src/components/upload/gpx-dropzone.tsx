import React, { useCallback, useState } from 'react';
import { Button } from '../ui/button';
import { Upload, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { useGPXParser } from '@/hooks/useGPXParser';
import { useRoutes } from '@/hooks/useRoutes';
import { useNavigate } from 'react-router-dom';

interface GPXDropzoneProps {
  onFileUpload: (file: File) => void;
}

export const GPXDropzone: React.FC<GPXDropzoneProps> = ({ onFileUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error' | 'duplicate'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [duplicateRoute, setDuplicateRoute] = useState<any>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  const { parseGPX, saveRouteToDatabase, isLoading, error } = useGPXParser();
  const { routes, refreshRoutes } = useRoutes();
  const navigate = useNavigate();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const gpxFile = files.find(file => file.name.toLowerCase().endsWith('.gpx'));
    
    if (gpxFile) {
      handleFileUpload(gpxFile);
    } else {
      setUploadStatus('error');
      setUploadMessage('Por favor selecciona un archivo GPX válido');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.toLowerCase().endsWith('.gpx')) {
        handleFileUpload(file);
      } else {
        setUploadStatus('error');
        setUploadMessage('Por favor selecciona un archivo GPX válido');
      }
    }
  }, []);

  const checkForDuplicates = async (file: File) => {
    // Check by filename first
    const existingRoute = routes.find(route => 
      route.name === file.name.replace('.gpx', '') ||
      route.name.toLowerCase() === file.name.toLowerCase().replace('.gpx', '')
    );
    
    if (existingRoute) {
      setDuplicateRoute(existingRoute);
      setUploadStatus('duplicate');
      setUploadMessage(`Ya existe una ruta con el nombre "${existingRoute.name}". ¿Deseas continuar?`);
      setPendingFile(file);
      return true;
    }
    
    return false;
  };

  const handleFileUpload = async (file: File) => {
    // Check for duplicates first
    const isDuplicate = await checkForDuplicates(file);
    if (isDuplicate) {
      return;
    }

    await processFile(file);
  };

  const processFile = async (file: File) => {
    try {
      setUploadStatus('uploading');
      setUploadMessage('Procesando archivo GPX...');
      
      console.log('Starting GPX upload and processing:', file.name);
      
      // Parsear el archivo GPX
      const gpxData = await parseGPX(file);
      if (!gpxData) {
        throw new Error(error || 'Error al procesar el archivo GPX');
      }

      setUploadMessage('Guardando ruta en la base de datos...');
      
      // Guardar en la base de datos
      const savedRoute = await saveRouteToDatabase(gpxData, file);
      
      setUploadStatus('success');
      setUploadMessage(`¡Ruta "${gpxData.name}" subida exitosamente!`);
      
      onFileUpload(file);
      
      // Actualizar la lista de rutas
      await refreshRoutes();
      
      // Redirigir al detalle de la ruta después de 2 segundos
      setTimeout(() => {
        navigate(`/dashboard/routes/${savedRoute.id}`);
      }, 2000);
      
    } catch (err) {
      console.error('Upload error:', err);
      setUploadStatus('error');
      setUploadMessage(err instanceof Error ? err.message : 'Error al subir el archivo');
    }
  };

  const handleContinueUpload = async () => {
    if (pendingFile) {
      await processFile(pendingFile);
      setPendingFile(null);
      setDuplicateRoute(null);
    }
  };

  const handleViewExisting = () => {
    if (duplicateRoute) {
      navigate(`/dashboard/routes/${duplicateRoute.id}`);
    }
  };

  const resetUpload = () => {
    setUploadStatus('idle');
    setUploadMessage('');
    setPendingFile(null);
    setDuplicateRoute(null);
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <Upload className="h-5 w-5 text-primary-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'duplicate':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Upload className={`h-5 w-5 ${isDragOver ? 'text-primary-600' : 'text-primary-500'}`} />;
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'border-primary-500 bg-primary-50 dark:bg-primary-900/20';
      case 'success':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'error':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'duplicate':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return isDragOver
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-primary-300 dark:border-primary-700 bg-white dark:bg-mountain-800';
    }
  };

  const getStatusTitle = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Procesando...';
      case 'success':
        return '¡Éxito!';
      case 'error':
        return 'Error';
      case 'duplicate':
        return 'Posible Duplicado';
      default:
        return 'Subir archivo GPX';
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${getStatusColor()}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          uploadStatus === 'uploading' ? 'bg-primary-100 dark:bg-primary-900' : 
          uploadStatus === 'success' ? 'bg-green-100 dark:bg-green-900' :
          uploadStatus === 'error' ? 'bg-red-100 dark:bg-red-900' :
          uploadStatus === 'duplicate' ? 'bg-yellow-100 dark:bg-yellow-900' :
          isDragOver ? 'bg-primary-100 dark:bg-primary-900' : 'bg-primary-50 dark:bg-mountain-700'
        }`}>
          {getStatusIcon()}
        </div>
        
        <div className="flex-1 text-left">
          <h4 className="font-medium text-mountain-800 dark:text-mountain-200 mb-1">
            {getStatusTitle()}
          </h4>
          <p className="text-sm text-mountain-600 dark:text-mountain-400">
            {uploadMessage || (uploadStatus === 'idle' ? 'Arrastra un archivo GPX aquí o haz clic para explorar' : '')}
          </p>
        </div>

        {uploadStatus === 'idle' && (
          <div>
            <input
              type="file"
              accept=".gpx"
              onChange={handleFileSelect}
              className="hidden"
              id="gpx-upload"
            />
            <label htmlFor="gpx-upload">
              <Button
                asChild
                size="sm"
                className="bg-primary-600 hover:bg-primary-700 text-white cursor-pointer"
              >
                <span>Seleccionar</span>
              </Button>
            </label>
          </div>
        )}

        {uploadStatus === 'duplicate' && (
          <div className="flex gap-2">
            <Button
              onClick={handleViewExisting}
              variant="outline"
              size="sm"
              className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
            >
              Ver Existente
            </Button>
            <Button
              onClick={handleContinueUpload}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Subir Igualmente
            </Button>
          </div>
        )}

        {uploadStatus === 'error' && (
          <Button
            onClick={resetUpload}
            variant="outline"
            size="sm"
          >
            Reintentar
          </Button>
        )}
      </div>

      {uploadStatus === 'uploading' && (
        <div className="w-full bg-primary-200 dark:bg-mountain-700 rounded-full h-1 mt-3">
          <div className="bg-primary-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      )}
    </div>
  );
};
