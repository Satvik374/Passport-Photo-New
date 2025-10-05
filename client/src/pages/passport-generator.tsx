import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PhotoSettings, UploadedImage, LayoutResult, Preset, CropSettings, BackgroundSettings } from "@shared/schema";
import { FileUpload } from "@/components/ui/file-upload";
import { Upload, Settings, FileText, Download, RotateCcw, Search, SearchCheck, Image, ZoomIn, ZoomOut, RotateCw, Save, Trash2, BookOpen, Crop, Move, RotateCw as Rotate, Scissors, Palette, Camera, Sparkles, LogOut, History, User as UserIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { User } from "@shared/schema";
import { PageTransition } from "@/components/ui/loading-screen";

export default function PassportGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth() as { user: User | null };
  
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [photoSettings, setPhotoSettings] = useState<PhotoSettings>({
    width: 35,
    height: 45,
    quantity: 8,
    layout: 'auto',
    spacing: 5,
    topMargin: 10
  });
  const [borderWidth, setBorderWidth] = useState<number>(0);
  const [savePresetDialog, setSavePresetDialog] = useState<boolean>(false);
  const [presetName, setPresetName] = useState<string>("");
  const [presetDescription, setPresetDescription] = useState<string>("");
  const [cropSettings, setCropSettings] = useState({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    scale: 1,
    rotation: 0
  });
  const [layoutResult, setLayoutResult] = useState<LayoutResult | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [autoPreview, setAutoPreview] = useState<boolean>(true);
  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>({
    removeBackground: false,
    backgroundColor: '#ffffff',
    backgroundImage: undefined
  });
  const [backgroundRemovedUrl, setBackgroundRemovedUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');

  const cropPreviewRef = useRef<HTMLDivElement>(null);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('Uploading file:', file.name, file.size, file.type);
      const formData = new FormData();
      formData.append('image', file);
      
      // Log FormData contents
      console.log('FormData created with image file');
      
      const response = await apiRequest('POST', '/api/upload', formData);
      return response.json();
    },
    onSuccess: (data: UploadedImage) => {
      setUploadedImage(data);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully!",
      });
      // Trigger initial layout generation
      generateLayoutMutation.mutate({ imageId: data.id, settings: photoSettings, borderWidth, cropSettings });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    },
  });

  // Background removal mutation
  const backgroundRemovalMutation = useMutation({
    mutationFn: async ({ imageId, backgroundColor }: { imageId: string; backgroundColor: string }) => {
      const response = await apiRequest('POST', '/api/remove-background', {
        imageId,
        backgroundColor
      });
      return response.json();
    },
    onSuccess: (data: { backgroundRemovedUrl: string; updatedImage: UploadedImage }) => {
      setBackgroundRemovedUrl(data.backgroundRemovedUrl);
      setUploadedImage(data.updatedImage);
      
      toast({
        title: "Success",
        description: "Background removed successfully!",
      });
      // Automatically regenerate layout with the background-removed image
      generateLayoutMutation.mutate({ imageId: data.updatedImage.id, settings: photoSettings, borderWidth, cropSettings });
    },
    onError: (error) => {
      toast({
        title: "Background removal failed",
        description: error.message || "Failed to remove background",
        variant: "destructive",
      });
    },
  });

  // Generate layout mutation
  const generateLayoutMutation = useMutation({
    mutationFn: async ({ imageId, settings, borderWidth, cropSettings }: { imageId: string; settings: PhotoSettings; borderWidth?: number; cropSettings?: CropSettings }) => {
      const response = await apiRequest('POST', '/api/generate-layout', { imageId, settings, borderWidth, cropSettings });
      return response.json();
    },
    onSuccess: (data: LayoutResult) => {
      setLayoutResult(data);
      // Remove toast for automatic updates to avoid spam
    },
    onError: (error) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate layout",
        variant: "destructive",
      });
    },
  });

  // Download PDF mutation
  const downloadPdfMutation = useMutation({
    mutationFn: async ({ imageId, layoutId }: { imageId: string; layoutId?: string }) => {
      const response = await apiRequest('POST', '/api/generate-pdf', { imageId, layoutId });
      return response.blob();
    },
    onSuccess: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `passport-photos-${uploadedImage?.originalName || 'photo'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "PDF downloaded successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download PDF",
        variant: "destructive",
      });
    },
  });

  // Download Image mutations (PNG/JPG)
  const downloadImageMutation = useMutation({
    mutationFn: async ({ imageId, format, layoutId }: { imageId: string; format: 'png' | 'jpg'; layoutId?: string }) => {
      const response = await apiRequest('POST', '/api/generate-image', { imageId, format, layoutId });
      const blob = await response.blob();
      return { blob, format };
    },
    onSuccess: ({ blob, format }: { blob: Blob; format: string }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `passport-photos-${uploadedImage?.originalName || 'photo'}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: `${format.toUpperCase()} downloaded successfully!`,
      });
    },
    onError: (error) => {
      console.error('Download image error:', error);
      toast({
        title: "Download failed",
        description: error.message || "Failed to download image",
        variant: "destructive",
      });
    },
  });

  // Presets query (with authentication error handling)
  const { data: presets = [], refetch: refetchPresets } = useQuery({
    queryKey: ['/api/presets'],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 3;
    },
  }) as { data: Preset[], refetch: () => void };

  // Get user image history
  const { data: imageHistory = [] } = useQuery({
    queryKey: ['/api/images/history'],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Save preset mutation
  const savePresetMutation = useMutation({
    mutationFn: async ({ name, description, settings, borderWidth }: { name: string; description: string; settings: PhotoSettings; borderWidth: number }) => {
      const response = await apiRequest('POST', '/api/presets', { name, description, settings, borderWidth });
      return response.json();
    },
    onSuccess: () => {
      refetchPresets();
      setSavePresetDialog(false);
      setPresetName("");
      setPresetDescription("");
      toast({
        title: "Success",
        description: "Preset saved successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Save failed",
        description: error.message || "Failed to save preset",
        variant: "destructive",
      });
    },
  });

  // Delete preset mutation
  const deletePresetMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/presets/${id}`);
      return response.json();
    },
    onSuccess: () => {
      refetchPresets();
      toast({
        title: "Success",
        description: "Preset deleted successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete preset",
        variant: "destructive",
      });
    },
  });

  // Save cropped photo mutation
  const saveCroppedMutation = useMutation({
    mutationFn: async ({ imageId, cropSettings, photoSettings }: { imageId: string; cropSettings: CropSettings; photoSettings: PhotoSettings }) => {
      const response = await apiRequest('POST', '/api/save-cropped-photo', { 
        imageId, 
        cropSettings, 
        width: photoSettings.width,
        height: photoSettings.height,
        replaceOriginal: true
      });
      return response.json();
    },
    onSuccess: (data: UploadedImage) => {
      // Update the uploaded image with the new cropped version
      setUploadedImage(data);
      
      // Reset crop settings since the image is now cropped
      setCropSettings({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        scale: 1,
        rotation: 0
      });
      
      // Regenerate layout with the new cropped image
      if (autoPreview) {
        generateLayoutMutation.mutate({ imageId: data.id, settings: photoSettings, borderWidth, cropSettings: {
          x: 0, y: 0, width: 100, height: 100, scale: 1, rotation: 0
        }});
      }
      
      toast({
        title: "Success",
        description: "Photo cropped and preview updated!",
      });
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save cropped photo",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = useCallback((file: File) => {
    uploadMutation.mutate(file);
  }, [uploadMutation]);

  const handleGenerateLayout = () => {
    if (!uploadedImage) {
      toast({
        title: "No image",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }
    generateLayoutMutation.mutate({ imageId: uploadedImage.id, settings: photoSettings, borderWidth, cropSettings });
  };

  // Auto-generate layout when settings change (only if auto preview is enabled)
  useEffect(() => {
    if (!uploadedImage || !autoPreview) return;
    
    const timeoutId = setTimeout(() => {
      generateLayoutMutation.mutate({ imageId: uploadedImage.id, settings: photoSettings, borderWidth, cropSettings });
    }, 100); // Instant preview with minimal debounce

    return () => clearTimeout(timeoutId);
  }, [uploadedImage, photoSettings, borderWidth, cropSettings, autoPreview]);

  const handleDownloadPdf = () => {
    if (!uploadedImage || !layoutResult) return;
    downloadPdfMutation.mutate({ imageId: uploadedImage.id, layoutId: layoutResult.id });
  };

  const handleDownloadImage = (format: 'png' | 'jpg') => {
    if (!uploadedImage || !layoutResult) return;
    downloadImageMutation.mutate({ imageId: uploadedImage.id, format, layoutId: layoutResult.id });
  };

  const handleReset = () => {
    setUploadedImage(null);
    setLayoutResult(null);
    setBorderWidth(0);
    setCropSettings({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      scale: 1,
      rotation: 0
    });
    setPhotoSettings({
      width: 35,
      height: 45,
      quantity: 8,
      layout: 'auto',
      spacing: 5,
      topMargin: 10
    });
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast({
        title: "Invalid name",
        description: "Please enter a preset name",
        variant: "destructive",
      });
      return;
    }

    savePresetMutation.mutate({
      name: presetName.trim(),
      description: presetDescription.trim(),
      settings: photoSettings,
      borderWidth
    });
  };

  const handleLoadPreset = (preset: Preset) => {
    setPhotoSettings(preset.settings);
    setBorderWidth(preset.borderWidth);
    toast({
      title: "Preset loaded",
      description: `"${preset.name}" settings applied successfully`,
    });
  };

  const handleDeletePreset = (preset: Preset) => {
    if (confirm(`Are you sure you want to delete the preset "${preset.name}"?`)) {
      deletePresetMutation.mutate(preset.id);
    }
  };

  const handleSaveCroppedPhoto = () => {
    if (!uploadedImage) {
      toast({
        title: "No image",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }
    
    saveCroppedMutation.mutate({ 
      imageId: uploadedImage.id, 
      cropSettings, 
      photoSettings 
    });
  };

  const handleCropChange = (property: keyof typeof cropSettings, value: number) => {
    setCropSettings(prev => ({
      ...prev,
      [property]: value
    }));
    
    // Force immediate preview update for crop changes
    if (uploadedImage && autoPreview) {
      setTimeout(() => {
        generateLayoutMutation.mutate({ imageId: uploadedImage.id, settings: photoSettings, borderWidth, cropSettings: { ...cropSettings, [property]: value } });
      }, 100);
    }
  };

  // Helper function to get touch/mouse coordinates
  const getEventCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    } else if ('clientX' in e) {
      return { clientX: e.clientX, clientY: e.clientY };
    }
    return { clientX: 0, clientY: 0 };
  };

  // Manual crop drag handlers (supports both mouse and touch)
  const handleCropStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const rect = cropPreviewRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const { clientX, clientY } = getEventCoordinates(e);
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    const currentLeft = (100 - cropSettings.width) / 2 + cropSettings.x / 2;
    const currentTop = (100 - cropSettings.height) / 2 + cropSettings.y / 2;
    
    setIsDragging(true);
    setDragStart({ x: x - currentLeft, y: y - currentTop });
  };

  const handleCropMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !dragStart || !cropPreviewRef.current) return;
    
    const rect = cropPreviewRef.current.getBoundingClientRect();
    const { clientX, clientY } = getEventCoordinates(e);
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    const newLeft = Math.max(0, Math.min(100 - cropSettings.width, x - dragStart.x));
    const newTop = Math.max(0, Math.min(100 - cropSettings.height, y - dragStart.y));
    
    const newCenterX = newLeft + cropSettings.width / 2;
    const newCenterY = newTop + cropSettings.height / 2;
    
    setCropSettings(prev => ({
      ...prev,
      x: (newCenterX - 50) * 2,
      y: (newCenterY - 50) * 2
    }));
  }, [isDragging, dragStart, cropSettings.width, cropSettings.height]);

  const handleCropEnd = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
    setIsResizing(false);
    setResizeHandle('');
    
    // Trigger preview update after drag/resize ends
    if (uploadedImage && autoPreview) {
      setTimeout(() => {
        generateLayoutMutation.mutate({ imageId: uploadedImage.id, settings: photoSettings, borderWidth, cropSettings });
      }, 100);
    }
  }, [uploadedImage, autoPreview, photoSettings, borderWidth, cropSettings]);

  // Resize handlers (supports both mouse and touch)
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
  };

  const handleResizeMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizing || !cropPreviewRef.current) return;
    
    const rect = cropPreviewRef.current.getBoundingClientRect();
    const { clientX, clientY } = getEventCoordinates(e);
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    // Calculate current crop boundaries
    const currentLeft = (100 - cropSettings.width) / 2 + cropSettings.x / 2;
    const currentTop = (100 - cropSettings.height) / 2 + cropSettings.y / 2;
    const currentRight = currentLeft + cropSettings.width;
    const currentBottom = currentTop + cropSettings.height;
    
    let newLeft = currentLeft;
    let newTop = currentTop;
    let newRight = currentRight;
    let newBottom = currentBottom;
    
    // Handle resize based on which handle is being dragged
    if (resizeHandle.includes('left')) {
      newLeft = Math.max(0, Math.min(currentRight - 20, x));
    }
    if (resizeHandle.includes('right')) {
      newRight = Math.max(currentLeft + 20, Math.min(100, x));
    }
    if (resizeHandle.includes('top')) {
      newTop = Math.max(0, Math.min(currentBottom - 20, y));
    }
    if (resizeHandle.includes('bottom')) {
      newBottom = Math.max(currentTop + 20, Math.min(100, y));
    }
    
    // Calculate new width, height, x, and y from boundaries
    const newWidth = newRight - newLeft;
    const newHeight = newBottom - newTop;
    const newCenterX = newLeft + newWidth / 2;
    const newCenterY = newTop + newHeight / 2;
    
    setCropSettings(prev => ({
      ...prev,
      width: newWidth,
      height: newHeight,
      x: (newCenterX - 50) * 2,
      y: (newCenterY - 50) * 2
    }));
  }, [isResizing, resizeHandle, cropSettings]);

  // Add event listeners for manual crop (both mouse and touch)
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleCropMove);
      document.addEventListener('mouseup', handleCropEnd);
      document.addEventListener('touchmove', handleCropMove, { passive: false });
      document.addEventListener('touchend', handleCropEnd);
    }
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleCropEnd);
      document.addEventListener('touchmove', handleResizeMove, { passive: false });
      document.addEventListener('touchend', handleCropEnd);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleCropMove);
      document.removeEventListener('mouseup', handleCropEnd);
      document.removeEventListener('touchmove', handleCropMove);
      document.removeEventListener('touchend', handleCropEnd);
      document.removeEventListener('mousemove', handleResizeMove);
    };
  }, [isDragging, isResizing, handleCropMove, handleCropEnd, handleResizeMove]);

  const resetCrop = () => {
    const resetSettings = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      scale: 1,
      rotation: 0
    };
    setCropSettings(resetSettings);
    
    // Trigger immediate preview update after reset
    if (uploadedImage && autoPreview) {
      setTimeout(() => {
        generateLayoutMutation.mutate({ imageId: uploadedImage.id, settings: photoSettings, borderWidth, cropSettings: resetSettings });
      }, 100);
    }
  };

  const setPresetSize = (width: number, height: number) => {
    setPhotoSettings(prev => ({ ...prev, width, height }));
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3)); // Max 3x zoom
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5)); // Min 0.5x zoom
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  // Draw high-quality canvas preview
  useEffect(() => {
    if (!layoutResult || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use device pixel ratio for crisp rendering
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // A4 dimensions in mm converted to pixels at 150 DPI for preview
    const DPI = 150;
    const MM_TO_PIXELS = DPI / 25.4;
    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;
    
    // Calculate actual A4 size in pixels
    const a4WidthPx = A4_WIDTH_MM * MM_TO_PIXELS;
    const a4HeightPx = A4_HEIGHT_MM * MM_TO_PIXELS;
    
    // Scale to fit in container while maintaining aspect ratio
    const containerWidth = canvas.parentElement?.offsetWidth || 400;
    const containerHeight = canvas.parentElement?.offsetHeight || 566;
    
    // Calculate scale to fit properly in the available space, then apply zoom
    const baseScale = Math.min(containerWidth / a4WidthPx, containerHeight / a4HeightPx);
    const scale = baseScale * zoomLevel;
    
    // Set canvas size for crisp rendering
    const displayWidth = a4WidthPx * scale;
    const displayHeight = a4HeightPx * scale;
    
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    // Scale for device pixel ratio
    canvas.width = displayWidth * devicePixelRatio;
    canvas.height = displayHeight * devicePixelRatio;
    
    // Scale the drawing context
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Draw page border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, displayWidth, displayHeight);

    // Load and draw images
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const { settings, photosPerRow, totalRows } = layoutResult;
      
      // Calculate photo dimensions and spacing in preview scale
      const photoWidthPx = settings.width * MM_TO_PIXELS * scale;
      const photoHeightPx = settings.height * MM_TO_PIXELS * scale;
      const marginPx = 10 * MM_TO_PIXELS * scale; // 10mm margin
      
      const availableWidth = displayWidth - (2 * marginPx);
      const availableHeight = displayHeight - (2 * marginPx);
      
      // Calculate positioning based on layout type
      let startX: number, startY: number, spacingX: number, spacingY: number;
      
      // Always use user-defined spacing (consistent with server logic)
      const spacingMm = settings.spacing || 5;
      spacingX = spacingMm * MM_TO_PIXELS * scale;
      spacingY = spacingMm * MM_TO_PIXELS * scale;
      
      // Calculate total grid dimensions
      const totalGridWidth = photosPerRow * photoWidthPx + (photosPerRow - 1) * spacingX;
      const totalGridHeight = totalRows * photoHeightPx + (totalRows - 1) * spacingY;
      
      if (settings.layout === 'auto') {
        // Auto layout - center the grid
        startX = (displayWidth - totalGridWidth) / 2;
        startY = (displayHeight - totalGridHeight) / 2;
      } else {
        // Specific position layout
        if (settings.layout.includes('left')) {
          startX = marginPx;
        } else if (settings.layout.includes('right')) {
          startX = displayWidth - marginPx - totalGridWidth;
        } else { // middle
          startX = (displayWidth - totalGridWidth) / 2;
        }
        
        if (settings.layout.includes('top')) {
          startY = marginPx;
        } else if (settings.layout.includes('down')) {
          startY = displayHeight - marginPx - totalGridHeight;
        } else { // middle
          startY = (displayHeight - totalGridHeight) / 2;
        }
      }

      // Simply draw the complete layout image from server (no duplicate layout logic)
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      

    };
    // Use the preview endpoint to show exact same layout as downloads
    // Add layout result ID to ensure preview uses the latest layout data
    img.src = `/api/generate-preview/${uploadedImage?.id}?layoutId=${layoutResult.id}&t=${Date.now()}`;
  }, [layoutResult, zoomLevel]);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted relative">
      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border-b border-border/50 dark:border-slate-700/50 shadow-card dark:shadow-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-primary p-3 rounded-2xl shadow-primary">
                <Camera className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  Passport Photo Creator
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Professional photos in minutes with AI background removal
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt="Profile"
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {user.isGuest ? 'Guest User' : (user.firstName || user.email || 'User')}
                    </span>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </div>
              )}
              <div className="hidden sm:flex items-center space-x-2 text-sm text-muted-foreground bg-muted/50 dark:bg-slate-800/70 px-4 py-2 rounded-full border border-transparent dark:border-slate-600/30 dark:shadow-lg">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>AI-Powered Processing</span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[calc(100vh-200px)]">
          
          {/* Left Panel: Upload and Basic Settings */}
          <div className="space-y-6">
            
            {/* Image Upload */}
            <Card className="shadow-card dark:shadow-slate-900/50 border-0 bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm dark:backdrop-blur-md">
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center justify-center">
                  <div className="bg-gradient-primary p-3 rounded-lg mr-3 shadow-primary">
                    <Upload className="text-white h-6 w-6" />
                  </div>
                  <span>Upload Your Photo</span>
                </h2>
                
                <FileUpload
                  onFileUpload={handleFileUpload}
                  isUploading={uploadMutation.isPending}
                  uploadedFile={uploadedImage}
                  onRemoveFile={() => setUploadedImage(null)}
                />
              </CardContent>
            </Card>

            {/* Presets Section */}
            <Card className="shadow-card dark:shadow-slate-900/50 border-0 bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm dark:backdrop-blur-md">
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center justify-between">
                  <span className="flex items-center">
                    <div className="bg-gradient-primary p-3 rounded-lg mr-4 shadow-primary">
                      <BookOpen className="text-white h-6 w-6" />
                    </div>
                    Saved Presets
                  </span>
                  <Dialog open={savePresetDialog} onOpenChange={setSavePresetDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Save className="h-4 w-4 mr-1" />
                        Save Current
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save Settings as Preset</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="presetName">Preset Name *</Label>
                          <Input
                            id="presetName"
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            placeholder="e.g., US Passport, UK Visa Photo"
                            className="mt-1 border-gray-300 dark:border-slate-600"
                          />
                        </div>
                        <div>
                          <Label htmlFor="presetDescription">Description (optional)</Label>
                          <Textarea
                            id="presetDescription"
                            value={presetDescription}
                            onChange={(e) => setPresetDescription(e.target.value)}
                            placeholder="Brief description of this preset..."
                            className="mt-1 border-gray-300 dark:border-slate-600"
                            rows={3}
                          />
                        </div>
                        <div className="text-sm text-gray-600 dark:text-slate-400 p-3 bg-gray-50 dark:bg-slate-800 rounded border border-gray-300 dark:border-slate-600">
                          <strong>Current settings:</strong><br />
                          Size: {photoSettings.width}×{photoSettings.height}mm<br />
                          Quantity: {photoSettings.quantity}<br />
                          Layout: {photoSettings.layout}<br />
                          Spacing: {photoSettings.spacing}mm<br />
                          Border: {borderWidth}mm
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setSavePresetDialog(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleSavePreset}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save Preset
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </h2>

                {presets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No saved presets yet.</p>
                    <p className="text-xs">Save your current settings to create your first preset.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {presets.map((preset: Preset) => (
                      <div key={preset.id} className="flex items-center justify-between p-3 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">
                        <div className="flex-1 cursor-pointer" onClick={() => handleLoadPreset(preset)}>
                          <div className="font-medium text-sm">{preset.name}</div>
                          {preset.description && (
                            <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">{preset.description}</div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            {preset.settings.width}×{preset.settings.height}mm • {preset.settings.quantity} photos • {preset.borderWidth}mm border
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePreset(preset);
                          }}
                          className="ml-2 h-8 w-8 p-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Photo Controls */}
            <Card className="shadow-card dark:shadow-slate-900/50 border-0 bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm dark:backdrop-blur-md">
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center">
                  <div className="bg-gradient-primary p-3 rounded-lg mr-4 shadow-primary">
                    <Settings className="text-white h-6 w-6" />
                  </div>
                  Photo Settings
                </h2>
                
                <div className="space-y-8">
                  {/* Dimensions */}
                  <div>
                    <Label className="text-lg font-medium text-gray-700 dark:text-slate-300 mb-4 block">Photo Dimensions (mm)</Label>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm text-gray-600 dark:text-slate-400 mb-2 block">Width</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={photoSettings.width}
                            min={10}
                            max={100}
                            onChange={(e) => setPhotoSettings(prev => ({ ...prev, width: parseInt(e.target.value) || 35 }))}
                            className="pr-10 h-12 text-lg border-gray-300 dark:border-slate-600"
                          />
                          <span className="absolute right-3 top-3 text-md text-gray-500 dark:text-slate-400">mm</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600 dark:text-slate-400 mb-2 block">Height</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={photoSettings.height}
                            min={10}
                            max={150}
                            onChange={(e) => setPhotoSettings(prev => ({ ...prev, height: parseInt(e.target.value) || 45 }))}
                            className="pr-10 h-12 text-lg border-gray-300 dark:border-slate-600"
                          />
                          <span className="absolute right-3 top-3 text-md text-gray-500 dark:text-slate-400">mm</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => setPresetSize(35, 45)}
                        className="text-sm py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:from-primary/20 hover:to-primary/10"
                      >
                        Passport (35×45)
                      </Button>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => setPresetSize(51, 51)}
                        className="text-sm py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:from-primary/20 hover:to-primary/10"
                      >
                        Visa (51×51)
                      </Button>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => setPresetSize(25, 35)}
                        className="text-sm py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:from-primary/20 hover:to-primary/10"
                      >
                        ID Card (25×35)
                      </Button>
                    </div>
                  </div>

                  {/* Layout Position */}
                  <div>
                    <Label className="text-lg font-medium text-gray-700 dark:text-slate-300 mb-4">Layout Position</Label>
                    <select
                      value={photoSettings.layout}
                      onChange={(e) => setPhotoSettings(prev => ({ ...prev, layout: e.target.value as any }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 text-lg bg-white dark:bg-black text-gray-900 dark:text-white h-12"
                    >
                      <option value="auto">Auto Layout</option>
                      <optgroup label="Top Positions">
                        <option value="top-left">Top Left</option>
                        <option value="top-middle">Top Middle</option>
                        <option value="top-right">Top Right</option>
                      </optgroup>
                      <optgroup label="Middle Positions">
                        <option value="middle-left">Middle Left</option>
                        <option value="middle-middle">Middle Center</option>
                        <option value="middle-right">Middle Right</option>
                      </optgroup>
                      <optgroup label="Bottom Positions">
                        <option value="down-left">Bottom Left</option>
                        <option value="down-middle">Bottom Middle</option>
                        <option value="down-right">Bottom Right</option>
                      </optgroup>
                    </select>
                    
                    {/* Layout Diagram */}
                    {photoSettings.layout !== 'auto' && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-slate-600">
                        <div className="text-xs text-gray-600 dark:text-slate-400 mb-2">Position Preview:</div>
                        <div className="w-full h-16 border-2 border-gray-300 dark:border-slate-600 rounded relative bg-white dark:bg-slate-900">
                          <div 
                            className={`absolute w-4 h-4 bg-blue-500 rounded-sm transition-all duration-200 ${
                              photoSettings.layout === 'top-left' ? 'top-1 left-1' :
                              photoSettings.layout === 'top-middle' ? 'top-1 left-1/2 transform -translate-x-1/2' :
                              photoSettings.layout === 'top-right' ? 'top-1 right-1' :
                              photoSettings.layout === 'middle-left' ? 'top-1/2 left-1 transform -translate-y-1/2' :
                              photoSettings.layout === 'middle-middle' ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2' :
                              photoSettings.layout === 'middle-right' ? 'top-1/2 right-1 transform -translate-y-1/2' :
                              photoSettings.layout === 'down-left' ? 'bottom-1 left-1' :
                              photoSettings.layout === 'down-middle' ? 'bottom-1 left-1/2 transform -translate-x-1/2' :
                              photoSettings.layout === 'down-right' ? 'bottom-1 right-1' : ''
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quantity Slider */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 flex items-center justify-between">
                      <span>Photos per A4 page</span>
                      <span className="text-primary font-semibold">{photoSettings.quantity}</span>
                    </Label>
                    <Slider
                      value={[photoSettings.quantity]}
                      onValueChange={(value) => setPhotoSettings(prev => ({ ...prev, quantity: value[0] }))}
                      min={1}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1</span>
                      <span>20</span>
                    </div>
                  </div>

                  {/* Photo Spacing Slider */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 flex items-center justify-between">
                      <span>Distance between photos</span>
                      <span className="text-primary font-semibold">{photoSettings.spacing}mm</span>
                    </Label>
                    <Slider
                      value={[photoSettings.spacing]}
                      onValueChange={(value) => setPhotoSettings(prev => ({ ...prev, spacing: value[0] }))}
                      min={0}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0mm</span>
                      <span>20mm</span>
                    </div>
                  </div>

                  {/* Top Margin Slider */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 flex items-center justify-between">
                      <span>Distance from top</span>
                      <span className="text-primary font-semibold">{photoSettings.topMargin}mm</span>
                    </Label>
                    <Slider
                      value={[photoSettings.topMargin]}
                      onValueChange={(value) => setPhotoSettings(prev => ({ ...prev, topMargin: value[0] }))}
                      min={5}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>5mm</span>
                      <span>50mm</span>
                    </div>
                  </div>

                  {/* Border Width Slider */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 flex items-center justify-between">
                      <span>Photo border width</span>
                      <span className="text-primary font-semibold">{borderWidth}mm</span>
                    </Label>
                    <Slider
                      value={[borderWidth]}
                      onValueChange={(value) => setBorderWidth(value[0])}
                      min={0}
                      max={6}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0mm (no border)</span>
                      <div className="flex space-x-2 text-xs">
                        <span>1mm</span>
                        <span>2mm</span>
                        <span>3mm</span>
                        <span>4mm</span>
                        <span>5mm</span>
                      </div>
                      <span>6mm</span>
                    </div>
                  </div>

                  {/* Auto Preview Settings */}
                  <div className="border-t pt-6">
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-4 flex items-center">
                      <SearchCheck className="text-primary mr-2 h-4 w-4" />
                      Preview Settings
                    </Label>
                    
                    <div className="flex items-center justify-between p-3 border border-gray-300 dark:border-slate-600 rounded-lg">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">Auto Preview</Label>
                        <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">Automatically update preview when settings change</p>
                      </div>
                      <Switch
                        checked={autoPreview}
                        onCheckedChange={setAutoPreview}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="shadow-card dark:shadow-slate-900/50 border-0 bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm dark:backdrop-blur-md">
              <CardContent className="p-6">
                <div className="space-y-3">
                  


                  {/* Auto-update Status */}
                  <div className="text-center text-sm text-gray-600 dark:text-green-300 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50 rounded-lg py-3 px-4">
                    <div className="flex items-center justify-center space-x-2">
                      <SearchCheck className="h-4 w-4 text-green-600" />
                      <span>Auto-preview enabled • Real-time updates</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-center p-4 border rounded-lg bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600">
                      <div className="text-sm text-gray-600 dark:text-slate-400 mb-2">Ready to download?</div>
                      <div className="text-xs text-gray-500 dark:text-slate-500">Use the export options in the right panel to download your photos in PDF, PNG, or JPG format</div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset All Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area: Preview and Settings */}
          <div className="space-y-8 max-w-2xl mx-auto">
            {/* Center Panel: A4 Preview */}
            <Card className="shadow-card dark:shadow-slate-900/50 border-0 bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm dark:backdrop-blur-md">
            <CardContent className="p-6">
              <div className="flex flex-col items-center mb-4">
                <h2 className="text-xl font-semibold text-foreground flex items-center justify-center">
                  <div className="bg-gradient-primary p-2 rounded-lg mr-3 shadow-primary">
                    <FileText className="text-white h-5 w-5" />
                  </div>
                  <span>A4 Preview</span>
                </h2>
                
                {/* Zoom Controls Below Title */}
                <div className="flex items-center space-x-2 mt-3">
                  {layoutResult && (
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= 0.5}
                        className="h-8 w-8 p-0"
                        data-testid="button-zoom-out"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-gray-600 dark:text-gray-400 px-2">
                        {Math.round(zoomLevel * 100)}%
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= 3}
                        className="h-8 w-8 p-0"
                        data-testid="button-zoom-in"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetZoom}
                        className="h-8 w-8 p-0"
                        data-testid="button-reset-zoom"
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="text-sm text-gray-500 dark:text-gray-400 ml-2">210 × 297 mm</div>
                </div>
              </div>

              {/* A4 Canvas */}
              <div className="relative bg-white dark:bg-slate-900 rounded-lg shadow-inner dark:shadow-slate-950/50 w-[400px] h-[566px] mx-auto overflow-hidden border border-gray-300 dark:border-slate-600">
                
                {/* Empty State */}
                {!layoutResult && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4 p-8">
                      <div className="bg-gray-50 dark:bg-slate-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                        <Image className="h-8 w-8 text-gray-400 dark:text-slate-500" />
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-slate-300 font-medium">Upload a photo to see preview</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Your passport photos will appear here in high quality</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Canvas Preview */}
                {layoutResult && (
                  <canvas
                    ref={canvasRef}
                    className="rounded-sm w-full h-full"
                  />
                )}

                {/* Page Info */}
                {layoutResult && (
                  <div className="absolute bottom-4 left-4 text-xs text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm border dark:border-slate-600">
                    Page 1 of 1 • Zoom: {Math.round(zoomLevel * 100)}%
                  </div>
                )}
              </div>

              {/* Preview Stats */}
              {layoutResult && (
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 border border-gray-300 dark:border-slate-600">
                    <div className="text-lg font-semibold text-gray-900 dark:text-slate-100">{photoSettings.quantity}</div>
                    <div className="text-xs text-gray-600 dark:text-slate-400">Photos</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 border border-gray-300 dark:border-slate-600">
                    <div className="text-lg font-semibold text-gray-900 dark:text-slate-100">{photoSettings.width}×{photoSettings.height}mm</div>
                    <div className="text-xs text-gray-600 dark:text-slate-400">Size</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 border border-gray-300 dark:border-slate-600">
                    <div className="text-lg font-semibold text-gray-900 dark:text-slate-100">{Math.round(layoutResult.pageUtilization * 100)}%</div>
                    <div className="text-xs text-gray-600 dark:text-slate-400">Paper Usage</div>
                  </div>
                </div>
              )}


            </CardContent>
          </Card>

            {/* Instructions Card */}
            <Card className="bg-blue-50 dark:bg-slate-900 border-blue-200 dark:border-slate-700">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-slate-100 mb-3 flex items-center">
              <FileText className="text-blue-600 dark:text-purple-400 mr-2 h-5 w-5" />
              How to Use
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 dark:bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">1</div>
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-slate-200">Upload Photo</h4>
                  <p className="text-sm text-blue-700 dark:text-slate-400">Choose a clear, high-quality photo with good lighting</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 dark:bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">2</div>
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-slate-200">Set Dimensions</h4>
                  <p className="text-sm text-blue-700 dark:text-slate-400">Adjust width and height according to your requirements</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 dark:bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">3</div>
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-slate-200">Choose Quantity</h4>
                  <p className="text-sm text-blue-700 dark:text-slate-400">Select how many photos you want per A4 page</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 dark:bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">4</div>
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-slate-200">Download</h4>
                  <p className="text-sm text-blue-700 dark:text-slate-400">Generate and download your A4 layout as PDF</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

            {/* Advanced Settings & Controls */}
            
            {/* Crop and Position Tools */}
          {uploadedImage && (
            <Card className="shadow-card dark:shadow-slate-900/50 border-0 bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm dark:backdrop-blur-md">
              <CardContent className="p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center">
                  <div className="bg-gradient-primary p-3 rounded-lg mr-4 shadow-primary">
                    <Crop className="text-white h-6 w-6" />
                  </div>
                  Crop & Position
                </h2>
                
                <div className="space-y-8">
                  {/* Position Controls */}
                  <div>
                    <Label className="text-lg font-medium mb-4 block">Position Controls</Label>
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="cropX" className="text-sm text-gray-600 dark:text-slate-400 mb-3 block">X Position: {cropSettings.x}%</Label>
                        <Slider
                          id="cropX"
                          min={-50}
                          max={50}
                          step={1}
                          value={[cropSettings.x]}
                          onValueChange={(value) => handleCropChange('x', value[0])}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cropY" className="text-sm text-gray-600 dark:text-slate-400 mb-3 block">Y Position: {cropSettings.y}%</Label>
                        <Slider
                          id="cropY"
                          min={-50}
                          max={50}
                          step={1}
                          value={[cropSettings.y]}
                          onValueChange={(value) => handleCropChange('y', value[0])}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Transform Controls */}
                  <div>
                    <Label className="text-lg font-medium mb-4 block">Transform Controls</Label>
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="cropScale" className="text-sm text-gray-600 dark:text-slate-400 mb-3 block">Scale: {cropSettings.scale.toFixed(2)}x</Label>
                        <Slider
                          id="cropScale"
                          min={0.5}
                          max={3}
                          step={0.1}
                          value={[cropSettings.scale]}
                          onValueChange={(value) => handleCropChange('scale', value[0])}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cropRotation" className="text-sm text-gray-600 dark:text-slate-400 mb-3 block">Rotation: {cropSettings.rotation}°</Label>
                        <Slider
                          id="cropRotation"
                          min={-180}
                          max={180}
                          step={1}
                          value={[cropSettings.rotation]}
                          onValueChange={(value) => handleCropChange('rotation', value[0])}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Crop Size Controls */}
                  <div>
                    <Label className="text-lg font-medium mb-4 block">Crop Size</Label>
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="cropWidth" className="text-sm text-gray-600 dark:text-slate-400 mb-3 block">Width: {cropSettings.width}%</Label>
                        <Slider
                          id="cropWidth"
                          min={20}
                          max={100}
                          step={1}
                          value={[cropSettings.width]}
                          onValueChange={(value) => handleCropChange('width', value[0])}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cropHeight" className="text-sm text-gray-600 dark:text-slate-400 mb-3 block">Height: {cropSettings.height}%</Label>
                        <Slider
                          id="cropHeight"
                          min={20}
                          max={100}
                          step={1}
                          value={[cropSettings.height]}
                          onValueChange={(value) => handleCropChange('height', value[0])}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-4 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="default"
                      onClick={resetCrop}
                      className="flex-1 h-12"
                    >
                      <RotateCcw className="h-5 w-5 mr-2" />
                      Reset
                    </Button>
                    <Button 
                      variant="outline" 
                      size="default"
                      onClick={() => handleCropChange('rotation', cropSettings.rotation + 90)}
                      className="flex-1 h-12"
                    >
                      <Rotate className="h-5 w-5 mr-2" />
                      Rotate 90°
                    </Button>
                  </div>
                  
                  <Button 
                    size="lg"
                    onClick={handleSaveCroppedPhoto}
                    disabled={!uploadedImage}
                    className="w-full h-14 text-lg bg-primary text-white hover:bg-primary/90"
                  >
                    <Save className="h-5 w-5 mr-2" />
                    Save Cropped Photo
                  </Button>

                  {/* Live Crop Preview */}
                  <div className="mt-8 p-6 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <Label className="text-lg font-medium mb-4 block">Live Preview</Label>
                    <div 
                      ref={cropPreviewRef}
                      className="relative mx-auto bg-white dark:bg-slate-900 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded select-none" 
                      style={{ 
                        width: '180px', 
                        height: `${180 * (photoSettings.height / photoSettings.width)}px`,
                        maxHeight: '240px'
                      }}
                    >
                      {uploadedImage && (
                        <div className="absolute inset-0 overflow-hidden rounded">
                          <img
                            src={`/api/images/${uploadedImage.filename}`}
                            alt="Crop preview"
                            className="absolute pointer-events-none"
                            style={{
                              transform: `
                                scale(${cropSettings.scale}) 
                                rotate(${cropSettings.rotation}deg)
                              `,
                              transformOrigin: 'center',
                              width: '100%',
                              height: '100%',
                              left: '0%',
                              top: '0%',
                              objectFit: 'cover'
                            }}
                          />
                          {/* Interactive Crop frame overlay */}
                          <div 
                            className="absolute border-2 border-blue-500 dark:border-blue-400 bg-blue-500 bg-opacity-10 cursor-move"
                            style={{
                              left: `${(100 - cropSettings.width) / 2 + cropSettings.x / 2}%`,
                              top: `${(100 - cropSettings.height) / 2 + cropSettings.y / 2}%`,
                              width: `${cropSettings.width}%`,
                              height: `${cropSettings.height}%`,
                            }}
                            onMouseDown={handleCropStart}
                            onTouchStart={handleCropStart}
                          >
                            <div className="absolute -top-6 left-0 text-xs text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-2 py-1 rounded pointer-events-none">
                              Drag to Move
                            </div>
                            
                            {/* Resize handles */}
                            <div 
                              className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 dark:bg-blue-400 border border-white dark:border-slate-800 cursor-nw-resize"
                              onMouseDown={(e) => handleResizeStart(e, 'top-left')}
                              onTouchStart={(e) => handleResizeStart(e, 'top-left')}
                            />
                            <div 
                              className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 dark:bg-blue-400 border border-white dark:border-slate-800 cursor-ne-resize"
                              onMouseDown={(e) => handleResizeStart(e, 'top-right')}
                              onTouchStart={(e) => handleResizeStart(e, 'top-right')}
                            />
                            <div 
                              className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 dark:bg-blue-400 border border-white dark:border-slate-800 cursor-sw-resize"
                              onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
                              onTouchStart={(e) => handleResizeStart(e, 'bottom-left')}
                            />
                            <div 
                              className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 dark:bg-blue-400 border border-white dark:border-slate-800 cursor-se-resize"
                              onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
                              onTouchStart={(e) => handleResizeStart(e, 'bottom-right')}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Background Settings */}
          <Card className="shadow-card dark:shadow-slate-900/50 border-0 bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm dark:backdrop-blur-md">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <div className="bg-gradient-primary p-2 rounded-lg mr-3 shadow-primary">
                  <Palette className="text-white h-5 w-5" />
                </div>
                Background & Style
              </h2>
              
              <div className="space-y-6">
                {/* Background Removal */}
                <div className="flex items-center justify-between p-4 border border-gray-300 dark:border-slate-600 rounded-lg">
                  <div>
                    <Label htmlFor="removeBackground" className="text-sm font-medium">AI Background Removal</Label>
                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                      Automatically remove background and replace with solid color
                    </p>
                  </div>
                  <Switch
                    id="removeBackground"
                    checked={backgroundSettings.removeBackground}
                    onCheckedChange={(checked) => 
                      setBackgroundSettings(prev => ({ ...prev, removeBackground: checked }))
                    }
                  />
                </div>

                {/* Background Color */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Background Color</Label>
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded border-2 border-gray-300 dark:border-slate-600 cursor-pointer"
                      style={{ backgroundColor: backgroundSettings.backgroundColor }}
                      onClick={() => document.getElementById('colorPicker')?.click()}
                    />
                    <input
                      id="colorPicker"
                      type="color"
                      value={backgroundSettings.backgroundColor}
                      onChange={(e) => setBackgroundSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                      className="hidden"
                    />
                    <Input
                      type="text"
                      value={backgroundSettings.backgroundColor}
                      onChange={(e) => setBackgroundSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                      className="flex-1 font-mono text-sm border-gray-300 dark:border-slate-600"
                      placeholder="#ffffff"
                    />
                  </div>
                  
                  {/* Color Presets */}
                  <div className="grid grid-cols-6 gap-2 mt-3">
                    {['#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#adb5bd', '#6c757d'].map((color) => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded border-2 border-gray-300 dark:border-slate-600 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() => setBackgroundSettings(prev => ({ ...prev, backgroundColor: color }))}
                      />
                    ))}
                  </div>
                </div>

                {/* Border Width */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Border Width: {borderWidth}mm</Label>
                  <Slider
                    min={0}
                    max={5}
                    step={0.5}
                    value={[borderWidth]}
                    onValueChange={(value) => setBorderWidth(value[0])}
                    className="mt-1"
                  />
                </div>

                {/* Apply Background Settings */}
                {uploadedImage && (
                  <Button
                    onClick={() => {
                      if (backgroundSettings.removeBackground) {
                        backgroundRemovalMutation.mutate({
                          imageId: uploadedImage.id,
                          backgroundColor: backgroundSettings.backgroundColor
                        });
                      }
                    }}
                    disabled={backgroundRemovalMutation.isPending}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  >
                    {backgroundRemovalMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Scissors className="h-4 w-4 mr-2" />
                        Apply Background Settings
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions & Export */}
          <Card className="shadow-card dark:shadow-slate-900/50 border-0 bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm dark:backdrop-blur-md">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <div className="bg-gradient-primary p-2 rounded-lg mr-3 shadow-primary">
                  <Download className="text-white h-5 w-5" />
                </div>
                Export & Actions
              </h2>
              
              <div className="space-y-4">
                {/* Download Options */}
                <div className="space-y-3">
                  <Button
                    onClick={handleDownloadPdf}
                    disabled={!layoutResult || downloadPdfMutation.isPending}
                    className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white"
                  >
                    {downloadPdfMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </>
                    )}
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleDownloadImage('png')}
                      disabled={!layoutResult}
                      variant="outline"
                      className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-600/50 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800/40 dark:hover:to-blue-700/40 text-blue-700 dark:text-blue-300"
                    >
                      <Download className="mr-1 h-4 w-4" />
                      PNG
                    </Button>
                    <Button
                      onClick={() => handleDownloadImage('jpg')}
                      disabled={!layoutResult}
                      variant="outline"
                      className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-600/50 hover:from-green-100 hover:to-green-200 dark:hover:from-green-800/40 dark:hover:to-green-700/40 text-green-700 dark:text-green-300"
                    >
                      <Download className="mr-1 h-4 w-4" />
                      JPG
                    </Button>
                  </div>
                </div>

                {/* Reset */}
                <div className="border-t pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="w-full text-gray-600 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset All Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
