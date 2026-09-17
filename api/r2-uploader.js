import crypto from 'node:crypto';

/**
 * Cloudflare R2 Uploader
 * Menggunakan AWS Signature Version 4 (SigV4) native dengan node:crypto
 * Tidak memerlukan package eksternal, sangat cepat dan kompatibel dengan Vercel & Vite.
 */

function getEnv(key, fallback = '') {
  return (process.env[key] || fallback).replace(/["']/g, '').trim();
}

export function isR2Configured() {
  return Boolean(
    getEnv('R2_ACCOUNT_ID') &&
    getEnv('R2_ACCESS_KEY_ID') &&
    getEnv('R2_SECRET_ACCESS_KEY')
  );
}

function hmac(key, string, encoding) {
  return crypto.createHmac('sha256', key).update(string).digest(encoding);
}

function sha256(stringOrBuffer) {
  return crypto.createHash('sha256').update(stringOrBuffer).digest('hex');
}

/**
 * Unggah Buffer biner langsung ke Cloudflare R2
 * @param {Object} params
 * @param {Buffer} params.buffer
 * @param {string} params.key Path/key file di bucket R2 (misal: 'avatars/123.webp')
 * @param {string} [params.contentType]
 * @returns {Promise<{ success: boolean, url: string, key: string }>}
 */
export async function uploadToR2({ buffer, key, contentType = 'image/png' }) {
  const accountId = getEnv('R2_ACCOUNT_ID');
  const accessKey = getEnv('R2_ACCESS_KEY_ID');
  const secretKey = getEnv('R2_SECRET_ACCESS_KEY');
  const bucketName = getEnv('R2_BUCKET_NAME', 'panenkunci');
  const publicUrl = getEnv('R2_PUBLIC_URL', 'https://media.panenkunci.com').replace(/\/+$/, '');

  if (!accountId || !accessKey || !secretKey) {
    throw new Error('Kredensial Cloudflare R2 belum lengkap di .env (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
  }

  const cleanKey = key.replace(/^\/+/, '');
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}/${bucketName}/${cleanKey.split('/').map(encodeURIComponent).join('/')}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  const payloadHash = sha256(buffer);

  // Canonical Headers (harus terurut abjad)
  const canonicalHeaders =
    `content-length:${buffer.length}\n` +
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = 'content-length;content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalUri = `/${bucketName}/${cleanKey.split('/').map(encodeURIComponent).join('/')}`;
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '', // canonical query string
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

  // Kalkulasi Signing Key AWS SigV4
  const kDate = hmac('AWS4' + secretKey, dateStamp);
  const kRegion = hmac(kDate, 'auto');
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = hmac(kSigning, stringToSign, 'hex');

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

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
    throw new Error(`R2 upload gagal (${res.status} ${res.statusText}): ${errText}`);
  }

  const finalPublicUrl = `${publicUrl}/${cleanKey}`;
  return {
    success: true,
    url: finalPublicUrl,
    key: cleanKey
  };
}

/**
 * Parsing data URL Base64 dan unggah ke folder R2
 * @param {Object} params
 * @param {string} params.base64Data Data URL (data:image/...;base64,...) atau raw base64 string
 * @param {string} [params.folder] Subfolder tujuan ('proofs', 'avatars', 'general')
 * @param {string} [params.fileName] Nama file spesifik opsional
 * @returns {Promise<{ success: boolean, url: string, key: string }>}
 */
export async function uploadBase64ToR2({ base64Data, folder = 'uploads', fileName = null }) {
  if (!base64Data || typeof base64Data !== 'string') {
    throw new Error('Data base64 tidak valid');
  }

  // Jika input sudah berupa URL http/https (bukan base64), kembalikan langsung
  if (/^https?:\/\//i.test(base64Data.trim())) {
    return {
      success: true,
      url: base64Data.trim(),
      key: ''
    };
  }

  let mimeType = 'image/png';
  let cleanBase64 = base64Data;

  const mimeMatch = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
  if (mimeMatch) {
    mimeType = mimeMatch[1].toLowerCase();
    cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
  }

  const extMap = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg'
  };
  const extension = extMap[mimeType] || 'png';

  const buffer = Buffer.from(cleanBase64, 'base64');
  if (!buffer || buffer.length === 0) {
    throw new Error('Buffer gambar kosong atau gagal didekode');
  }

  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'uploads';
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  
  let targetKey;
  if (fileName) {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    targetKey = `${safeFolder}/${cleanFileName}`;
  } else {
    targetKey = `${safeFolder}/${timestamp}_${randomSuffix}.${extension}`;
  }

  return await uploadToR2({
    buffer,
    key: targetKey,
    contentType: mimeType
  });
}
