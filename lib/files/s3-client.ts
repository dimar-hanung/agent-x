import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  PRESIGNED_URL_EXPIRES_SECONDS,
  SEAWEEDFS_NOT_CONFIGURED_CODE,
  SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
} from "./constants";

export class SeaweedfsNotConfiguredError extends Error {
  readonly code = SEAWEEDFS_NOT_CONFIGURED_CODE;

  constructor(message = SEAWEEDFS_NOT_CONFIGURED_MESSAGE) {
    super(message);
    this.name = "SeaweedfsNotConfiguredError";
  }
}

export function isSeaweedfsConfigured(): boolean {
  return Boolean(
    process.env.SEAWEEDFS_S3_ENDPOINT?.trim() &&
      process.env.SEAWEEDFS_S3_ACCESS_KEY?.trim() &&
      process.env.SEAWEEDFS_S3_SECRET_KEY?.trim() &&
      process.env.SEAWEEDFS_S3_BUCKET?.trim()
  );
}

function requireConfig() {
  const endpoint = process.env.SEAWEEDFS_S3_ENDPOINT?.trim();
  const accessKeyId = process.env.SEAWEEDFS_S3_ACCESS_KEY?.trim();
  const secretAccessKey = process.env.SEAWEEDFS_S3_SECRET_KEY?.trim();
  const bucket = process.env.SEAWEEDFS_S3_BUCKET?.trim();
  const region = process.env.SEAWEEDFS_S3_REGION?.trim() || "us-east-1";

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new SeaweedfsNotConfiguredError();
  }

  return { endpoint, accessKeyId, secretAccessKey, bucket, region };
}

let cachedClient: S3Client | null = null;
let ensuredBucket: string | null = null;

export function getS3Bucket(): string {
  return requireConfig().bucket;
}

export function getS3Client(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  const { endpoint, accessKeyId, secretAccessKey, region } = requireConfig();

  cachedClient = new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    // SeaweedFS rejects AWS SDK v3 flexible checksums on browser presigned PUTs
    // (SignatureDoesNotMatch when x-amz-checksum-* query params are present).
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return cachedClient;
}

export function buildStorageKey(
  userId: string,
  fileId: string,
  name: string
): string {
  const sanitized = name
    .replace(/[/\\]/g, "_")
    .replace(/\0/g, "")
    .trim()
    .slice(0, 200);

  return `users/${userId}/${fileId}/${sanitized || "file"}`;
}

export async function ensureBucketExists(): Promise<void> {
  const bucket = getS3Bucket();
  if (ensuredBucket === bucket) {
    return;
  }

  const client = getS3Client();

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (error) {
      // Concurrent create or already exists
      const message = error instanceof Error ? error.message : String(error);
      if (!/BucketAlreadyOwnedByYou|BucketAlreadyExists|already/i.test(message)) {
        throw error;
      }
    }
  }

  ensuredBucket = bucket;
}

export async function putObject(params: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
}): Promise<void> {
  await ensureBucketExists();
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getS3Bucket(),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
}

export async function getObjectBytes(key: string): Promise<{
  body: Buffer;
  contentType?: string;
  contentLength?: number;
}> {
  const client = getS3Client();
  const result = await client.send(
    new GetObjectCommand({
      Bucket: getS3Bucket(),
      Key: key,
    })
  );

  const bytes = result.Body
    ? Buffer.from(await result.Body.transformToByteArray())
    : Buffer.alloc(0);

  return {
    body: bytes,
    contentType: result.ContentType,
    contentLength: result.ContentLength,
  };
}

export async function headObject(key: string): Promise<{
  contentLength: number;
  contentType?: string;
}> {
  const client = getS3Client();
  const result = await client.send(
    new HeadObjectCommand({
      Bucket: getS3Bucket(),
      Key: key,
    })
  );

  return {
    contentLength: result.ContentLength ?? 0,
    contentType: result.ContentType,
  };
}

export async function deleteObject(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getS3Bucket(),
      Key: key,
    })
  );
}

export async function createPresignedPutUrl(params: {
  key: string;
  contentType?: string;
  expiresIn?: number;
}): Promise<string> {
  await ensureBucketExists();
  // ContentType omitted from signed PutObject so browser Content-Type stays unsigned.
  // Flexible checksums disabled on S3Client (WHEN_REQUIRED) for SeaweedFS compatibility.
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: getS3Bucket(),
    Key: params.key,
  });

  return getSignedUrl(client, command, {
    expiresIn: params.expiresIn ?? PRESIGNED_URL_EXPIRES_SECONDS,
  });
}

export async function createPresignedGetUrl(params: {
  key: string;
  fileName?: string;
  expiresIn?: number;
}): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: getS3Bucket(),
    Key: params.key,
    ResponseContentDisposition: params.fileName
      ? `attachment; filename="${params.fileName.replace(/"/g, "")}"`
      : undefined,
  });

  return getSignedUrl(client, command, {
    expiresIn: params.expiresIn ?? PRESIGNED_URL_EXPIRES_SECONDS,
  });
}
