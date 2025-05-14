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
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `rider-${uniqueSuffix}${ext}`);
  },
});

// Create upload middleware
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      // @ts-ignore - multer typings are not accurate
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
});

// Process uploaded image
export const processImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // If no file was uploaded, continue to next middleware
    if (!req.file) {
      return next();
    }

    const filePath = req.file.path;
    
    // Resize and optimize image
    await sharp(filePath)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .toFormat('webp')
      .webp({ quality: 80 })
      .toFile(`${filePath}.webp`);

    // Update file path to optimized version
    const relativePath = `/uploads/${path.basename(filePath)}.webp`;
    req.body.image = relativePath;
    
    next();
  } catch (error) {
    log(`Error processing image: ${error}`, 'error');
    next(error);
  }
};

// Download image from URL
export const downloadImage = async (req: Request, res: Response, next: NextFunction) => {
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

    // Create filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `rider-remote-${uniqueSuffix}.tmp`;
    const filepath = path.join(uploadDir, filename);

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

    // Save image to disk
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filepath, buffer);

    // Process image same as uploaded files
    req.file = {
      path: filepath,
      originalname: path.basename(imageUrl),
    } as Express.Multer.File;
    
    await processImage(req, res, next);
  } catch (error) {
    log(`Error downloading image: ${error}`, 'error');
    next(error);
  }
};