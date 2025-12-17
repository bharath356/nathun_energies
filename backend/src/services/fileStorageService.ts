import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { Step1DocumentFile, Step1DocumentCategory, Step2DocumentFile, Step3DocumentFile } from '../../../shared/types';

// Generic document file interface
interface DocumentFile {
  documentId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  s3Key: string;
  s3Url?: string;
  thumbnailUrl?: string;
  details?: string; // For Step 2 documents
}

// Define Multer file interface
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// Configure AWS S3
const s3Config: AWS.S3.ClientConfiguration = {
  region: process.env.AWS_REGION || 'us-east-1',
};

// For local development, use localstack or minio
if (process.env.STAGE === 'dev' || process.env.IS_OFFLINE) {
  s3Config.endpoint = process.env.S3_ENDPOINT || 'http://localhost:4566';
  s3Config.accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'test';
  s3Config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'test';
  s3Config.s3ForcePathStyle = true;
}

const s3 = new AWS.S3(s3Config);

export class FileStorageService {
  private readonly bucketName = process.env.S3_BUCKET_NAME || 'call-management-documents';
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  constructor() {
    this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      await s3.headBucket({ Bucket: this.bucketName }).promise();
    } catch (error: any) {
      if (error.statusCode === 404) {
        try {
          await s3.createBucket({ Bucket: this.bucketName }).promise();
          console.log(`✓ Created S3 bucket: ${this.bucketName}`);
        } catch (createError) {
          console.error('Failed to create S3 bucket:', createError);
        }
      }
    }
  }

  /**
   * Upload a single file to S3
   */
  async uploadFile(
    file: MulterFile,
    clientId: string,
    category: Step1DocumentCategory,
    uploadedBy: string
  ): Promise<Step1DocumentFile> {
    // Validate file
    this.validateFile(file);

    // Generate unique file name
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const s3Key = `clients/${clientId}/step1/${category}/${fileName}`;

    try {
      // Upload to S3
      const uploadResult = await s3.upload({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          clientId,
          category,
          uploadedBy,
          originalName: file.originalname
        }
      }).promise();

      // Generate document file object
      const documentFile: Step1DocumentFile = {
        documentId: uuidv4(),
        fileName,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date().toISOString(),
        uploadedBy,
        s3Key,
        s3Url: uploadResult.Location
      };

      // Generate thumbnail for images
      if (file.mimetype.startsWith('image/')) {
        try {
          const thumbnailUrl = await this.generateThumbnail(file, s3Key);
          documentFile.thumbnailUrl = thumbnailUrl;
        } catch (thumbnailError) {
          console.warn('Failed to generate thumbnail:', thumbnailError);
        }
      }

      return documentFile;
    } catch (error) {
      console.error('Failed to upload file to S3:', error);
      throw new Error(`Failed to upload file: ${file.originalname}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: MulterFile[],
    clientId: string,
    category: Step1DocumentCategory,
    uploadedBy: string
  ): Promise<{ uploadedFiles: Step1DocumentFile[]; errors: Array<{ fileName: string; error: string }> }> {
    const uploadedFiles: Step1DocumentFile[] = [];
    const errors: Array<{ fileName: string; error: string }> = [];

    for (const file of files) {
      try {
        const uploadedFile = await this.uploadFile(file, clientId, category, uploadedBy);
        uploadedFiles.push(uploadedFile);
      } catch (error: any) {
        errors.push({
          fileName: file.originalname,
          error: error.message || 'Upload failed'
        });
      }
    }

    return { uploadedFiles, errors };
  }

  /**
   * Generic upload method for any step
   */
  async uploadGenericFiles<T extends DocumentFile>(
    files: MulterFile[],
    clientId: string,
    stepPath: string,
    uploadedBy: string,
    createDocumentFile: (baseFile: DocumentFile) => T
  ): Promise<{ uploadedFiles: T[]; errors: Array<{ fileName: string; error: string }> }> {
    const uploadedFiles: T[] = [];
    const errors: Array<{ fileName: string; error: string }> = [];

    for (const file of files) {
      try {
        // Validate file
        this.validateFile(file);

        // Generate unique file name
        const fileExtension = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExtension}`;
        const s3Key = `clients/${clientId}/${stepPath}/${fileName}`;

        // Upload to S3
        const uploadResult = await s3.upload({
          Bucket: this.bucketName,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: {
            clientId,
            stepPath,
            uploadedBy,
            originalName: file.originalname
          }
        }).promise();

        // Generate base document file object
        const baseDocumentFile: DocumentFile = {
          documentId: uuidv4(),
          fileName,
          originalName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date().toISOString(),
          uploadedBy,
          s3Key,
          s3Url: uploadResult.Location
        };

        // Generate thumbnail for images
        if (file.mimetype.startsWith('image/')) {
          try {
            const thumbnailUrl = await this.generateThumbnail(file, s3Key);
            baseDocumentFile.thumbnailUrl = thumbnailUrl;
          } catch (thumbnailError) {
            console.warn('Failed to generate thumbnail:', thumbnailError);
          }
        }

        // Create specific document file type
        const documentFile = createDocumentFile(baseDocumentFile);
        uploadedFiles.push(documentFile);
      } catch (error: any) {
        errors.push({
          fileName: file.originalname,
          error: error.message || 'Upload failed'
        });
      }
    }

    return { uploadedFiles, errors };
  }

  /**
   * Get a pre-signed URL for file download
   */
  async getDownloadUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const url = await s3.getSignedUrlPromise('getObject', {
        Bucket: this.bucketName,
        Key: s3Key,
        Expires: expiresIn
      });
      return url;
    } catch (error) {
      console.error('Failed to generate download URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(s3Key: string): Promise<void> {
    try {
      await s3.deleteObject({
        Bucket: this.bucketName,
        Key: s3Key
      }).promise();
    } catch (error) {
      console.error('Failed to delete file from S3:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(s3Keys: string[]): Promise<void> {
    if (s3Keys.length === 0) return;

    try {
      await s3.deleteObjects({
        Bucket: this.bucketName,
        Delete: {
          Objects: s3Keys.map(key => ({ Key: key }))
        }
      }).promise();
    } catch (error) {
      console.error('Failed to delete files from S3:', error);
      throw new Error('Failed to delete files');
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: MulterFile): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check mime type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }

    // Check for malicious file names
    if (file.originalname.includes('..') || file.originalname.includes('/')) {
      throw new Error('Invalid file name');
    }
  }

  /**
   * Generate thumbnail for images (simplified version)
   */
  private async generateThumbnail(file: MulterFile, s3Key: string): Promise<string> {
    // For now, return the original image URL
    // In a production environment, you would use a service like AWS Lambda with Sharp
    // to generate actual thumbnails
    const thumbnailKey = s3Key.replace(/(\.[^.]+)$/, '_thumb$1');
    
    try {
      // Upload a smaller version (this is a placeholder - implement actual resizing)
      await s3.upload({
        Bucket: this.bucketName,
        Key: thumbnailKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          type: 'thumbnail'
        }
      }).promise();

      return await this.getDownloadUrl(thumbnailKey);
    } catch (error) {
      console.warn('Failed to create thumbnail:', error);
      throw error;
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(s3Key: string): Promise<AWS.S3.HeadObjectOutput> {
    try {
      const metadata = await s3.headObject({
        Bucket: this.bucketName,
        Key: s3Key
      }).promise();
      return metadata;
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      throw new Error('Failed to get file metadata');
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(s3Key: string): Promise<boolean> {
    try {
      await this.getFileMetadata(s3Key);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const fileStorageService = new FileStorageService();
