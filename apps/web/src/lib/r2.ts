import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/** Create an S3-compatible client configured for Cloudflare R2. */
export function createR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

/** Upload a file to R2. Returns the public URL. */
export async function uploadToR2(
  client: S3Client,
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

/** Delete a file from R2. */
export async function deleteFromR2(client: S3Client, key: string) {
  await client.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })
  );
}
