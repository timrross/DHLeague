import multer from 'multer';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import fetch from 'node-fetch';
import { NextFunction, Request, Response } from 'express';
import { log } from './vite';

// Ensure upload directory exists
const uploadDir = './public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    let filename = '';
    
    // Try to get rider name from request for better filenames
    if (req.body.name) {
      // Create a filename from rider name (lowercase, dashes for spaces)
      const sanitizedName = req.body.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      
      // Add a timestamp to ensure uniqueness for riders with the same name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      filename = `${sanitizedName}-${timestamp}`;
    } else {
      // Fallback to generic name if no rider name available
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      filename = `rider-${uniqueSuffix}`;
    }
    
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${filename}${ext}`);
  },
});

// Create upload middleware
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      // @ts-ignore - multer typings are not accurate
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
});

// Process uploaded image
export const processImage = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    // If no file was uploaded, continue to next middleware
    if (!req.file) {
      return next();
    }

    const filePath = req.file.path;
    
    // Get original filename without extension
    const fileBaseName = path.basename(filePath, path.extname(filePath));
    
    // Create output filename with webp extension
    const outputFilename = `${fileBaseName}.webp`;
    const outputPath = path.join(uploadDir, outputFilename);
    
    // Resize and optimize image
    await sharp(filePath)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .toFormat('webp')
      .webp({ quality: 85 })
      .toFile(outputPath);

    // Remove the original file if it's different from the output
    if (filePath !== outputPath) {
      fs.unlink(filePath, (err) => {
        if (err) log(`Error removing original file: ${err}`, 'error');
      });
    }

    // Update file path to optimized version
    const relativePath = `/uploads/${outputFilename}`;
    req.body.image = relativePath;
    
    next();
  } catch (error) {
    log(`Error processing image: ${error}`, 'error');
    next(error);
  }
};

// Download image from URL
export const downloadImage = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    // If no imageUrl in request or file already uploaded, skip
    if (!req.body.imageUrl || req.file) {
      return next();
    }

    const imageUrl = req.body.imageUrl;
    
    // Validate URL
    if (!imageUrl.match(/^https?:\/\/.+\/.+$/i)) {
      return next(new Error('Invalid image URL'));
    }

    // Create temp filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    let tmpFilename = `rider-remote-${uniqueSuffix}.tmp`;
    let filepath = path.join(uploadDir, tmpFilename);

    // Download image
    log(`Downloading image from ${imageUrl}`, 'info');
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      return next(new Error(`Failed to download image: ${response.statusText}`));
    }
    
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return next(new Error('URL does not point to an image'));
    }

    // Generate a better filename
    let finalFilename = '';
    if (req.body.name) {
      // Create a filename from rider name (lowercase, dashes for spaces)
      const sanitizedName = req.body.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      
      // Add a timestamp to ensure uniqueness for riders with the same name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      finalFilename = `${sanitizedName}-${timestamp}${path.extname(path.basename(imageUrl)) || '.jpg'}`;
      
      // Update the filepath with the final name
      const finalPath = path.join(uploadDir, finalFilename);
      
      // Save image to disk with the nice rider-based filename
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(finalPath, buffer);
      
      // Update filepath to our nice named file
      filepath = finalPath;
    } else {
      // Save image to disk with the temp name
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(filepath, buffer);
    }

    // Process image same as uploaded files
    req.file = {
      path: filepath,
      originalname: finalFilename || path.basename(imageUrl),
    } as Express.Multer.File;
    
    await processImage(req, _res, next);
  } catch (error) {
    log(`Error downloading image: ${error}`, 'error');
    next(error);
  }
};
