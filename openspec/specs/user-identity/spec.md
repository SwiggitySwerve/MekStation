# User Identity Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-02-13
**Dependencies**: None (foundation)
**Affects**: vault-sync, contacts-system, unit-sharing

---

## Overview

### Purpose

The User Identity system provides cryptographic identity management for vault users, enabling secure peer-to-peer sharing, authentication, and content signing through Ed25519 keypairs and human-friendly friend codes.

### Scope

**In Scope:**

- Ed25519 keypair generation and storage
- Friend code encoding/decoding (16-character format)
- Password-based private key encryption (AES-GCM-256)
- Identity persistence to SQLite database
- Public identity extraction and verification
- Identity creation, retrieval, and updates

**Out of Scope:**

- Multi-identity management (single active identity per user)
- Identity recovery mechanisms
- Identity revocation or expiration
- Cross-device identity synchronization
- Zero-knowledge client-side decryption (future phase)

### Key Concepts

- **Identity**: A cryptographic identity consisting of an Ed25519 keypair, display name, and friend code
- **Friend Code**: A 16-character human-friendly code (format: XXXX-XXXX-XXXX-XXXX) derived from the first 10 bytes of the public key
- **Stored Identity**: Persisted identity with encrypted private key (at rest)
- **Unlocked Identity**: In-memory identity with decrypted private key (for signing operations)
- **Public Identity**: Shareable subset of identity (display name, public key, friend code, avatar)

---

## Requirements

### Requirement: Identity Generation

The system SHALL generate cryptographically secure Ed25519 keypairs for new vault identities.

**Rationale**: Ed25519 provides strong cryptographic signatures for content authentication and peer verification.

**Priority**: Critical

#### Scenario: Create new identity

**GIVEN** a user has no existing identity
**WHEN** they provide a display name and password
**THEN** a new Ed25519 keypair is generated
**AND** the private key is encrypted with AES-GCM-256 using the password
**AND** a friend code is derived from the public key
**AND** the identity is persisted to the database
**AND** the identity is marked as active

#### Scenario: Reject duplicate identity

**GIVEN** a user already has an identity
**WHEN** they attempt to create a new identity
**THEN** the system returns a 409 Conflict error
**AND** the error message indicates identity already exists

#### Scenario: Validate display name

**GIVEN** a user attempts to create an identity
**WHEN** the display name is empty or exceeds 100 characters
**THEN** the system returns a 400 Bad Request error
**AND** the error message indicates the validation failure

#### Scenario: Validate password strength

**GIVEN** a user attempts to create an identity
**WHEN** the password is less than 8 characters
**THEN** the system returns a 400 Bad Request error
**AND** the error message requires at least 8 characters

### Requirement: Friend Code Format

The system SHALL encode public keys as 16-character friend codes using an unambiguous alphabet.

**Rationale**: Friend codes provide a human-friendly way to share identities without exposing raw public keys.

**Priority**: Critical

#### Scenario: Encode friend code

**GIVEN** a generated Ed25519 public key
**WHEN** the friend code is generated
**THEN** the first 10 bytes (80 bits) of the public key are encoded
**AND** the result is a 16-character string from the alphabet ABCDEFGHJKLMNPQRSTUVWXYZ23456789
**AND** the characters are grouped as XXXX-XXXX-XXXX-XXXX with dashes

#### Scenario: Decode friend code

**GIVEN** a valid friend code (e.g., "ABCD-EFGH-JKLM-NPQR")
**WHEN** the friend code is decoded
**THEN** the system returns the 10-byte public key prefix
**AND** the prefix can be used to match against full public keys

#### Scenario: Validate friend code format

**GIVEN** a friend code string
**WHEN** validation is performed
**THEN** the system accepts only 16 characters from the valid alphabet
**AND** the system accepts dashes in positions 4, 9, and 14
**AND** the system rejects codes with invalid characters (I, O, 0, 1)

#### Scenario: Match friend code to public key

**GIVEN** a friend code and a public key
**WHEN** verification is performed
**THEN** the system decodes the friend code to a 10-byte prefix
**AND** compares the prefix to the first 10 bytes of the public key
**AND** returns true if they match exactly

