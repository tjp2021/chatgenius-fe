import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUploadState } from '@/types/file';
import { useFileUpload } from '@/hooks/use-file-upload';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onUploadComplete?: (metadata: any) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
}

export function FileUpload({
  onUploadComplete,
  onUploadError,
  className,
}: FileUploadProps) {
  const { state, handleFileSelect, startUpload, reset } = useFileUpload({
    onSuccess: onUploadComplete,
    onError: onUploadError,
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        handleFileSelect(acceptedFiles[0]);
      }
    },
    [handleFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div className={cn('w-full max-w-xl mx-auto', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400',
          state.status === 'error' && 'border-red-500 bg-red-50'
        )}
      >
        <input {...getInputProps()} />
        {state.status === 'uploading' ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Uploading {state.file?.name}...
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all"
                style={{ width: `${state.progress}%` }}
              ></div>
            </div>
          </div>
        ) : state.status === 'error' ? (
          <div className="text-red-600">
            <p className="font-medium">Error: {state.error}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              className="mt-2 text-sm underline"
            >
              Try again
            </button>
          </div>
        ) : state.file ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Selected: {state.file.name}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startUpload();
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Upload
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              or click to select a file
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Supported formats: PNG, JPEG, PDF (max 5MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 