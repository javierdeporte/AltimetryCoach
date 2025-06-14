
import React, { useCallback, useState } from 'react';
import { Button } from '../ui/button';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { useGPXParser } from '@/hooks/useGPXParser';
import { useNavigate } from 'react-router-dom';

interface GPXDropzoneProps {
  onFileUpload: (file: File) => void;
}

export const GPXDropzone: React.FC<GPXDropzoneProps> = ({ onFileUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const { parseGPX, saveRouteToDatabase, isLoading, error } = useGPXParser();
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

  const handleFileUpload = async (file: File) => {
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

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <Upload className="h-8 w-8 text-primary-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Upload className={`h-8 w-8 ${isDragOver ? 'text-primary-600' : 'text-primary-500'}`} />;
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
      default:
        return isDragOver
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-primary-300 dark:border-primary-700 bg-white dark:bg-mountain-800';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${getStatusColor()}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-6">
          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${
            uploadStatus === 'uploading' ? 'bg-primary-100 dark:bg-primary-900' : 
            uploadStatus === 'success' ? 'bg-green-100 dark:bg-green-900' :
            uploadStatus === 'error' ? 'bg-red-100 dark:bg-red-900' :
            isDragOver ? 'bg-primary-100 dark:bg-primary-900' : 'bg-primary-50 dark:bg-mountain-700'
          }`}>
            {getStatusIcon()}
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-mountain-800 dark:text-mountain-200 mb-2">
              {uploadStatus === 'uploading' ? 'Procesando tu ruta...' : 
               uploadStatus === 'success' ? '¡Éxito!' :
               uploadStatus === 'error' ? 'Error' :
               'Sube tu archivo GPX'}
            </h3>
            <p className="text-mountain-600 dark:text-mountain-400 mb-4">
              {uploadMessage || (uploadStatus === 'idle' ? 'Arrastra y suelta tu archivo GPX aquí, o haz clic para explorar' : '')}
            </p>
          </div>

          {uploadStatus === 'idle' && (
            <div className="space-y-4">
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
                  className="bg-primary-600 hover:bg-primary-700 text-white cursor-pointer"
                >
                  <span>Seleccionar archivo GPX</span>
                </Button>
              </label>
              
              <p className="text-sm text-mountain-500 dark:text-mountain-400">
                Soporta archivos .gpx hasta 10MB
              </p>
            </div>
          )}

          {uploadStatus === 'uploading' && (
            <div className="w-full bg-primary-200 dark:bg-mountain-700 rounded-full h-2">
              <div className="bg-primary-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          )}

          {uploadStatus === 'error' && (
            <Button
              onClick={() => {
                setUploadStatus('idle');
                setUploadMessage('');
              }}
              variant="outline"
              className="mt-4"
            >
              Intentar de nuevo
            </Button>
          )}
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="mt-8 bg-white dark:bg-mountain-800 rounded-xl p-6 border border-primary-200 dark:border-mountain-700">
        <h4 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200 mb-4">
          Rutas Recientes (Plan Gratuito)
        </h4>
        <div className="text-center py-8">
          <p className="text-mountain-600 dark:text-mountain-400">
            Tus rutas subidas aparecerán aquí
          </p>
        </div>
      </div>
    </div>
  );
};
