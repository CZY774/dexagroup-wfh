import { createHash, createHmac } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';

export type ProofObject = {
  key: string;
  body: Buffer;
  mimeType: string;
};

export type ProofStorage = {
  put(object: ProofObject): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
};

export function createProofStorage(environment: Record<string, string | undefined> = process.env): ProofStorage {
  const driver = environment.PROOF_STORAGE_DRIVER?.trim().toLowerCase() || 'local';
  if (driver === 's3') {
    return new S3ProofStorage(environment);
  }

  return new LocalProofStorage(environment.UPLOAD_DIR ?? 'uploads/attendance');
}

class LocalProofStorage implements ProofStorage {
  constructor(private readonly uploadRoot: string) {}

  async put(object: ProofObject): Promise<void> {
    const absolutePath = path.join(this.uploadRoot, object.key);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, object.body, { flag: 'wx' });
  }

  async get(key: string): Promise<Buffer> {
    return readFile(path.join(this.uploadRoot, key));
  }

  async delete(key: string): Promise<void> {
    await unlink(path.join(this.uploadRoot, key)).catch(() => undefined);
  }
}

class S3ProofStorage implements ProofStorage {
  private readonly endpoint: URL;
  private readonly bucket: string;
  private readonly region: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly keyPrefix: string;
  private readonly forcePathStyle: boolean;

  constructor(environment: Record<string, string | undefined>) {
    this.endpoint = new URL(required(environment.S3_ENDPOINT, 'S3_ENDPOINT'));
    this.bucket = required(environment.S3_BUCKET, 'S3_BUCKET');
    this.region = environment.S3_REGION?.trim() || environment.AWS_REGION?.trim() || 'us-east-1';
    this.accessKeyId = required(environment.S3_ACCESS_KEY_ID ?? environment.AWS_ACCESS_KEY_ID, 'S3_ACCESS_KEY_ID');
    this.secretAccessKey = required(environment.S3_SECRET_ACCESS_KEY ?? environment.AWS_SECRET_ACCESS_KEY, 'S3_SECRET_ACCESS_KEY');
    this.keyPrefix = normalizeKeyPrefix(environment.S3_KEY_PREFIX);
    this.forcePathStyle = resolveBoolean(environment.S3_FORCE_PATH_STYLE, true);
  }

  async put(object: ProofObject): Promise<void> {
    await this.signedFetch('PUT', object.key, object.body, object.mimeType);
  }

  async get(key: string): Promise<Buffer> {
    const response = await this.signedFetch('GET', key);
    return Buffer.from(await response.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    await this.signedFetch('DELETE', key);
  }

  private async signedFetch(method: 'GET' | 'PUT' | 'DELETE', key: string, body?: Buffer, mimeType?: string): Promise<Response> {
    const objectKey = `${this.keyPrefix}${key}`;
    const payload = body ?? Buffer.alloc(0);
    const payloadHash = sha256Hex(payload);
    const now = new Date();
    const amzDate = toAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const url = this.objectUrl(objectKey);
    const canonicalUri = this.canonicalUri(objectKey);

    const headers: Record<string, string> = {
      host: url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };

    if (mimeType) {
      headers['content-type'] = mimeType;
    }

    const signedHeaders = Object.keys(headers).sort().join(';');
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((name) => `${name}:${headers[name]}\n`)
      .join('');
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const canonicalRequest = [
      method,
      canonicalUri,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n');
    const signature = hmacHex(signingKey(this.secretAccessKey, dateStamp, this.region), stringToSign);
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(url, {
      method,
      headers: {
        ...(mimeType ? { 'content-type': mimeType } : {}),
        authorization,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
      },
      body: toFetchBody(body),
    });

    if (!response.ok) {
      throw new Error(`Proof storage ${method} failed with status ${response.status}.`);
    }

    return response;
  }

  private canonicalUri(key: string): string {
    const segments = this.forcePathStyle ? [this.bucket, ...key.split('/')] : key.split('/');
    return `/${segments
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/')}`;
  }

  private objectUrl(key: string): URL {
    if (this.forcePathStyle) {
      return new URL(`${this.endpoint.origin}${this.canonicalUri(key)}`);
    }

    const host = `${this.bucket}.${this.endpoint.host}`;
    return new URL(`${this.endpoint.protocol}//${host}${this.canonicalUri(key)}`);
  }
}

function required(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${name} is required when PROOF_STORAGE_DRIVER=s3.`);
  }

  return normalized;
}

function normalizeKeyPrefix(value: string | undefined): string {
  const normalized = value?.trim().replace(/^\/+|\/+$/g, '');
  return normalized ? `${normalized}/` : '';
}

function resolveBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function sha256Hex(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function toFetchBody(value: Buffer | undefined): ArrayBuffer | undefined {
  if (!value) {
    return undefined;
  }

  const body = new ArrayBuffer(value.byteLength);
  new Uint8Array(body).set(value);
  return body;
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest();
}

function hmacHex(key: Buffer | string, value: string): string {
  return createHmac('sha256', key).update(value).digest('hex');
}

function signingKey(secret: string, dateStamp: string, region: string): Buffer {
  const dateKey = hmac(`AWS4${secret}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
}

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}
