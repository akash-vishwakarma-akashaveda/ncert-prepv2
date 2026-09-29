import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const region = process.env.AWS_REGION ?? 'ap-south-1';
const bucket = process.env.S3_NOTES_BUCKET;

// WHEN_REQUIRED: since SDK 3.729 the default signs a CRC32 of the (empty) body into every
// pre-signed PUT URL, so S3 rejects the browser's real upload of the file.
const s3 = new S3Client({ region, requestChecksumCalculation: 'WHEN_REQUIRED' });

export function isS3Configured(): boolean {
  return Boolean(bucket);
}

/** A short-lived pre-signed PUT URL — the browser uploads the file directly to S3, never through
 * this server. `publicUrl` is where it'll be readable once uploaded (bucket has public-read on
 * this prefix — see guide/AWS_FROM_SCRATCH.md §S3). */
export async function createUploadUrl(path: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string }> {
  if (!bucket) throw new Error('S3_NOTES_BUCKET is not configured');
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket, Key: path, ContentType: contentType }),
    { expiresIn: 600 },
  );
  const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${path}`;
  return { uploadUrl, publicUrl };
}

export async function deleteObject(path: string): Promise<void> {
  if (!bucket) return;
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: path })).catch(() => undefined);
}
