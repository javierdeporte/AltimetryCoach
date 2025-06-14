
import React, { useCallback, useState } from 'react';
import { Button } from '../ui/button';
import { Upload } from 'lucide-react';

interface GPXDropzoneProps {
  onFileUpload: (file: File) => void;
}

export const GPXDropzone: React.FC<GPXDropzoneProps> = ({ onFileUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    
    // TODO: Implement actual file processing
    console.log('Uploading GPX file:', file.name);
    
    // Simulate upload
    setTimeout(() => {
      onFileUpload(file);
      setIsUploading(false);
    }, 2000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
          isDragOver
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-primary-300 dark:border-primary-700 bg-white dark:bg-mountain-800'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-6">
          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${
            isDragOver ? 'bg-primary-100 dark:bg-primary-900' : 'bg-primary-50 dark:bg-mountain-700'
          }`}>
            <Upload className={`h-8 w-8 ${isDragOver ? 'text-primary-600' : 'text-primary-500'}`} />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-mountain-800 dark:text-mountain-200 mb-2">
              {isUploading ? 'Processing your route...' : 'Upload your GPX file'}
            </h3>
            <p className="text-mountain-600 dark:text-mountain-400 mb-4">
              {isUploading 
                ? 'Analyzing elevation data and generating insights...'
                : 'Drag and drop your GPX file here, or click to browse'
              }
            </p>
          </div>

          {!isUploading && (
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
                  <span>Choose GPX File</span>
                </Button>
              </label>
              
              <p className="text-sm text-mountain-500 dark:text-mountain-400">
                Supports .gpx files up to 10MB
              </p>
            </div>
          )}

          {isUploading && (
            <div className="w-full bg-primary-200 dark:bg-mountain-700 rounded-full h-2">
              <div className="bg-primary-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="mt-8 bg-white dark:bg-mountain-800 rounded-xl p-6 border border-primary-200 dark:border-mountain-700">
        <h4 className="text-lg font-semibold text-mountain-800 dark:text-mountain-200 mb-4">
          Recent Routes (3/3 Free Plan)
        </h4>
        <div className="space-y-3">
          {['Mountain Trail Loop.gpx', 'Forest Path Adventure.gpx', 'Sunrise Peak Challenge.gpx'].map((name, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-primary-50 dark:bg-mountain-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                <span className="text-sm text-mountain-700 dark:text-mountain-300">{name}</span>
              </div>
              <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700">
                View
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
