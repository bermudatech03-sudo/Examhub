// S3 Service
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT, // for MinIO compatibility
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  },
  forcePathStyle: !!process.env.S3_ENDPOINT
})

const BUCKET = process.env.S3_BUCKET || 'examhub'

export const s3Service = {
  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<string> {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType
      })
    )

    if (process.env.S3_ENDPOINT) {
      return `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`
    }
    return `https://${BUCKET}.s3.amazonaws.com/${key}`
  },

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 3600
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType
    })
    return getSignedUrl(s3, command, { expiresIn })
  },

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
    return getSignedUrl(s3, command, { expiresIn })
  },

  async delete(key: string): Promise<void> {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
  }
}
