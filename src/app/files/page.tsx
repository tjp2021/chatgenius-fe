'use client';

import { useState } from 'react';
import { FileUpload } from '@/components/file/file-upload';
import { FileSearch } from '@/components/file/file-search';
import { FileMetadata } from '@/types/file';

export default function FilesPage() {
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);

  const handleUploadComplete = (metadata: FileMetadata) => {
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 3000);
  };

  const handleUploadError = (error: Error) => {
    console.error('Upload error:', error);
  };

  const handleFileSelect = (file: FileMetadata) => {
    setSelectedFile(file);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">File Management</h1>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Upload File</h2>
          <FileUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />
          {uploadSuccess && (
            <div className="p-4 bg-green-50 text-green-600 rounded-lg">
              File uploaded successfully!
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Search Files</h2>
          <FileSearch onFileSelect={handleFileSelect} />
          {selectedFile && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900">Selected File</h3>
              <p className="text-sm text-blue-700 mt-1">
                {selectedFile.name} ({selectedFile.type})
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Uploaded on{' '}
                {new Date(selectedFile.createdAt!).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 