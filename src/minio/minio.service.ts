import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME') || 'cilliarp-files';
    
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') || 'localhost',
      port: parseInt(this.configService.get<string>('MINIO_PORT') || '9000'),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin',
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin',
    });

    this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket ${this.bucketName} created successfully`);
        
        // Set bucket policy to allow public read access for certain file types
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/public/*`],
            },
          ],
        };
        
        await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
      }
    } catch (error) {
      this.logger.error('Error ensuring bucket exists:', error);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'general',
    isPublic: boolean = false
  ): Promise<string> {
    try {
      const fileName = `${Date.now()}-${file.originalname}`;
      const objectPath = isPublic ? `public/${folder}/${fileName}` : `private/${folder}/${fileName}`;

      const metaData = {
        'Content-Type': file.mimetype,
        'Content-Length': file.size.toString(),
      };

      await this.minioClient.putObject(
        this.bucketName,
        objectPath,
        file.buffer,
        file.size,
        metaData
      );

      this.logger.log(`File uploaded successfully: ${objectPath}`);
      return objectPath;
    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  async getFileUrl(objectPath: string, expires: number = 24 * 60 * 60): Promise<string> {
    try {
      // If it's a public file, return the public URL
      if (objectPath.startsWith('public/')) {
        const endpoint = this.configService.get<string>('MINIO_ENDPOINT') || 'localhost';
        const port = this.configService.get<string>('MINIO_PORT') || '9000';
        const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
        const protocol = useSSL ? 'https' : 'http';
        const portSuffix = (useSSL && port === '443') || (!useSSL && port === '80') ? '' : `:${port}`;
        
        return `${protocol}://${endpoint}${portSuffix}/${this.bucketName}/${objectPath}`;
      }

      // For private files, generate a presigned URL
      const url = await this.minioClient.presignedGetObject(this.bucketName, objectPath, expires);
      return url;
    } catch (error) {
      this.logger.error('Error getting file URL:', error);
      throw new Error('Failed to get file URL');
    }
  }

  async deleteFile(objectPath: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, objectPath);
      this.logger.log(`File deleted successfully: ${objectPath}`);
    } catch (error) {
      this.logger.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  async uploadVideo(file: Express.Multer.File): Promise<string> {
    return this.uploadFile(file, 'videos', false);
  }

  async uploadImage(file: Express.Multer.File, isPublic: boolean = true): Promise<string> {
    return this.uploadFile(file, 'images', isPublic);
  }

  async uploadDocument(file: Express.Multer.File): Promise<string> {
    return this.uploadFile(file, 'documents', false);
  }
}
