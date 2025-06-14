
import React, { useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/dashboard-layout';
import { GPXDropzone } from '../../components/upload/gpx-dropzone';

const Upload = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    console.log('File uploaded:', file.name);
    // TODO: Process GPX file and redirect to route detail page
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-mountain-800 dark:text-mountain-200 mb-2">
            Upload Route
          </h1>
          <p className="text-mountain-600 dark:text-mountain-400">
            Upload your GPX file to analyze elevation profiles and route segments
          </p>
        </div>

        <GPXDropzone onFileUpload={handleFileUpload} />

        {uploadedFile && (
          <div className="mt-8 p-6 bg-primary-50 dark:bg-mountain-800 border border-primary-200 dark:border-mountain-700 rounded-xl">
            <h3 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200 mb-2">
              Upload Successful! 🎉
            </h3>
            <p className="text-mountain-600 dark:text-mountain-400">
              {uploadedFile.name} has been processed. You can now view detailed analysis.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Upload;
