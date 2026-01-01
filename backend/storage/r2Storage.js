import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

let s3Client = null;

/**
 * Initialize Cloudflare R2 (S3-compatible) client
 * @returns {S3Client} S3 client instance
 */
const getS3Client = () => {
  if (!s3Client) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT;

    if (!accountId || !accessKeyId || !secretAccessKey || !endpoint) {
      throw new Error('R2 configuration environment variables are not set');
    }

    s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return s3Client;
};

/**
 * Get content key for a session
 * @param {string} sessionId - Session ID
 * @returns {string} Content key
 */
const getContentKey = (sessionId) => {
  return `sessions/${sessionId}/content.txt`;
};

/**
 * Save content to R2 storage
 * @param {string} sessionId - Session ID
 * @param {string} content - Editor content
 * @returns {Promise<void>}
 */
export const saveContent = async (sessionId, content) => {
  const client = getS3Client();
  const bucketName = process.env.R2_BUCKET_NAME;
  const key = getContentKey(sessionId);

  if (!bucketName) {
    throw new Error('R2_BUCKET_NAME environment variable is not set');
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: content,
      ContentType: 'text/plain',
    });

    await client.send(command);
    console.log(`Content saved to R2 for session: ${sessionId}`);
  } catch (error) {
    console.error(`Error saving content to R2 for session ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Load content from R2 storage
 * @param {string} sessionId - Session ID
 * @returns {Promise<string|null>} Content or null if not found
 */
export const loadContent = async (sessionId) => {
  const client = getS3Client();
  const bucketName = process.env.R2_BUCKET_NAME;
  const key = getContentKey(sessionId);

  if (!bucketName) {
    throw new Error('R2_BUCKET_NAME environment variable is not set');
  }

  try {
    // Check if object exists
    const headCommand = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    try {
      await client.send(headCommand);
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }

    // Get object content
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await client.send(getCommand);
    const content = await response.Body.transformToString();
    
    console.log(`Content loaded from R2 for session: ${sessionId}`);
    return content;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return null;
    }
    console.error(`Error loading content from R2 for session ${sessionId}:`, error);
    throw error;
  }
};

