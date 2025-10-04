import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Upload, X, FileImage, Loader2, Clipboard } from 'lucide-react';
import { UploadedImage } from '@shared/schema';

type FileUploadProps = {
  onFileUpload: (file: File) => void;
  isUploading?: boolean;
  uploadedFile?: UploadedImage | null;
  onRemoveFile?: () => void;
  className?: string;
};

export function FileUpload({
  onFileUpload,
  isUploading = false,
  uploadedFile,
  onRemoveFile,
  className
}: FileUploadProps) {
  const [showPasteHint, setShowPasteHint] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  }, [onFileUpload]);

  // Handle paste from clipboard (disabled automatic paste)
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    // Disabled automatic paste behavior to prevent file explorer from opening
    // Users can use the Paste button instead
    return;
  }, [onFileUpload, isUploading, uploadedFile]);

  // Handle paste manually through button click
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            const file = new File([blob], `pasted-image-${Date.now()}.png`, {
              type: blob.type || 'image/png'
            });
            onFileUpload(file);
            return;
          }
        }
      }
      setShowPasteHint(true);
      setTimeout(() => setShowPasteHint(false), 3000);
    } catch (error) {
      console.log('Failed to read clipboard:', error);
      setShowPasteHint(true);
      setTimeout(() => setShowPasteHint(false), 3000);
    }
  }, [onFileUpload]);

  // Disabled automatic paste event listener to prevent file explorer opening
  // Users can still paste using the manual Paste button
  useEffect(() => {
    // Event listener removed to prevent automatic paste behavior
    return () => {};
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (uploadedFile) {
    return (
      <div className="mt-4">
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <FileImage className="h-8 w-8 text-gray-400" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">{uploadedFile.originalName}</p>
            <p className="text-sm text-gray-500">{formatFileSize(uploadedFile.size)}</p>
          </div>
          {onRemoveFile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemoveFile}
              className="text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors",
      isDragActive && "border-primary bg-primary/5",
      isUploading && "pointer-events-none opacity-50",
      className
    )}>
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-black rounded-full w-16 h-16 flex items-center justify-center mx-auto border dark:border-slate-600">
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-gray-400 dark:text-slate-400 animate-spin" />
          ) : (
            <Upload className="h-8 w-8 text-gray-400 dark:text-slate-400" />
          )}
        </div>
        
        {/* Dropzone area - only this section triggers file dialog */}
        <div
          {...getRootProps()}
          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg p-4 transition-colors"
        >
          <input {...getInputProps()} />
          <p className="text-gray-600 dark:text-slate-300 font-medium">
            {isDragActive ? 'Drop your photo here' : 'Drag and drop your photo here'}
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400">or click here to browse files</p>
        </div>

        {/* Buttons area - separate from dropzone */}
        <div className="flex space-x-3 justify-center">
          <Button
            type="button"
            onClick={() => {
              // Manually trigger file input
              const input = document.querySelector('input[type="file"]') as HTMLInputElement;
              input?.click();
            }}
            disabled={isUploading}
            className="bg-primary text-white hover:bg-blue-600"
          >
            {isUploading ? 'Uploading...' : 'Choose File'}
          </Button>
          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // Prevent any parent click handlers
              handlePasteFromClipboard();
            }}
            disabled={isUploading}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
          >
            <Clipboard className="h-4 w-4 mr-2" />
            Paste
          </Button>
        </div>
        {showPasteHint && (
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 rounded p-2">
            📋 No image found in clipboard. Copy an image first, then click Paste.
          </div>
        )}
        <p className="text-xs text-gray-400 dark:text-slate-500">
          Supports JPG, PNG, JPEG up to 10MB • Use Paste button for clipboard images
        </p>
      </div>
    </div>
  );
}
