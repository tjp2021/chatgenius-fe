import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { FileMetadata } from '@/types/file';
import { getAllFiles } from '@/api/files';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface FileSearchProps {
  onFileSelect?: (file: FileMetadata) => void;
  renderFileActions?: (file: FileMetadata) => React.ReactNode;
  className?: string;
}

export function FileSearch({ onFileSelect, renderFileActions, className }: FileSearchProps) {
  const { getToken } = useAuth();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [total, setTotal] = useState(0);

  const debouncedQuery = useDebounce(query, 300);

  const fetchFiles = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const result = await getAllFiles(token, {
        filename: searchQuery || undefined
      });
      
      setFiles(result.files);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchFiles(debouncedQuery);
  }, [debouncedQuery, fetchFiles]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={cn('w-full space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files by name..."
            className="max-w-sm"
          />
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          )}
        </div>
        <div className="text-sm text-gray-500">
          {total} file{total !== 1 ? 's' : ''} total
        </div>
      </div>

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow
              key={file.id}
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => onFileSelect?.(file)}
            >
              <TableCell>{file.name}</TableCell>
              <TableCell>{formatFileSize(file.size)}</TableCell>
              <TableCell>{file.type}</TableCell>
              <TableCell>{formatDate(file.createdAt)}</TableCell>
              <TableCell>
                {renderFileActions?.(file)}
              </TableCell>
            </TableRow>
          ))}
          {files.length === 0 && !isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                No files found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 