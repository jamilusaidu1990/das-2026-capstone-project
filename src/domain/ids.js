import { randomBytes, randomUUID } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newId() {
  return randomUUID();
}

export function newReference(length = 8) {
  const bytes = randomBytes(length);
  let code = '';

  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
  }

  return code;
}
