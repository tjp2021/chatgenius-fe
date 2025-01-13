import { FileMetadata, FileSearchResult } from '@/types/file';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function uploadFile(
  file: File,
  token: string,
  onProgress?: (progress: number) => void
): Promise<FileMetadata> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/files/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
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
  token: string,
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
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to search files');
  }

  return response.json();
}

export async function deleteFile(fileId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete file');
  }
}

export async function renameFile(fileId: string, newName: string, token: string): Promise<FileMetadata> {
  const response = await fetch(`${API_BASE_URL}/files/${fileId}/rename`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify({ name: newName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to rename file');
  }

  return response.json();
} 