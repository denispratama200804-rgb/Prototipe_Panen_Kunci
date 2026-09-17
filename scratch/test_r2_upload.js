import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Baca .env manual untuk test
const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*["']?(.*?)["']?\s*$/);
  if (match) {
    env[match[1]] = match[2];
  }
});

const accountId = env.R2_ACCOUNT_ID;
const accessKey = env.R2_ACCESS_KEY_ID;
const secretKey = env.R2_SECRET_ACCESS_KEY;
const bucketName = env.R2_BUCKET_NAME || 'panenkunci';
const publicUrl = (env.R2_PUBLIC_URL || 'https://media.panenkunci.com').replace(/\/+$/, '');

console.log('Testing R2 Config:');
console.log('Account ID:', accountId);
console.log('Access Key:', accessKey ? accessKey.slice(0, 8) + '...' : 'NONE');
console.log('Bucket:', bucketName);
console.log('Public URL:', publicUrl);

function hmac(key, string, encoding) {
  return crypto.createHmac('sha256', key).update(string).digest(encoding);
}

function sha256(stringOrBuffer) {
  return crypto.createHash('sha256').update(stringOrBuffer).digest('hex');
}

async function uploadToR2({ buffer, key, contentType = 'image/png' }) {
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}/${bucketName}/${key.split('/').map(encodeURIComponent).join('/')}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  const payloadHash = sha256(buffer);

  // Canonical Headers
  const canonicalHeaders = 
    `content-length:${buffer.length}\n` +
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = 'content-length;content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalUri = `/${bucketName}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '', // query string
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join('\n');

  const kDate = hmac('AWS4' + secretKey, dateStamp);
  const kRegion = hmac(kDate, 'auto');
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = hmac(kSigning, stringToSign, 'hex');

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  console.log('Sending PUT to:', endpoint);

  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Host': host,
      'Content-Type': contentType,
      'Content-Length': String(buffer.length),
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'Authorization': authHeader
    },
    body: buffer
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`R2 upload failed (${res.status} ${res.statusText}): ${errText}`);
  }

  const fileUrl = `${publicUrl}/${key}`;
  return { success: true, url: fileUrl, key };
}

async function run() {
  try {
    // 1x1 transparent PNG buffer
    const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const testKey = `test/ping_${Date.now()}.png`;

    const result = await uploadToR2({
      buffer: testBuffer,
      key: testKey,
      contentType: 'image/png'
    });

    console.log('Upload success!', result);

    // Verify public URL
    console.log('Verifying public URL:', result.url);
    const pubRes = await fetch(result.url, { method: 'HEAD' });
    console.log('Public URL status:', pubRes.status, pubRes.statusText);
  } catch (err) {
    console.error('Test error:', err);
  }
}

run();