### Requirement: Private Key Encryption

The system SHALL encrypt private keys at rest using password-derived AES-GCM-256 encryption.

**Rationale**: Private keys must never be stored in plaintext to prevent unauthorized signing.

**Priority**: Critical

#### Scenario: Encrypt private key

**GIVEN** a generated Ed25519 private key and user password
**WHEN** the private key is encrypted
**THEN** a random 16-byte salt is generated
**AND** a random 12-byte IV is generated
**AND** an AES-256 key is derived using PBKDF2 with 100,000 iterations
**AND** the private key is encrypted using AES-GCM
**AND** the result includes ciphertext, IV, salt, and algorithm identifier

#### Scenario: Decrypt private key

**GIVEN** an encrypted private key and correct password
**WHEN** the private key is decrypted
**THEN** the AES key is re-derived using the stored salt
**AND** the ciphertext is decrypted using AES-GCM
**AND** the original private key bytes are returned

#### Scenario: Reject incorrect password

**GIVEN** an encrypted private key and incorrect password
**WHEN** decryption is attempted
**THEN** the AES-GCM decryption fails
**AND** an error is thrown indicating authentication failure

### Requirement: Identity Persistence

The system SHALL persist identities to a SQLite database with proper indexing.

**Rationale**: Identities must survive application restarts and be efficiently queryable.

**Priority**: Critical

#### Scenario: Save new identity

**GIVEN** a newly created identity
**WHEN** the identity is saved
**THEN** a row is inserted into the vault_identities table
**AND** the row includes id, display_name, public_key, encrypted_private_key, friend_code, created_at, avatar, is_active
**AND** the is_active flag is set to 1
**AND** the friend_code column has a unique index

#### Scenario: Retrieve active identity

**GIVEN** a saved identity marked as active
**WHEN** the active identity is requested
**THEN** the system queries for is_active = 1
**AND** returns the stored identity with encrypted private key
**AND** returns null if no active identity exists

#### Scenario: Query by friend code

**GIVEN** a saved identity with friend code "ABCD-EFGH-JKLM-NPQR"
**WHEN** the identity is queried by friend code
**THEN** the system uses the friend_code index
**AND** performs a case-insensitive match
**AND** returns the matching identity or null

#### Scenario: Update identity metadata

**GIVEN** an existing identity
**WHEN** the display name or avatar is updated
**THEN** the system updates only the specified fields
**AND** the encrypted private key remains unchanged
**AND** the friend code remains unchanged

### Requirement: Public Identity Extraction

The system SHALL provide safe public identity views that exclude private keys.

**Rationale**: Public identities can be shared with peers without exposing sensitive cryptographic material.

**Priority**: High

#### Scenario: Extract public identity

**GIVEN** a full vault identity with private key
**WHEN** the public identity is extracted
**THEN** the result includes displayName, publicKey, friendCode, and avatar
**AND** the result excludes privateKey and encryptedPrivateKey
**AND** the result excludes the internal id

#### Scenario: API response excludes private key

**GIVEN** a GET request to /api/vault/identity
**WHEN** an identity exists
**THEN** the response includes hasIdentity: true
**AND** the response includes publicIdentity with displayName, publicKey, friendCode, avatar
**AND** the raw response JSON does not contain "privateKey" or "encryptedPrivateKey"

### Requirement: Identity Verification

The system SHALL verify that friend codes match their corresponding public keys.

**Rationale**: Ensures integrity of identity data and detects corruption or tampering.

**Priority**: High

#### Scenario: Verify valid identity

**GIVEN** a public identity with friend code and public key
**WHEN** verification is performed
**THEN** the friend code is decoded to a 10-byte prefix
**AND** the prefix matches the first 10 bytes of the public key
**AND** verification returns true

#### Scenario: Detect corrupted identity

**GIVEN** a public identity with mismatched friend code and public key
**WHEN** verification is performed
**THEN** the decoded prefix does not match the public key
**AND** verification returns false

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript interfaces:

