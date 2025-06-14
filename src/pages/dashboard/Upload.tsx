
import React, { useState } from 'react';
import { GPXDropzone } from '../../components/upload/gpx-dropzone';
import { RoutesList } from '../../components/upload/routes-list';

const Upload = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    console.log('File uploaded successfully:', file.name);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-mountain-800 dark:text-mountain-200 mb-2">
          Gestionar Rutas
        </h1>
        <p className="text-mountain-600 dark:text-mountain-400">
          Sube nuevos archivos GPX o selecciona rutas existentes para analizar perfiles de elevación
        </p>
      </div>

      {/* Dropzone compacto */}
      <GPXDropzone onFileUpload={handleFileUpload} />
      
      {/* Lista de rutas existentes */}
      <RoutesList />
    </div>
  );
};

export default Upload;
