import path from 'path';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import type { Express } from 'express';
import { env } from '../config/env';
import { AppError } from '../middleware/error-handler';

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function getExtension(file: Express.Multer.File) {
  return MIME_EXT[file.mimetype] ?? (path.extname(file.originalname).toLowerCase() || '.jpg');
}

function getLocalUploadUrl(filename: string) {
  return `${env.apiBaseUrl.replace(/\/$/, '')}/uploads/products/${filename}`;
}

export class MediaService {
  private cloudinaryEnabled =
    Boolean(env.cloudinaryCloudName) &&
    Boolean(env.cloudinaryApiKey) &&
    Boolean(env.cloudinaryApiSecret);

  constructor() {
    if (this.cloudinaryEnabled) {
      cloudinary.config({
        cloud_name: env.cloudinaryCloudName,
        api_key: env.cloudinaryApiKey,
        api_secret: env.cloudinaryApiSecret,
        secure: true,
      });
    }
  }

  async uploadProductImages(files: Express.Multer.File[]) {
    if (files.length === 0) {
      throw new AppError(400, 'Debes subir al menos una imagen', 'IMAGES_REQUIRED');
    }
    if (files.length > env.maxProductImages) {
      throw new AppError(400, `Máximo ${env.maxProductImages} imágenes`, 'TOO_MANY_IMAGES');
    }
    return Promise.all(files.map((file) => this.uploadSingleProductImage(file)));
  }

  private async uploadSingleProductImage(file: Express.Multer.File) {
    if (this.cloudinaryEnabled) {
      return this.uploadToCloudinary(file);
    }
    return this.uploadToLocalPublic(file);
  }

  private async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'alquila/products',
          resource_type: 'image',
          overwrite: false,
        },
        (error, result) => {
          if (error || !result?.secure_url) {
            reject(
              new AppError(500, 'No se pudo guardar la imagen', 'IMAGE_UPLOAD_FAILED'),
            );
            return;
          }
          resolve(result.secure_url);
        },
      );
      stream.end(file.buffer);
    });
  }

  private async uploadToLocalPublic(file: Express.Multer.File) {
    const filename = `${randomUUID()}${getExtension(file)}`;
    const uploadDir = path.resolve(process.cwd(), 'public', 'uploads', 'products');
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), file.buffer);
    return getLocalUploadUrl(filename);
  }
}

export const mediaService = new MediaService();
