import { FileMetadata, FileSearchResult } from '@/types/file';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<FileMetadata> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/files/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload file');
  }

  return response.json();
}

export async function searchFiles(
  query: string,
  page: number = 1,
  limit: number = 10
): Promise<FileSearchResult> {
  const params = new URLSearchParams({
    query,
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(
    `${API_BASE_URL}/files/search?${params.toString()}`,
    {
      credentials: 'include',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to search files');
  }

  return response.json();
}

export async function deleteFile(fileId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete file');
  }
} 