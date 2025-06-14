
import React, { useState } from 'react';
import { GPXDropzone } from '../../components/upload/gpx-dropzone';
import { Button } from '../../components/ui/button';
import { List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Upload = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const navigate = useNavigate();

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    console.log('File uploaded successfully:', file.name);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-mountain-800 dark:text-mountain-200 mb-2">
          Subir Nueva Ruta
        </h1>
        <p className="text-mountain-600 dark:text-mountain-400">
          Sube archivos GPX para analizar perfiles de elevación y crear planes de carrera personalizados
        </p>
      </div>

      {/* Dropzone */}
      <GPXDropzone onFileUpload={handleFileUpload} />
      
      {/* Quick access to routes list */}
      <div className="flex justify-center pt-6">
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard/routes')}
          className="flex items-center gap-2"
        >
          <List className="w-4 h-4" />
          Ver todas mis rutas
        </Button>
      </div>
    </div>
  );
};

export default Upload;
