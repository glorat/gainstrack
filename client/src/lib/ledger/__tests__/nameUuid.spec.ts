import { ledgerIdForUid, md5, nameUuidFromString } from 'src/lib/ledger/nameUuid';

const hex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');

describe('md5 (RFC 1321 test suite)', () => {
  const VECTORS: [string, string][] = [
    ['', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['a', '0cc175b9c0f1b6a831c399e269772661'],
    ['abc', '900150983cd24fb0d6963f7d28e17f72'],
    ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
    ['abcdefghijklmnopqrstuvwxyz', 'c3fcd3d76192e4007dfb496cca67e13b'],
    ['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      'd174ab98d277d9f5a5611c2c9f419d9f'],
    ['12345678901234567890123456789012345678901234567890123456789012345678901234567890',
      '57edf4a22be3c955ac49da2e2107b67a'],
  ];

  for (const [input, expected] of VECTORS) {
    test(`"${input.slice(0, 24)}${input.length > 24 ? '…' : ''}"`, () => {
      expect(hex(md5(new TextEncoder().encode(input)))).toBe(expected);
    });
  }

  // Exercises the multi-block path and the 64-bit length field.
  test('long input spanning many blocks', () => {
    expect(hex(md5(new TextEncoder().encode('a'.repeat(1000))))).toBe('cabe45dcc9ae5b66ba86600cca6b8ba8');
  });

  // Length padding is a classic off-by-one: 55 fits with the 0x80 + length, 56 forces a new block.
  test('block boundary lengths 55/56/63/64', () => {
    const expectations: [number, string][] = [
      [55, 'ef1772b6dff9a122358552954ad0df65'],
      [56, '3b0c8ac703f828b04c6c197006d17218'],
      [63, 'b06521f39153d618550606be297466d5'],
      [64, '014842d480b571495a4a0363793f7367'],
    ];
    for (const [n, expected] of expectations) {
      expect(hex(md5(new TextEncoder().encode('a'.repeat(n))))).toBe(expected);
    }
  });

  test('handles non-ASCII via UTF-8 bytes', () => {
    expect(hex(md5(new TextEncoder().encode('héllo')))).toBe('be50e8478cf24ff3595bc7307fb91b50');
  });
});

describe('nameUuidFromString == Java UUID.nameUUIDFromBytes', () => {
  // Ground truth produced by running java.util.UUID.nameUUIDFromBytes on this machine.
  const VECTORS: [string, string][] = [
    ['', 'd41d8cd9-8f00-3204-a980-0998ecf8427e'],
    ['a', '0cc175b9-c0f1-36a8-b1c3-99e269772661'],
    ['abc', '90015098-3cd2-3fb0-9696-3f7d28e17f72'],
    ['glorat', 'f2c93a03-1199-3d33-ad8f-c7012f54cb5a'],
    ['ANONYMOUS.123e4567-e89b-12d3-a456-426614174000', '21c636c3-7050-3264-8a9c-1cd2de0f2569'],
    ['8xK2mQpZ9vNbR4tL', 'bade1d5f-e8ee-3448-b3b5-1baeeb2d26ee'],
    ['message digest', 'f96b697d-7cb7-338d-925a-2f31aaf161d0'],
    ['user@example.com', 'b58996c5-04c5-3387-98eb-6b511e6f49af'],
  ];

  for (const [input, expected] of VECTORS) {
    test(`"${input}"`, () => expect(nameUuidFromString(input)).toBe(expected));
  }

  test('always stamps version 3 and the IETF variant', () => {
    for (const s of ['', 'a', 'glorat', 'x'.repeat(200), 'user@example.com']) {
      const u = nameUuidFromString(s);
      expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-3[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });

  test('is NOT RFC-4122 v3 (which namespaces the hash) — regression guard', () => {
    // uuidv3('abc', DNS_NAMESPACE) would be 5bd670ce-…; Java hashes the bare bytes.
    expect(nameUuidFromString('abc')).toBe('90015098-3cd2-3fb0-9696-3f7d28e17f72');
  });

  test('ledgerIdForUid derives the ledger path from a raw Firebase uid', () => {
    expect(ledgerIdForUid('8xK2mQpZ9vNbR4tL')).toBe('bade1d5f-e8ee-3448-b3b5-1baeeb2d26ee');
  });
});