```typescript
/**
 * Cryptographic identity for a vault user
 */
interface IVaultIdentity {
  /** Unique identifier for this identity */
  readonly id: string;

  /** Human-readable display name (1-100 characters) */
  readonly displayName: string;

  /** Ed25519 public key (base64 encoded) */
  readonly publicKey: string;

  /** Ed25519 private key (base64 encoded, decrypted in memory) */
  readonly privateKey: string;

  /** Friend code derived from public key (XXXX-XXXX-XXXX-XXXX) */
  readonly friendCode: string;

  /** ISO 8601 timestamp of identity creation */
  readonly createdAt: string;

  /** Optional avatar/icon identifier */
  readonly avatar?: string;
}

/**
 * Public-only view of an identity (safe to share)
 */
interface IPublicIdentity {
  /** Display name */
  readonly displayName: string;

  /** Ed25519 public key (base64 encoded) */
  readonly publicKey: string;

  /** Friend code */
  readonly friendCode: string;

  /** Optional avatar */
  readonly avatar?: string;
}

/**
 * Identity storage format (persisted to database)
 */
interface IStoredIdentity {
  /** Identity ID (UUID v4) */
  readonly id: string;

  /** Display name */
  readonly displayName: string;

  /** Public key (base64, unencrypted) */
  readonly publicKey: string;

  /** Private key (encrypted with password) */
  readonly encryptedPrivateKey: IEncryptedData;

  /** Friend code */
  readonly friendCode: string;

  /** ISO 8601 creation timestamp */
  readonly createdAt: string;

  /** Optional avatar */
  readonly avatar?: string;
}

/**
 * Encrypted data wrapper for sensitive information
 */
interface IEncryptedData {
  /** Encrypted data (base64) */
  readonly ciphertext: string;

  /** Initialization vector (base64) */
  readonly iv: string;

  /** Salt used for key derivation (base64) */
  readonly salt: string;

  /** Algorithm identifier */
  readonly algorithm: 'AES-GCM-256';
}

/**
 * Ed25519 keypair (raw bytes)
 */
interface IKeyPair {
  /** Ed25519 public key as Uint8Array */
  readonly publicKey: Uint8Array;

  /** Ed25519 private key as Uint8Array (PKCS8 format) */
  readonly privateKey: Uint8Array;
}
```

### Required Properties

| Property              | Type             | Required | Description                    | Valid Values                              | Default |
| --------------------- | ---------------- | -------- | ------------------------------ | ----------------------------------------- | ------- |
| `id`                  | `string`         | Yes      | Unique identity identifier     | UUID v4                                   | -       |
| `displayName`         | `string`         | Yes      | User's display name            | 1-100 characters, trimmed                 | -       |
| `publicKey`           | `string`         | Yes      | Ed25519 public key             | Base64-encoded, 32 bytes                  | -       |
| `privateKey`          | `string`         | Yes      | Ed25519 private key (unlocked) | Base64-encoded, PKCS8 format              | -       |
| `encryptedPrivateKey` | `IEncryptedData` | Yes      | Encrypted private key (stored) | AES-GCM-256 encrypted                     | -       |
| `friendCode`          | `string`         | Yes      | Human-friendly identity code   | 16 chars + 3 dashes (XXXX-XXXX-XXXX-XXXX) | -       |
| `createdAt`           | `string`         | Yes      | Creation timestamp             | ISO 8601 format                           | -       |
| `avatar`              | `string`         | No       | Avatar identifier              | Any string                                | -       |
| `ciphertext`          | `string`         | Yes      | Encrypted data                 | Base64-encoded                            | -       |
| `iv`                  | `string`         | Yes      | Initialization vector          | Base64-encoded, 12 bytes                  | -       |
| `salt`                | `string`         | Yes      | PBKDF2 salt                    | Base64-encoded, 16 bytes                  | -       |
| `algorithm`           | `'AES-GCM-256'`  | Yes      | Encryption algorithm           | Literal 'AES-GCM-256'                     | -       |

### Type Constraints

