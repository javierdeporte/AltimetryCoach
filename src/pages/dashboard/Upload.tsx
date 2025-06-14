
import React, { useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/dashboard-layout';
import { GPXDropzone } from '../../components/upload/gpx-dropzone';
import { RouteSelector } from '../../components/upload/route-selector';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

const Upload = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    console.log('File uploaded successfully:', file.name);
  };

  const handleRouteSelect = (routeId: string) => {
    setSelectedRouteId(routeId);
    console.log('Route selected:', routeId);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-mountain-800 dark:text-mountain-200 mb-2">
            Gestionar Rutas
          </h1>
          <p className="text-mountain-600 dark:text-mountain-400">
            Sube nuevos archivos GPX o selecciona rutas existentes para analizar perfiles de elevación
          </p>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Subir Nueva Ruta</TabsTrigger>
            <TabsTrigger value="existing">Rutas Existentes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4">
            <GPXDropzone onFileUpload={handleFileUpload} />
          </TabsContent>
          
          <TabsContent value="existing" className="space-y-4">
            <RouteSelector onRouteSelect={handleRouteSelect} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Upload;
