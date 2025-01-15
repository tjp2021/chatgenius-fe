import { useState, useCallback } from 'react';
import { FileMetadata, FileUploadState, ALLOWED_FILE_TYPES } from '@/types/file';
import { api } from '@/lib/axios';

interface UseFileUploadOptions {
  onSuccess?: (metadata: FileMetadata) => void;
  onError?: (error: Error) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [state, setState] = useState<FileUploadState>({
    file: null,
    progress: 0,
    status: 'idle',
  });

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type as any)) {
      return 'Only PDF files are supported';
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setState({
        file: null,
        progress: 0,
        status: 'error',
        error,
      });
      options.onError?.(new Error(error));
      return;
    }

    setState({
      file,
      progress: 0,
      status: 'idle',
    });
  }, [validateFile, options]);

  const startUpload = useCallback(async () => {
    if (!state.file || state.status === 'uploading') return;

    setState(prev => ({ ...prev, status: 'uploading' }));

    try {
      const formData = new FormData();
      formData.append('file', state.file);

      const response = await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 100)
          );
          setState(prev => ({ ...prev, progress }));
        },
      });

      const metadata = response.data;

      setState({
        file: null,
        progress: 100,
        status: 'success',
        metadata,
      });

      options.onSuccess?.(metadata);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
      }));
      options.onError?.(new Error(errorMessage));
    }
  }, [state.file, state.status, options]);

  const reset = useCallback(() => {
    setState({
      file: null,
      progress: 0,
      status: 'idle',
    });
  }, []);

  return {
    state,
    handleFileSelect,
    startUpload,
    reset,
  };
} 