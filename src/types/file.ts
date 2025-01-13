export type FileStatus = 'idle' | 'uploading' | 'success' | 'error';

export type AllowedFileType = 'image/png' | 'image/jpeg' | 'application/pdf';

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
  'image/png',
  'image/jpeg',
  'application/pdf',
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB 