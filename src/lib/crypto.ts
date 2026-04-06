// src/lib/crypto.ts
// HIPAA 164.312(a)(2)(iv): Encryption of stored ePHI (integration credentials)
// This module runs SERVER-SIDE ONLY. Never import in browser-executed code.

import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
// ENCRYPTION_KEY must be a 64-character hex string (32 bytes)
// Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')

if (KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)')
}

export function encryptCredentials(plaintext: string): string {
  const iv = randomBytes(12) // 96-bit IV for GCM mode
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag() // 128-bit GCM authentication tag
  // Store as: base64(iv):base64(authTag):base64(ciphertext)
  return [iv, authTag, encrypted]
    .map((b) => b.toString('base64'))
    .join(':')
}

export function decryptCredentials(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(':')
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(data) + decipher.final('utf8')
}

export function hashEvidence(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex')
}