- `id` MUST be a valid UUID v4
- `displayName` MUST be trimmed and between 1-100 characters
- `publicKey` MUST be a valid base64-encoded 32-byte Ed25519 public key
- `privateKey` MUST be a valid base64-encoded Ed25519 private key in PKCS8 format
- `friendCode` MUST match the pattern `^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$`
- `createdAt` MUST be a valid ISO 8601 timestamp
- `ciphertext`, `iv`, `salt` MUST be valid base64 strings
- `algorithm` MUST be the literal string 'AES-GCM-256'

---

## Cryptographic Specifications

### Ed25519 Keypair Generation

**Algorithm**: Ed25519 (RFC 8032)

**Implementation**: Web Crypto API (browser) or Node.js crypto.webcrypto

**Key Format**:

- Public key: Raw format (32 bytes)
- Private key: PKCS8 format (exportable)

**Example**:

```typescript
const keyPair = await crypto.subtle.generateKey(
  { name: 'Ed25519' },
  true, // extractable
  ['sign', 'verify'],
);
```

### Friend Code Encoding

**Algorithm**: Base-N encoding with custom alphabet

**Alphabet**: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 characters, excludes I, O, 0, 1)

**Input**: First 10 bytes of Ed25519 public key (80 bits)

**Output**: 16 characters grouped as XXXX-XXXX-XXXX-XXXX

**Encoding Process**:

1. Extract first 10 bytes of public key
2. Convert to BigInt (80-bit value)
3. Perform base-32 conversion using custom alphabet
4. Pad to 16 characters
5. Insert dashes at positions 4, 9, 14

**Example**:

```
Public Key (first 10 bytes): 0x1A2B3C4D5E6F7A8B9C0D
BigInt: 117835012614688331932685
Base-32: ABCDEFGHJKLMNPQR
Formatted: ABCD-EFGH-JKLM-NPQR
```

### Password-Based Encryption

**Key Derivation**: PBKDF2-SHA256

**Parameters**:

- Iterations: 100,000
- Salt: 16 bytes (random)
- Output: 256-bit AES key

**Encryption**: AES-GCM-256

**Parameters**:

- IV: 12 bytes (random)
- Tag length: 128 bits (default)

**Example**:

```typescript
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));

const key = await crypto.subtle.deriveKey(
  {
    name: 'PBKDF2',
    salt,
    iterations: 100000,
    hash: 'SHA-256',
  },
  baseKey,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt', 'decrypt'],
);

const ciphertext = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  privateKeyBytes,
);
```

---

## Database Schema

### Table: vault_identities

```sql
CREATE TABLE vault_identities (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  public_key TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  friend_code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  avatar TEXT,
  is_active INTEGER DEFAULT 0
);

CREATE INDEX idx_vault_identities_friend_code
  ON vault_identities(friend_code);
```

**Columns**:

- `id`: UUID v4 primary key
- `display_name`: User's display name (1-100 characters)
- `public_key`: Base64-encoded Ed25519 public key
- `encrypted_private_key`: JSON-stringified IEncryptedData object
- `friend_code`: Unique friend code (indexed)
- `created_at`: ISO 8601 timestamp
- `avatar`: Optional avatar identifier
- `is_active`: Boolean flag (0 or 1) indicating active identity

**Constraints**:

- `friend_code` UNIQUE ensures no duplicate friend codes
- Only one identity should have `is_active = 1` at a time

---

## API Endpoints

### GET /api/vault/identity

Check if identity exists and retrieve public information.

**Response (no identity)**:

```json
{
  "hasIdentity": false,
  "publicIdentity": null
}
```

**Response (identity exists)**:

```json
{
  "hasIdentity": true,
  "publicIdentity": {
    "displayName": "TestUser",
    "publicKey": "dGVzdC1wdWJsaWMta2V5",
    "friendCode": "ABCD-EFGH-JKLM-NPQR",
    "avatar": "avatar-id-123"
  }
}
```

### POST /api/vault/identity

Create a new identity.

**Request Body**:

```json
{
  "displayName": "TestUser",
  "password": "securePassword123"
}
```

