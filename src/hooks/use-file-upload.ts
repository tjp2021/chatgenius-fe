import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { FileMetadata, FileUploadState, ALLOWED_FILE_TYPES } from '@/types/file';
import { uploadFile } from '@/api/files';

interface UseFileUploadOptions {
  onSuccess?: (metadata: FileMetadata) => void;
  onError?: (error: Error) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { getToken } = useAuth();
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
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const metadata = await uploadFile(state.file, token, (progress) => {
        setState(prev => ({ ...prev, progress }));
      });

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
  }, [state.file, state.status, options, getToken]);

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