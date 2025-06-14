
import React, { useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/dashboard-layout';
import { GPXDropzone } from '../../components/upload/gpx-dropzone';

const Upload = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    console.log('File uploaded successfully:', file.name);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-mountain-800 dark:text-mountain-200 mb-2">
            Subir Ruta
          </h1>
          <p className="text-mountain-600 dark:text-mountain-400">
            Sube tu archivo GPX para analizar perfiles de elevación y segmentos de ruta
          </p>
        </div>

        <GPXDropzone onFileUpload={handleFileUpload} />
      </div>
    </DashboardLayout>
  );
};

export default Upload;