**Response (201 Created)**:

```json
{
  "success": true,
  "publicIdentity": {
    "displayName": "TestUser",
    "publicKey": "dGVzdC1wdWJsaWMta2V5",
    "friendCode": "ABCD-EFGH-JKLM-NPQR"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Invalid display name or password
- `409 Conflict`: Identity already exists

### PATCH /api/vault/identity

Update identity metadata (display name or avatar).

**Request Body**:

```json
{
  "displayName": "UpdatedName",
  "avatar": "new-avatar-id"
}
```

**Response (200 OK)**:

```json
{
  "success": true
}
```

**Error Responses**:

- `400 Bad Request`: Invalid display name
- `404 Not Found`: No active identity

---

## Validation Rules

### Validation: Display Name

**Rule**: Display name MUST be 1-100 characters after trimming.

**Implementation**:

```typescript
const trimmed = displayName.trim();
if (trimmed.length === 0) {
  throw new Error('Display name cannot be empty');
}
if (trimmed.length > 100) {
  throw new Error('Display name too long (max 100 characters)');
}
```

**Error Messages**:

- Empty: "Display name cannot be empty"
- Too long: "Display name too long (max 100 characters)"

### Validation: Password Strength

**Rule**: Password MUST be at least 8 characters.

**Implementation**:

```typescript
if (password.length < 8) {
  throw new Error('Password must be at least 8 characters');
}
```

**Error Message**: "Password must be at least 8 characters"

### Validation: Friend Code Format

**Rule**: Friend code MUST match the pattern `^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$`

**Implementation**:

```typescript
const pattern =
  /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/i;
if (!pattern.test(friendCode)) {
  throw new Error('Invalid friend code format');
}
```

**Error Message**: "Invalid friend code format"

### Validation: Public Key Integrity

**Rule**: Friend code MUST match the first 10 bytes of the public key.

**Implementation**:

```typescript
const decoded = decodeFriendCode(friendCode);
const prefix = publicKey.slice(0, 10);
if (!arraysEqual(decoded, prefix)) {
  throw new Error('Friend code does not match public key');
}
```

**Error Message**: "Friend code does not match public key"

---

## Implementation Notes

### Security Considerations

1. **Private Key Storage**: Private keys are NEVER stored in plaintext. Always encrypted with AES-GCM-256.
2. **Password Handling**: Passwords are never logged or persisted. Only used for key derivation.
3. **PBKDF2 Iterations**: 100,000 iterations balances security and performance (OWASP recommendation).
4. **Random Generation**: Use cryptographically secure random number generators (crypto.getRandomValues).
5. **Friend Code Alphabet**: Excludes ambiguous characters (I/1, O/0) to prevent user confusion.

### Performance Considerations

1. **PBKDF2 Cost**: 100,000 iterations takes ~100ms on modern hardware. Acceptable for infrequent operations (identity creation, unlock).
2. **Database Indexing**: Friend code index enables fast lookups for peer discovery.
3. **Singleton Pattern**: IdentityRepository uses singleton pattern to avoid repeated initialization.

### Edge Cases

1. **Concurrent Identity Creation**: Database UNIQUE constraint on friend_code prevents duplicates (astronomically unlikely with 80-bit entropy).
2. **Password Change**: Not supported in v1.0. Requires re-encrypting private key with new password.
3. **Identity Deletion**: Deleting an identity is permanent. No recovery mechanism.
4. **Friend Code Collisions**: With 80 bits of entropy (2^80 ≈ 1.2 × 10^24 possibilities), collisions are effectively impossible.

### Browser vs Node.js

1. **Crypto API**: Use Web Crypto API in browser, Node.js crypto.webcrypto in server.
2. **Base64 Encoding**: Use Buffer in Node.js, btoa/atob in browser.
3. **Type Assertions**: Node.js webcrypto types differ slightly from browser Crypto type. Use type assertions where necessary.

---

## Examples

### Creating an Identity

```typescript
import { createIdentity } from '@/services/vault/IdentityService';
import { getIdentityRepository } from '@/services/vault/IdentityRepository';

