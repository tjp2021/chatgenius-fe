'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUpload } from './file-upload';
import { FileSearch } from './file-search';
import { FileMetadata } from '@/types/file';
import { uploadFile, deleteFile, renameFile } from '@/api/files';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { MoreVertical, Pencil, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FileManagerProps {
  onFileSelect?: (file: FileMetadata) => void;
  className?: string;
}

export function FileManager({ onFileSelect, className }: FileManagerProps) {
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUploadComplete = (metadata: FileMetadata) => {
    toast({
      title: 'File uploaded',
      description: `${metadata.name} has been uploaded successfully.`,
    });
  };

  const handleUploadError = (error: Error) => {
    toast({
      title: 'Upload failed',
      description: error.message,
      variant: 'destructive',
    });
  };

  const handleRename = async () => {
    if (!selectedFile || !newFileName.trim()) return;

    setIsLoading(true);
    try {
      const updatedFile = await renameFile(selectedFile.id!, newFileName.trim());
      toast({
        title: 'File renamed',
        description: `File has been renamed to ${updatedFile.name}`,
      });
      setIsRenameDialogOpen(false);
      // Trigger a refresh of the file list
    } catch (error) {
      toast({
        title: 'Rename failed',
        description: error instanceof Error ? error.message : 'Failed to rename file',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      await deleteFile(selectedFile.id!);
      toast({
        title: 'File deleted',
        description: `${selectedFile.name} has been deleted.`,
      });
      setIsDeleteDialogOpen(false);
      // Trigger a refresh of the file list
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete file',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openRenameDialog = (file: FileMetadata) => {
    setSelectedFile(file);
    setNewFileName(file.name);
    setIsRenameDialogOpen(true);
  };

  const openDeleteDialog = (file: FileMetadata) => {
    setSelectedFile(file);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className={className}>
      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="files">My Files</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>
        
        <TabsContent value="files" className="mt-4">
          <FileSearch
            onFileSelect={(file) => {
              if (onFileSelect) {
                onFileSelect(file);
              }
            }}
            renderFileActions={(file) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => openRenameDialog(file)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openDeleteDialog(file)}
                    className="text-red-600"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <FileUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />
        </TabsContent>
      </Tabs>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Enter new file name"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isLoading}>
              {isLoading ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Are you sure you want to delete "{selectedFile?.name}"? This action cannot be undone.
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 