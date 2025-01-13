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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-white shadow rounded-lg px-6 py-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">File Management</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload File</h2>
          <FileUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />
          {uploadSuccess && (
            <div className="mt-4 p-4 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200">
              File uploaded successfully!
            </div>
          )}
        </div>

        {/* Search Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Search Files</h2>
          <FileSearch onFileSelect={handleFileSelect} />
          {selectedFile && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
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