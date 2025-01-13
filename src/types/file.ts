export type FileStatus = 'idle' | 'uploading' | 'success' | 'error';

export type AllowedFileType = 'application/pdf';

export interface FileMetadata {
  id?: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  createdAt?: Date;
  uploadedBy?: string;
}

export interface FileUploadState {
  file: File | null;
  progress: number;
  status: FileStatus;
  error?: string;
  metadata?: FileMetadata;
}

export interface FileSearchResult {
  files: FileMetadata[];
  total: number;
  page: number;
  limit: number;
}

export const ALLOWED_FILE_TYPES: AllowedFileType[] = [
  'application/pdf',
]; 