// Create new identity
const stored = await createIdentity('TestUser', 'securePassword123');

// Save to database
const repository = getIdentityRepository();
await repository.save(stored);

// Result:
// {
//   id: 'uuid-v4',
//   displayName: 'TestUser',
//   publicKey: 'base64-encoded-public-key',
//   encryptedPrivateKey: {
//     ciphertext: 'base64-encrypted-data',
//     iv: 'base64-iv',
//     salt: 'base64-salt',
//     algorithm: 'AES-GCM-256'
//   },
//   friendCode: 'ABCD-EFGH-JKLM-NPQR',
//   createdAt: '2024-01-01T00:00:00.000Z'
// }
```

### Unlocking an Identity

```typescript
import { unlockIdentity } from '@/services/vault/IdentityService';
import { getIdentityRepository } from '@/services/vault/IdentityRepository';

// Retrieve stored identity
const repository = getIdentityRepository();
const stored = await repository.getActive();

// Unlock with password
const unlocked = await unlockIdentity(stored, 'securePassword123');

// Result:
// {
//   id: 'uuid-v4',
//   displayName: 'TestUser',
//   publicKey: 'base64-encoded-public-key',
//   privateKey: 'base64-encoded-private-key', // DECRYPTED
//   friendCode: 'ABCD-EFGH-JKLM-NPQR',
//   createdAt: '2024-01-01T00:00:00.000Z'
// }
```

### Extracting Public Identity

```typescript
import { getPublicIdentity } from '@/services/vault/IdentityService';

const publicIdentity = getPublicIdentity(unlocked);

// Result:
// {
//   displayName: 'TestUser',
//   publicKey: 'base64-encoded-public-key',
//   friendCode: 'ABCD-EFGH-JKLM-NPQR'
// }
// (privateKey excluded)
```

### Verifying Friend Code

```typescript
import { verifyIdentityFriendCode } from '@/services/vault/IdentityService';

const isValid = verifyIdentityFriendCode(publicIdentity);
// Returns: true (friend code matches public key)
```

### Encoding/Decoding Friend Codes

```typescript
import { encodeFriendCode, decodeFriendCode, friendCodeMatchesPublicKey } from '@/services/vault/IdentityService';

// Encode public key to friend code
const publicKeyBytes = new Uint8Array([0x1A, 0x2B, 0x3C, ...]);
const friendCode = encodeFriendCode(publicKeyBytes);
// Result: "ABCD-EFGH-JKLM-NPQR"

// Decode friend code to public key prefix
const prefix = decodeFriendCode('ABCD-EFGH-JKLM-NPQR');
// Result: Uint8Array([0x1A, 0x2B, 0x3C, ...]) (first 10 bytes)

// Verify match
const matches = friendCodeMatchesPublicKey('ABCD-EFGH-JKLM-NPQR', publicKeyBytes);
// Result: true
```

---

## References

### Official Standards

- **Ed25519**: RFC 8032 - Edwards-Curve Digital Signature Algorithm (EdDSA)
- **AES-GCM**: NIST SP 800-38D - Galois/Counter Mode
- **PBKDF2**: RFC 8018 - Password-Based Cryptography Specification
- **Web Crypto API**: W3C Recommendation

### Related Specifications

- `vault-sync` - Uses identities for peer authentication
- `contacts-system` - Uses friend codes for contact discovery
- `unit-sharing` - Uses identities for content signing

### Implementation Files

- `src/services/vault/IdentityService.ts` - Core identity operations
- `src/services/vault/IdentityRepository.ts` - Database persistence
- `src/pages/api/vault/identity/index.ts` - API endpoints
- `src/types/vault/VaultInterfaces.ts` - TypeScript interfaces
- `src/__tests__/api/vault/identity.test.ts` - API tests
- `src/__tests__/services/vault/IdentityService.test.ts` - Service tests

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial specification
- Ed25519 keypair generation
- Friend code encoding/decoding
- AES-GCM-256 private key encryption
- SQLite persistence
- API endpoints (GET, POST, PATCH)
- Validation rules
