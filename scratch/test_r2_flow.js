import fs from 'node:fs';
import path from 'node:path';
import { uploadBase64ToR2 } from '../api/r2-uploader.js';

// Load .env
const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*["']?(.*?)["']?\s*$/);
  if (match) {
    process.env[match[1]] = match[2];
  }
});

async function testFullFlow() {
  console.log('=== Test R2 Upload Flow ===');
  
  // 1. Test upload avatar
  const sampleAvatarBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  console.log('1. Uploading avatar...');
  const avatarRes = await uploadBase64ToR2({
    base64Data: sampleAvatarBase64,
    folder: 'avatars',
    fileName: `avatar_usr_test_${Date.now()}.png`
  });
  console.log('Avatar upload result:', avatarRes);

  // 2. Test upload proof
  const sampleProofBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNkYPj/HwADBwGAEDp3mQAAAABJRU5ErkJggg==';
  console.log('2. Uploading withdrawal proof...');
  const proofRes = await uploadBase64ToR2({
    base64Data: sampleProofBase64,
    folder: 'proofs',
    fileName: `proof_tx_test_${Date.now()}.png`
  });
  console.log('Proof upload result:', proofRes);

  // 3. Test HTTP fetching from media.panenkunci.com
  console.log('3. Verifying CDN HTTP status...');
  const headAvatar = await fetch(avatarRes.url, { method: 'HEAD' });
  console.log('Avatar CDN status:', headAvatar.status, headAvatar.statusText);

  const headProof = await fetch(proofRes.url, { method: 'HEAD' });
  console.log('Proof CDN status:', headProof.status, headProof.statusText);

  if (headAvatar.ok && headProof.ok) {
    console.log('ALL R2 TESTS PASSED SUCCESSFULLY!');
  } else {
    throw new Error('CDN status check failed');
  }
}

testFullFlow().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
