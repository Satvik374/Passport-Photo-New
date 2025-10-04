import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import sharp from "sharp";
import { photoSettingsSchema, layoutResultSchema, cropSettingsSchema, backgroundRemovalRequestSchema, emailSignupSchema, emailLoginSchema, emailVerificationSchema, resendVerificationSchema } from "@shared/schema";
import { EmailAuthService } from "./emailAuth";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { jsPDF } from "jspdf";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Import and setup Google authentication
  const { setupGoogleAuth, isAuthenticated } = await import('./googleAuth');
  await setupGoogleAuth(app);

  // Ensure uploads directory exists
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }

  // Authentication routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      console.log('Auth check - Session ID:', req.sessionID);
      console.log('Auth check - User in session:', !!req.user, req.user?.id);
      // req.user now contains the full user object from Google auth
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Email authentication routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const signupData = emailSignupSchema.parse(req.body);
      const result = await EmailAuthService.registerUser(signupData);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid input data',
          errors: error.errors 
        });
      } else {
        console.error('Signup error:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Registration failed. Please try again.' 
        });
      }
    }
  });

  app.post('/api/auth/verify-email', async (req, res) => {
    try {
      const verificationData = emailVerificationSchema.parse(req.body);
      const result = await EmailAuthService.verifyEmail(verificationData.email, verificationData.verificationCode);
      
      if (result.success && result.user) {
        // Set user session for immediate login after verification
        (req as any).login(result.user, (err: any) => {
          if (err) {
            console.error('Session error:', err);
            res.status(200).json(result); // Still return success even if session fails
          } else {
            res.json(result);
          }
        });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid verification data',
          errors: error.errors 
        });
      } else {
        console.error('Email verification error:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Verification failed. Please try again.' 
        });
      }
    }
  });

  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const resendData = resendVerificationSchema.parse(req.body);
      const result = await EmailAuthService.resendVerificationCode(resendData.email);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid email address',
          errors: error.errors 
        });
      } else {
        console.error('Resend verification error:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Failed to resend verification code.' 
        });
      }
    }
  });

  // Test email service endpoint
  app.post('/api/test-email', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const { EmailService } = await import('./emailService');
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('🧪 Testing email service...');
      
      const emailSent = await EmailService.sendVerificationEmail(email, verificationCode);
      
      if (emailSent) {
        res.json({ 
          success: true, 
          message: 'Test email sent successfully! Check console for verification code.',
          verificationCode: verificationCode // In development, we can return it for testing
        });
      } else {
        res.status(500).json({ success: false, message: 'Failed to send test email' });
      }
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ success: false, message: 'Test email failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const loginData = emailLoginSchema.parse(req.body);
      console.log('Login attempt for email:', loginData.email);
      
      const result = await EmailAuthService.loginUser(loginData);
      console.log('Login result:', { success: result.success, message: result.message });
      
      if (result.success && result.user) {
        // Set user session
        (req as any).login(result.user, (err: any) => {
          if (err) {
            console.error('Login session error:', err);
            res.status(500).json({ 
              success: false, 
              message: 'Login failed. Please try again.' 
            });
          } else {
            res.json(result);
          }
        });
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid login data',
          errors: error.errors 
        });
      } else {
        console.error('Login error:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Login failed. Please try again.' 
        });
      }
    }
  });

  // Upload image endpoint (authentication optional for guests)
  app.post('/api/upload', upload.single('image'), async (req: MulterRequest & any, res) => {
    try {
      if (!req.file) {
        console.error('No file in request');
        return res.status(400).json({ message: 'No file uploaded' });
      }

      console.log('File uploaded:', req.file);
      const userId = req.user?.id || 'guest';

      const uploadedImage = await storage.saveUploadedImage({
        userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });

      res.json(uploadedImage);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Upload failed' });
    }
  });

  // Generate layout endpoint
  app.post('/api/generate-layout', async (req, res) => {
    try {
      const { imageId, settings, borderWidth = 0, cropSettings } = req.body;
      const validatedSettings = photoSettingsSchema.parse(settings);
      const validatedCropSettings = cropSettings ? cropSettingsSchema.parse(cropSettings) : null;

      const image = await storage.getUploadedImage(imageId);
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }

      // Use background-removed image if available, otherwise use original
      const sourceFilename = image.backgroundRemovedFilename || image.filename;
      const imagePath = path.join('uploads', sourceFilename);
      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ message: 'Image file not found' });
      }

      // Calculate A4 dimensions in pixels (300 DPI)
      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;
      const DPI = 300;
      const MM_TO_PIXELS = DPI / 25.4;

      const a4WidthPx = Math.round(A4_WIDTH_MM * MM_TO_PIXELS);
      const a4HeightPx = Math.round(A4_HEIGHT_MM * MM_TO_PIXELS);
      
      let photoWidthPx = Math.round(validatedSettings.width * MM_TO_PIXELS);
      let photoHeightPx = Math.round(validatedSettings.height * MM_TO_PIXELS);

      // Calculate layout - use user-defined top margin
      const sideMargin = Math.round(10 * MM_TO_PIXELS); // 10mm side margins
      const topMargin = Math.round((validatedSettings.topMargin || 10) * MM_TO_PIXELS); // User-defined top margin
      const bottomMargin = Math.round(10 * MM_TO_PIXELS); // 10mm bottom margin
      const availableWidth = a4WidthPx - (2 * sideMargin);
      const availableHeight = a4HeightPx - topMargin - bottomMargin;

      let photosPerRow: number;
      let totalRows: number;
      let actualQuantity: number;

      // Calculate optimal layout - arrange photos properly across multiple rows
      actualQuantity = validatedSettings.quantity;
      const spacingPx = Math.round((validatedSettings.spacing || 5) * MM_TO_PIXELS);
      
      // Calculate how many photos can fit per row at full size
      const maxPhotosPerRowAtFullSize = Math.floor((availableWidth + spacingPx) / (photoWidthPx + spacingPx));
      
      // Prefer horizontal layout but maintain good photo size
      if (actualQuantity <= 3) {
        // 1-3 photos: always use single horizontal row
        const singleRowWidth = (actualQuantity * photoWidthPx) + ((actualQuantity - 1) * spacingPx);
        
        if (singleRowWidth <= availableWidth) {
          photosPerRow = actualQuantity;
          totalRows = 1;
          console.log(`Layout: ${actualQuantity} photos fit in one row at full size`);
        } else {
          // Scale down to fit in one row
          const scaleToFitHorizontal = availableWidth / singleRowWidth;
          photoWidthPx = Math.round(photoWidthPx * scaleToFitHorizontal);
          photoHeightPx = Math.round(photoHeightPx * scaleToFitHorizontal);
          photosPerRow = actualQuantity;
          totalRows = 1;
          console.log(`Layout: ${actualQuantity} photos scaled to fit in one row, scale: ${scaleToFitHorizontal.toFixed(3)}`);
        }
      } else if (actualQuantity <= 8) {
        // 4-8 photos: use horizontal row layout as requested
        const singleRowWidth = (actualQuantity * photoWidthPx) + ((actualQuantity - 1) * spacingPx);
        const scaleToFitHorizontal = availableWidth / singleRowWidth;
        
        // Scale photos to fit in horizontal row
        photoWidthPx = Math.round(photoWidthPx * scaleToFitHorizontal);
        photoHeightPx = Math.round(photoHeightPx * scaleToFitHorizontal);
        photosPerRow = actualQuantity;
        totalRows = 1;
        console.log(`Layout: ${actualQuantity} photos in horizontal row, scale: ${scaleToFitHorizontal.toFixed(3)}`);
      } else {
        // For more than 8 photos, use multi-row layouts
        // Use maximum photos per row that fit, then calculate rows needed
        photosPerRow = Math.min(maxPhotosPerRowAtFullSize, actualQuantity);
        totalRows = Math.ceil(actualQuantity / photosPerRow);
      }
      
      // Check if photos fit with current size and spacing 
      const totalRequiredWidth = (photosPerRow * photoWidthPx) + ((photosPerRow - 1) * spacingPx);
      const totalRequiredHeight = (totalRows * photoHeightPx) + ((totalRows - 1) * spacingPx);
      
      // Only scale down if photos absolutely don't fit on the page (for multi-row layouts only)
      if (totalRows > 1 && (totalRequiredWidth > availableWidth || totalRequiredHeight > availableHeight)) {
        const widthScale = availableWidth / totalRequiredWidth;
        const heightScale = availableHeight / totalRequiredHeight;
        const scale = Math.min(widthScale, heightScale) * 0.98; // Minimal scaling to preserve photo quality
        
        photoWidthPx = Math.round(photoWidthPx * scale);
        photoHeightPx = Math.round(photoHeightPx * scale);
      }
      
      const pageUtilization = (actualQuantity * photoWidthPx * photoHeightPx) / (availableWidth * availableHeight);

      // Process the image with crop settings if provided
      let imageProcessor = sharp(imagePath);
      
      if (validatedCropSettings) {
        // Get image metadata to calculate crop positions
        const metadata = await imageProcessor.metadata();
        const originalWidth = metadata.width || 1;
        const originalHeight = metadata.height || 1;
        
        // Calculate crop dimensions
        const cropWidth = Math.round((originalWidth * validatedCropSettings.width) / 100);
        const cropHeight = Math.round((originalHeight * validatedCropSettings.height) / 100);
        const cropLeft = Math.round((originalWidth - cropWidth) / 2 + (originalWidth * validatedCropSettings.x) / 100);
        const cropTop = Math.round((originalHeight - cropHeight) / 2 + (originalHeight * validatedCropSettings.y) / 100);
        
        // Apply crop
        imageProcessor = imageProcessor.extract({
          left: Math.max(0, Math.min(cropLeft, originalWidth - cropWidth)),
          top: Math.max(0, Math.min(cropTop, originalHeight - cropHeight)),
          width: cropWidth,
          height: cropHeight
        });
        
        // Apply rotation if specified
        if (validatedCropSettings.rotation !== 0) {
          imageProcessor = imageProcessor.rotate(validatedCropSettings.rotation, { background: { r: 255, g: 255, b: 255 } });
        }
      }
      
      const processedBuffer = await imageProcessor
        .resize(photoWidthPx, photoHeightPx, { fit: 'cover' })
        .jpeg({ quality: 95 })
        .toBuffer();

      // Save processed image
      const processedFilename = `processed_${image.filename}.jpg`;
      const processedPath = path.join('uploads', processedFilename);
      fs.writeFileSync(processedPath, processedBuffer);

      const layoutResult = await storage.saveLayoutResult({
        imageId,
        settings: validatedSettings,
        cropSettings: validatedCropSettings,
        photosPerRow,
        totalRows,
        pageUtilization,
        processedImageUrl: `/api/images/${processedFilename}`,
        borderWidth,
      });

      res.json(layoutResult);
    } catch (error) {
      console.error('Layout generation error:', error);
      res.status(500).json({ message: 'Layout generation failed' });
    }
  });

  // Background removal endpoint with API key fallback
  app.post('/api/remove-background', async (req, res) => {
    try {
      const { imageId, backgroundColor = '#ffffff' } = backgroundRemovalRequestSchema.parse(req.body);
      
      const image = await storage.getUploadedImage(imageId);
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }

      const imagePath = path.join('uploads', image.filename);
      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ message: 'Image file not found' });
      }

      // Get all available Remove.bg API keys
      const apiKeys = [
        process.env.REMOVEBG_API_KEY,
        process.env.REMOVEBG_API_KEY_2,
        process.env.REMOVEBG_API_KEY_3,
        process.env.REMOVEBG_API_KEY_4,
        process.env.REMOVEBG_API_KEY_5,
        process.env.REMOVEBG_API_KEY_6,
        process.env.REMOVEBG_API_KEY_7,
        process.env.REMOVEBG_API_KEY_8,
        process.env.REMOVEBG_API_KEY_9,
        process.env.REMOVEBG_API_KEY_10
      ].filter(key => key && key.trim() !== '');

      if (apiKeys.length === 0) {
        return res.status(500).json({ message: 'No Remove.bg API keys configured' });
      }

      console.log(`Found ${apiKeys.length} Remove.bg API keys for fallback`);

      // Read image file once
      const imageBuffer = fs.readFileSync(imagePath);
      let lastError = null;

      // Try each API key until one succeeds
      for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[i];
        console.log(`Trying Remove.bg API key #${i + 1}...`);

        try {
          // Create fresh FormData for each attempt
          const formData = new FormData();
          formData.append('image_file', new Blob([imageBuffer], { type: image.mimeType }), image.originalName);
          formData.append('size', 'auto');
          formData.append('bg_color', backgroundColor.replace('#', ''));

          // Call Remove.bg API
          const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
              'X-Api-Key': apiKey!,
            },
            body: formData,
          });

          if (response.ok) {
            console.log(`✓ Remove.bg API key #${i + 1} succeeded`);
            
            // Save the processed image
            const processedImageBuffer = Buffer.from(await response.arrayBuffer());
            const backgroundRemovedFilename = `bg_removed_${image.filename}.png`;
            const outputPath = path.join('uploads', backgroundRemovedFilename);
            
            fs.writeFileSync(outputPath, processedImageBuffer);

            // Update image record with background removed filename
            const updatedImage = await storage.updateUploadedImage(imageId, {
              backgroundRemovedFilename
            });

            return res.json({
              success: true,
              backgroundRemovedUrl: `/api/images/${backgroundRemovedFilename}`,
              updatedImage,
              apiKeyUsed: i + 1
            });
          } else {
            const errorText = await response.text();
            const error = `API key #${i + 1} failed: ${response.status} - ${errorText}`;
            console.warn(`✗ ${error}`);
            lastError = error;
            
            // Continue to next API key
            continue;
          }
        } catch (fetchError) {
          const error = `API key #${i + 1} error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;
          console.warn(`✗ ${error}`);
          lastError = error;
          continue;
        }
      }

      // All API keys failed
      console.error('All Remove.bg API keys failed:', lastError);
      return res.status(500).json({ 
        message: 'Background removal failed - all API keys exhausted',
        lastError 
      });

    } catch (error) {
      console.error('Background removal error:', error);
      res.status(500).json({ message: 'Background removal failed' });
    }
  });

  // Serve processed images
  app.get('/api/images/:filename', (req, res) => {
    const filename = req.params.filename;
    const imagePath = path.join('uploads', filename);
    
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.sendFile(path.resolve(imagePath));
  });

  // Generate preview image endpoint (low-res for display)
  app.get('/api/generate-preview/:imageId', async (req, res) => {
    try {
      const { imageId } = req.params;
      const { layoutId } = req.query;
      console.log(`PREVIEW REQUEST: generating preview for imageId=${imageId}, layoutId=${layoutId}`);
      
      // If layoutId is provided, try to get that specific layout first
      let layout = null;
      if (layoutId) {
        layout = await storage.getLayoutResultById(layoutId as string);
      }
      
      // Fallback to getting latest layout by imageId
      if (!layout) {
        layout = await storage.getLayoutResult(imageId);
      }
      
      if (!layout) {
        return res.status(404).json({ message: 'Layout not found' });
      }

      const image = await storage.getUploadedImage(imageId);
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }

      // Use the original or background-removed image, NOT the processed layout image
      const sourceFilename = image.backgroundRemovedFilename || image.filename;
      const sourcePath = path.join('uploads', sourceFilename);
      
      if (!fs.existsSync(sourcePath)) {
        return res.status(404).json({ message: 'Source image not found.' });
      }

      // Lower resolution for preview (faster loading)
      const DPI = 150; // Half resolution for preview
      const MM_TO_PIXELS = DPI / 25.4;
      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;

      const canvasWidth = Math.round(A4_WIDTH_MM * MM_TO_PIXELS);
      const canvasHeight = Math.round(A4_HEIGHT_MM * MM_TO_PIXELS);

      const { settings, photosPerRow, totalRows, borderWidth = 0 } = layout;
      console.log(`PREVIEW LAYOUT: quantity=${settings.quantity}, photosPerRow=${photosPerRow}, totalRows=${totalRows}`);
      const sideMarginPx = Math.round(10 * MM_TO_PIXELS); // 10mm side margins
      const topMarginPx = Math.round((settings.topMargin || 10) * MM_TO_PIXELS); // User-defined top margin
      const bottomMarginPx = Math.round(10 * MM_TO_PIXELS); // 10mm bottom margin
      
      const photoWidthPx = Math.round(settings.width * MM_TO_PIXELS);
      const photoHeightPx = Math.round(settings.height * MM_TO_PIXELS);
      
      // Calculate positioning (same logic as download)
      const availableWidth = canvasWidth - (2 * sideMarginPx);
      const availableHeight = canvasHeight - topMarginPx - bottomMarginPx;
      const spacingPx = Math.round((settings.spacing || 5) * MM_TO_PIXELS);
      
      let startX: number, startY: number, spacingX: number, spacingY: number;
      
      // Always use user-defined spacing
      spacingX = spacingPx;
      spacingY = spacingPx;
      
      const totalGridWidth = photosPerRow * photoWidthPx + (photosPerRow - 1) * spacingX;
      const totalGridHeight = totalRows * photoHeightPx + (totalRows - 1) * spacingY;
      
      if (settings.layout === 'auto') {
        // Auto layout - center horizontally, use top margin
        startX = (canvasWidth - totalGridWidth) / 2;
        startY = topMarginPx + (availableHeight - totalGridHeight) / 2;
      } else {
        // Specific position layout
        if (settings.layout.includes('left')) {
          startX = sideMarginPx;
        } else if (settings.layout.includes('right')) {
          startX = canvasWidth - sideMarginPx - totalGridWidth;
        } else {
          startX = (canvasWidth - totalGridWidth) / 2;
        }
        
        if (settings.layout.includes('top')) {
          startY = topMarginPx;
        } else if (settings.layout.includes('down')) {
          startY = canvasHeight - bottomMarginPx - totalGridHeight;
        } else {
          startY = topMarginPx + (availableHeight - totalGridHeight) / 2;
        }
      }

      // Create composite image using Sharp
      const baseImage = sharp({
        create: {
          width: canvasWidth,
          height: canvasHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      });

      // Process the photo with border if specified (for preview)
      let photoBuffer: Buffer;
      if (borderWidth > 0) {
        const borderWidthPx = Math.round(borderWidth * MM_TO_PIXELS);
        const innerWidth = Math.max(10, photoWidthPx - (2 * borderWidthPx));
        const innerHeight = Math.max(10, photoHeightPx - (2 * borderWidthPx));
        
        // Only apply border if there's enough space (at least 10px inner size)
        if (innerWidth >= 10 && innerHeight >= 10 && borderWidthPx > 0 && borderWidthPx < photoWidthPx / 3) {
          try {
            console.log(`Applying ${borderWidth}mm border (${borderWidthPx}px) to preview photo`);
            
            // Resize image to inner dimensions first
            const innerImageBuffer = await sharp(sourcePath)
              .resize(innerWidth, innerHeight, { fit: 'cover' })
              .toBuffer();
            
            // Create photo with black border - use JPEG format for stability
            photoBuffer = await sharp({
              create: {
                width: photoWidthPx,
                height: photoHeightPx,
                channels: 3,
                background: { r: 0, g: 0, b: 0 }
              }
            })
            .composite([{
              input: innerImageBuffer,
              left: borderWidthPx,
              top: borderWidthPx
            }])
            .jpeg()
            .toBuffer();
          } catch (error) {
            console.error('Border processing failed, using image without border:', error);
            // Fallback to no border if border processing fails
            photoBuffer = await sharp(sourcePath)
              .resize(photoWidthPx, photoHeightPx, { fit: 'cover' })
              .jpeg()
              .toBuffer();
          }
        } else {
          console.log(`Border too large (${borderWidthPx}px) for photo size (${photoWidthPx}x${photoHeightPx}px), using without border`);
          // Border too large, use without border
          photoBuffer = await sharp(sourcePath)
            .resize(photoWidthPx, photoHeightPx, { fit: 'cover' })
            .jpeg()
            .toBuffer();
        }
      } else {
        // No border, use full dimensions
        photoBuffer = await sharp(sourcePath)
          .resize(photoWidthPx, photoHeightPx, { fit: 'cover' })
          .jpeg()
          .toBuffer();
      }

      // Create composite operations array
      const composite = [];
      let photoCount = 0;

      for (let row = 0; row < totalRows && photoCount < settings.quantity; row++) {
        for (let col = 0; col < photosPerRow && photoCount < settings.quantity; col++) {
          let x: number, y: number;
          
          if (settings.layout === 'auto') {
            x = Math.round(startX + (col * (photoWidthPx + spacingX)));
            y = Math.round(startY + (row * (photoHeightPx + spacingY)));
          } else {
            x = Math.round(startX + (col * (photoWidthPx + spacingX)));
            y = Math.round(startY + (row * (photoHeightPx + spacingY)));
          }
          
          composite.push({
            input: photoBuffer,
            left: x,
            top: y
          });
          
          photoCount++;
        }
      }

      // Generate preview image (JPEG for faster loading)  
      console.log(`Compositing ${composite.length} photo instances`);
      const outputBuffer = await baseImage
        .composite(composite)
        .jpeg({ quality: 85 })
        .toBuffer();
      
      res.setHeader('Content-Type', 'image/jpeg');
      res.send(outputBuffer);

    } catch (error) {
      console.error('Preview generation error:', error);
      res.status(500).json({ message: 'Preview generation failed' });
    }
  });

  // Generate high-resolution image endpoint (PNG/JPG)
  app.post('/api/generate-image', async (req, res) => {
    try {
      const { imageId, format = 'png', layoutId } = req.body;
      
      // Use specific layout if provided, otherwise get latest
      let layout = null;
      if (layoutId) {
        layout = await storage.getLayoutResultById(layoutId);
      }
      
      if (!layout) {
        layout = await storage.getLayoutResult(imageId);
      }
      
      if (!layout) {
        return res.status(404).json({ message: 'Layout not found' });
      }

      const image = await storage.getUploadedImage(imageId);
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }

      // Use the original or background-removed image, NOT the processed layout image
      const sourceFilename = image.backgroundRemovedFilename || image.filename;
      const sourcePath = path.join('uploads', sourceFilename);
      
      if (!fs.existsSync(sourcePath)) {
        return res.status(404).json({ message: 'Source image not found.' });
      }

      // High-resolution settings for print quality
      const DPI = 300;
      const MM_TO_PIXELS = DPI / 25.4;
      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;

      const canvasWidth = Math.round(A4_WIDTH_MM * MM_TO_PIXELS);
      const canvasHeight = Math.round(A4_HEIGHT_MM * MM_TO_PIXELS);

      const { settings, photosPerRow, totalRows, borderWidth = 0 } = layout;
      const sideMarginPx = Math.round(10 * MM_TO_PIXELS); // 10mm side margins
      const topMarginPx = Math.round((settings.topMargin || 10) * MM_TO_PIXELS); // User-defined top margin
      const bottomMarginPx = Math.round(10 * MM_TO_PIXELS); // 10mm bottom margin
      
      const photoWidthPx = Math.round(settings.width * MM_TO_PIXELS);
      const photoHeightPx = Math.round(settings.height * MM_TO_PIXELS);
      
      // Calculate positioning
      const availableWidth = canvasWidth - (2 * sideMarginPx);
      const availableHeight = canvasHeight - topMarginPx - bottomMarginPx;
      
      let startX: number, startY: number, spacingX: number, spacingY: number;
      
      // Always use user-defined spacing
      const spacingMm = settings.spacing || 5;
      spacingX = Math.round(spacingMm * MM_TO_PIXELS);
      spacingY = Math.round(spacingMm * MM_TO_PIXELS);
      
      const totalGridWidth = photosPerRow * photoWidthPx + (photosPerRow - 1) * spacingX;
      const totalGridHeight = totalRows * photoHeightPx + (totalRows - 1) * spacingY;
      
      if (settings.layout === 'auto') {
        // Auto layout - center horizontally, use top margin
        startX = (canvasWidth - totalGridWidth) / 2;
        startY = topMarginPx + (availableHeight - totalGridHeight) / 2;
      } else {
        // Specific position layout
        if (settings.layout.includes('left')) {
          startX = sideMarginPx;
        } else if (settings.layout.includes('right')) {
          startX = canvasWidth - sideMarginPx - totalGridWidth;
        } else {
          startX = (canvasWidth - totalGridWidth) / 2;
        }
        
        if (settings.layout.includes('top')) {
          startY = topMarginPx;
        } else if (settings.layout.includes('down')) {
          startY = canvasHeight - bottomMarginPx - totalGridHeight;
        } else {
          startY = topMarginPx + (availableHeight - totalGridHeight) / 2;
        }
      }

      // Create composite image using Sharp
      const baseImage = sharp({
        create: {
          width: canvasWidth,
          height: canvasHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      });

      // Process the photo with border if specified (for high-res download)
      let photoBuffer: Buffer;
      if (borderWidth > 0) {
        const borderWidthPx = Math.round(borderWidth * MM_TO_PIXELS);
        const innerWidth = Math.max(10, photoWidthPx - (2 * borderWidthPx));
        const innerHeight = Math.max(10, photoHeightPx - (2 * borderWidthPx));
        
        // Only apply border if there's enough space
        if (innerWidth >= 10 && innerHeight >= 10 && borderWidthPx > 0 && borderWidthPx < photoWidthPx / 3) {
          try {
            console.log(`Applying ${borderWidth}mm border (${borderWidthPx}px) to download image`);
            
            // Resize image to inner dimensions first
            const innerImageBuffer = await sharp(sourcePath)
              .resize(innerWidth, innerHeight, { fit: 'cover' })
              .toBuffer();
            
            // Create photo with black border - explicitly set format
            photoBuffer = await sharp({
              create: {
                width: photoWidthPx,
                height: photoHeightPx,
                channels: 3,
                background: { r: 0, g: 0, b: 0 }
              }
            })
            .composite([{
              input: innerImageBuffer,
              left: borderWidthPx,
              top: borderWidthPx
            }])
            .jpeg({ quality: 95 })
            .toBuffer();
          } catch (error) {
            console.error('Border processing failed for download, using image without border:', error);
            // Fallback to no border if border processing fails
            photoBuffer = await sharp(sourcePath)
              .resize(photoWidthPx, photoHeightPx, { fit: 'cover' })
              .jpeg({ quality: 95 })
              .toBuffer();
          }
        } else {
          console.log(`Border too large (${borderWidthPx}px) for download photo size (${photoWidthPx}x${photoHeightPx}px), using without border`);
          // Border too large, use without border
          photoBuffer = await sharp(sourcePath)
            .resize(photoWidthPx, photoHeightPx, { fit: 'cover' })
            .jpeg({ quality: 95 })
            .toBuffer();
        }
      } else {
        // No border, use full dimensions
        photoBuffer = await sharp(sourcePath)
          .resize(photoWidthPx, photoHeightPx, { fit: 'cover' })
          .jpeg({ quality: 95 })
          .toBuffer();
      }

      // Create composite operations array
      const composite = [];
      let photoCount = 0;

      for (let row = 0; row < totalRows && photoCount < settings.quantity; row++) {
        for (let col = 0; col < photosPerRow && photoCount < settings.quantity; col++) {
          let x: number, y: number;
          
          if (settings.layout === 'auto') {
            x = Math.round(startX + (col * (photoWidthPx + spacingX)));
            y = Math.round(startY + (row * (photoHeightPx + spacingY)));
          } else {
            x = Math.round(startX + (col * (photoWidthPx + spacingX)));
            y = Math.round(startY + (row * (photoHeightPx + spacingY)));
          }
          
          composite.push({
            input: photoBuffer,
            left: x,
            top: y
          });
          
          photoCount++;
        }
      }

      // Generate the final image
      let outputProcessor = baseImage.composite(composite);
      
      if (format === 'jpg' || format === 'jpeg') {
        outputProcessor = outputProcessor.jpeg({ quality: 95 });
      } else {
        outputProcessor = outputProcessor.png({ quality: 95 });
      }

      const outputBuffer = await outputProcessor.toBuffer();
      
      // Generate descriptive filename with settings
      const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
      const baseFileName = image.originalName.replace(/\.[^/.]+$/, ""); // Remove extension
      const borderInfo = borderWidth > 0 ? `_border-${borderWidth}mm` : '';
      // Normalize format extension (jpg -> jpg, jpeg -> jpg, png -> png)
      const fileExtension = format === 'jpeg' ? 'jpg' : format;
      const filename = `passport-photos_${baseFileName}_${settings.width}x${settings.height}mm_${settings.quantity}photos${borderInfo}_${timestamp}.${fileExtension}`;
      
      console.log(`Generated ${format.toUpperCase()}: ${filename}`);
      
      res.setHeader('Content-Type', format === 'png' ? 'image/png' : 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(outputBuffer);

    } catch (error) {
      console.error('Image generation error:', error);
      res.status(500).json({ message: 'Image generation failed' });
    }
  });

  // Generate PDF endpoint
  app.post('/api/generate-pdf', async (req, res) => {
    try {
      const { imageId, layoutId } = req.body;
      
      // Use specific layout if provided, otherwise get latest
      let layout = null;
      if (layoutId) {
        layout = await storage.getLayoutResultById(layoutId);
      }
      
      if (!layout) {
        layout = await storage.getLayoutResult(imageId);
      }
      
      if (!layout) {
        return res.status(404).json({ message: 'Layout not found' });
      }

      const image = await storage.getUploadedImage(imageId);
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }

      // Create PDF with A4 dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const { settings, photosPerRow, totalRows, borderWidth = 0 } = layout;
      const sideMargin = 10; // 10mm side margins
      const topMargin = settings.topMargin || 10; // User-defined top margin
      const bottomMargin = 10; // 10mm bottom margin
      
      // Calculate positioning based on layout type
      const availableWidth = 210 - (2 * sideMargin);
      const availableHeight = 297 - topMargin - bottomMargin;
      
      let startX: number, startY: number, spacingX: number, spacingY: number;
      
      // Always use user-defined spacing
      const spacingMm = settings.spacing || 5;
      spacingX = spacingMm;
      spacingY = spacingMm;
      
      const totalGridWidth = photosPerRow * settings.width + (photosPerRow - 1) * spacingX;
      const totalGridHeight = totalRows * settings.height + (totalRows - 1) * spacingY;
      
      if (settings.layout === 'auto') {
        // Auto layout - center horizontally, use top margin
        startX = (210 - totalGridWidth) / 2;
        startY = topMargin + (availableHeight - totalGridHeight) / 2;
      } else {
        // Specific position layout
        if (settings.layout.includes('left')) {
          startX = sideMargin;
        } else if (settings.layout.includes('right')) {
          startX = 210 - sideMargin - totalGridWidth;
        } else { // middle
          startX = (210 - totalGridWidth) / 2;
        }
        
        // Calculate vertical position based on layout setting
        if (settings.layout.includes('top')) {
          startY = topMargin;
        } else if (settings.layout.includes('down')) {
          startY = 297 - bottomMargin - totalGridHeight;
        } else { // middle
          startY = topMargin + (availableHeight - totalGridHeight) / 2;
        }
      }

      // Read the processed image (same as preview and PNG/JPG downloads)
      const processedImagePath = path.join('uploads', `processed_${image.filename}.jpg`);
      if (!fs.existsSync(processedImagePath)) {
        return res.status(404).json({ message: 'Processed image not found. Please generate layout first.' });
      }
      const imageBuffer = fs.readFileSync(processedImagePath);
      const imageBase64 = imageBuffer.toString('base64');

      // Add images to PDF
      let photoCount = 0;
      for (let row = 0; row < totalRows && photoCount < settings.quantity; row++) {
        for (let col = 0; col < photosPerRow && photoCount < settings.quantity; col++) {
          let x: number, y: number;
          
          if (settings.layout === 'auto') {
            // Auto layout: equal spacing between all photos
            x = startX + (col * (settings.width + spacingX));
            y = startY + (row * (settings.height + spacingY));
          } else {
            // Positioned layout: consistent spacing between adjacent photos
            x = startX + (col * (settings.width + spacingX));
            y = startY + (row * (settings.height + spacingY));
          }
          
          pdf.addImage(imageBase64, 'JPEG', x, y, settings.width, settings.height);
          
          // Add border if border width is set
          if (borderWidth > 0) {
            pdf.setDrawColor(0, 0, 0); // Black border
            pdf.setLineWidth(borderWidth);
            pdf.rect(x, y, settings.width, settings.height);
          }
          
          photoCount++;
        }
      }

      const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
      
      // Generate descriptive filename with settings
      const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
      const baseFileName = image.originalName.replace(/\.[^/.]+$/, ""); // Remove extension
      const borderInfo = borderWidth > 0 ? `_border-${borderWidth}mm` : '';
      const filename = `passport-photos_${baseFileName}_${settings.width}x${settings.height}mm_${settings.quantity}photos${borderInfo}_${timestamp}.pdf`;
      
      console.log(`Generated PDF: ${filename}`);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).json({ message: 'PDF generation failed' });
    }
  });

  // Delete image endpoint
  app.delete('/api/images/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const image = await storage.getUploadedImage(id);
      
      if (image) {
        // Delete files
        const originalPath = path.join('uploads', image.filename);
        const processedPath = path.join('uploads', `processed_${image.filename}.jpg`);
        
        if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
        if (fs.existsSync(processedPath)) fs.unlinkSync(processedPath);
        
        // Delete from storage
        await storage.deleteUploadedImage(id);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ message: 'Delete failed' });
    }
  });

  // Preset endpoints (require authentication)
  app.get('/api/presets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const presets = await storage.getAllPresets(userId);
      res.json(presets);
    } catch (error) {
      console.error('Get presets error:', error);
      res.status(500).json({ message: 'Failed to get presets' });
    }
  });

  app.post('/api/presets', isAuthenticated, async (req: any, res) => {
    try {
      const { name, description, settings, borderWidth } = req.body;
      const userId = req.user.id;
      const preset = await storage.savePreset({
        userId,
        name,
        description,
        settings,
        borderWidth: borderWidth || 0
      });
      res.json(preset);
    } catch (error) {
      console.error('Save preset error:', error);
      res.status(500).json({ message: 'Failed to save preset' });
    }
  });

  app.delete('/api/presets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deletePreset(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete preset error:', error);
      res.status(500).json({ message: 'Failed to delete preset' });
    }
  });

  // Get user's image history (new endpoint)
  app.get('/api/images/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const images = await storage.getUserImages(userId);
      res.json(images);
    } catch (error) {
      console.error('Get user images error:', error);
      res.status(500).json({ message: 'Failed to get image history' });
    }
  });

  // Save cropped photo endpoint
  app.post('/api/save-cropped-photo', async (req, res) => {
    try {
      const { imageId, cropSettings, width, height, replaceOriginal } = req.body;
      
      const image = await storage.getUploadedImage(imageId);
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }

      // Use background-removed image if available, otherwise use original
      const sourceFilename = image.backgroundRemovedFilename || image.filename;
      const imagePath = path.join('uploads', sourceFilename);
      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ message: 'Image file not found' });
      }

      // Load the original image
      let imageProcessor = sharp(imagePath);
      
      // Get image metadata for calculations
      const metadata = await imageProcessor.metadata();
      const originalWidth = metadata.width!;
      const originalHeight = metadata.height!;

      // Apply crop settings
      const cropX = Math.round((cropSettings.x / 100) * originalWidth / 2 + (100 - cropSettings.width) / 2 * originalWidth / 100);
      const cropY = Math.round((cropSettings.y / 100) * originalHeight / 2 + (100 - cropSettings.height) / 2 * originalHeight / 100);
      const cropWidth = Math.round((cropSettings.width / 100) * originalWidth);
      const cropHeight = Math.round((cropSettings.height / 100) * originalHeight);

      // Apply transformations in the correct order
      imageProcessor = imageProcessor
        .extract({
          left: Math.max(0, Math.min(originalWidth - cropWidth, cropX)),
          top: Math.max(0, Math.min(originalHeight - cropHeight, cropY)),
          width: Math.min(cropWidth, originalWidth),
          height: Math.min(cropHeight, originalHeight)
        });

      // Apply rotation if specified
      if (cropSettings.rotation !== 0) {
        imageProcessor = imageProcessor.rotate(cropSettings.rotation, { background: { r: 255, g: 255, b: 255 } });
      }

      // Apply scale
      if (cropSettings.scale !== 1) {
        const currentMeta = await imageProcessor.metadata();
        const newWidth = Math.round(currentMeta.width! * cropSettings.scale);
        const newHeight = Math.round(currentMeta.height! * cropSettings.scale);
        imageProcessor = imageProcessor.resize(newWidth, newHeight, { fit: 'cover' });
      }

      if (replaceOriginal) {
        // Save as new file and update the image record
        const newFilename = `cropped_${Date.now()}_${image.filename}`;
        const newImagePath = path.join('uploads', newFilename);
        
        // Generate the final cropped image
        const outputBuffer = await imageProcessor.jpeg({ quality: 95 }).toBuffer();
        fs.writeFileSync(newImagePath, outputBuffer);
        
        // Get the new image size
        const newMetadata = await sharp(newImagePath).metadata();
        
        // Update the image record with the new cropped file
        const updatedImage = await storage.updateUploadedImage(imageId, {
          filename: newFilename,
          size: outputBuffer.length
        });
        
        console.log(`Replaced original image with cropped version: ${newFilename}`);
        res.json(updatedImage);
        
      } else {
        // Download mode - calculate passport photo dimensions and resize
        const DPI = 300;
        const MM_TO_PIXELS = DPI / 25.4;
        const photoWidthPx = Math.round(width * MM_TO_PIXELS);
        const photoHeightPx = Math.round(height * MM_TO_PIXELS);
        
        imageProcessor = imageProcessor
          .resize(photoWidthPx, photoHeightPx, { fit: 'cover' });

        // Generate the final image as PNG for quality
        const outputBuffer = await imageProcessor.png({ quality: 95 }).toBuffer();
        
        // Generate descriptive filename
        const timestamp = new Date().toISOString().slice(0, 10);
        const baseFileName = image.originalName.replace(/\.[^/.]+$/, "");
        const filename = `cropped-passport-photo_${baseFileName}_${width}x${height}mm_${timestamp}.png`;
        
        console.log(`Generated cropped passport photo: ${filename}`);
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(outputBuffer);
      }

    } catch (error) {
      console.error('Save cropped photo error:', error);
      res.status(500).json({ message: 'Failed to save cropped photo' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
