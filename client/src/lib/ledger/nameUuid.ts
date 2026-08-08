// Java-compatible `UUID.nameUUIDFromBytes` for the browser.
//
// The Scala server derives a user's ledger path from their login identifier:
//   GUser(username) => UUID.nameUUIDFromBytes(username.getBytes("UTF-8"))
// (SimpleAuthStrategy.scala). For OAuthStrategy the username IS the verified Firebase uid, so the
// client can compute the same path without asking the server.
//
// NOTE: this is NOT RFC-4122 v3. RFC v3 hashes `namespace || name`; Java hashes the name bytes
// alone, then stamps the version/variant nibbles. The `uuid` package's v3 would give a different
// answer, which is why this is hand-rolled rather than a dependency.
//
// MD5 is used here purely as an addressing function inherited from the server. It carries no
// security property and must not be treated as one.

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

// K[i] = floor(abs(sin(i + 1)) * 2^32)
const K = new Uint32Array(64);
for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);

function rotl(x: number, c: number): number {
  return (x << c) | (x >>> (32 - c));
}

/** RFC 1321 MD5. Returns the 16-byte digest. */
export function md5(input: Uint8Array): Uint8Array {
  const len = input.length;
  // Pad to a multiple of 64: 0x80, zeros, then the bit length as LE u64.
  const padded = new Uint8Array((((len + 8) >> 6) + 1) << 6);
  padded.set(input);
  padded[len] = 0x80;
  const bitLen = len * 8;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLen >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bitLen / 4294967296), true);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const M = new Uint32Array(16);

  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    for (let j = 0; j < 16; j++) M[j] = view.getUint32(chunk + j * 4, true);
    let A = a0, B = b0, C = c0, D = d0;

    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }

      F = (F + A + K[i] + M[g]) | 0;
      A = D; D = C; C = B;
      B = (B + rotl(F, S[i])) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }

  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  ov.setUint32(0, a0 >>> 0, true);
  ov.setUint32(4, b0 >>> 0, true);
  ov.setUint32(8, c0 >>> 0, true);
  ov.setUint32(12, d0 >>> 0, true);
  return out;
}

function hex(b: number): string {
  return b.toString(16).padStart(2, '0');
}

/**
 * Byte-for-byte equivalent of Java's `UUID.nameUUIDFromBytes(name.getBytes("UTF-8"))`.
 * This is the ledger's Firestore document id — see docs/firestore-persistence.md §3.
 */
export function nameUuidFromString(name: string): string {
  const digest = md5(new TextEncoder().encode(name));
  digest[6] = (digest[6] & 0x0f) | 0x30; // version 3
  digest[8] = (digest[8] & 0x3f) | 0x80; // IETF variant
  const h = Array.from(digest, hex).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** The ledger document id for a signed-in user, given their raw Firebase uid. */
export function ledgerIdForUid(firebaseUid: string): string {
  return nameUuidFromString(firebaseUid);
}
