import { useState, useCallback, useEffect } from 'react';
import { FileMetadata } from '@/types/file';
import { searchFiles } from '@/api/files';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

interface FileSearchProps {
  onFileSelect?: (file: FileMetadata) => void;
  className?: string;
}

export function FileSearch({ onFileSelect, className }: FileSearchProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const debouncedQuery = useDebounce(query, 300);

  const fetchFiles = useCallback(async (searchQuery: string, pageNum: number) => {
    if (!searchQuery) {
      setFiles([]);
      setHasMore(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await searchFiles(searchQuery, pageNum);
      setFiles(prev => pageNum === 1 ? result.files : [...prev, ...result.files]);
      setHasMore(result.files.length === result.limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search files');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchFiles(debouncedQuery, 1);
  }, [debouncedQuery, fetchFiles]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFiles(debouncedQuery, nextPage);
    }
  }, [isLoading, hasMore, page, debouncedQuery, fetchFiles]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={cn('w-full max-w-xl mx-auto space-y-4', className)}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files..."
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Search files"
        />
        {isLoading && query && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {files.map((file) => (
          <button
            key={file.id}
            onClick={() => onFileSelect?.(file)}
            className="w-full p-4 bg-white border rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <div className="ml-4">
                <span className="text-xs text-gray-400">
                  {new Date(file.createdAt!).toLocaleDateString()}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoading}
          className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
        >
          {isLoading ? 'Loading...' : 'Load more'}
        </button>
      )}

      {!isLoading && files.length === 0 && query && (
        <div className="text-center text-gray-500 py-8">
          No files found
        </div>
      )}
    </div>
  );
} 