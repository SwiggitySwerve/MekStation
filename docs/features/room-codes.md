# Room Code Format

Technical specification for P2P sync room codes.

## Format

```
XXXXXX    (raw)
XXX-XXX   (formatted for display)
```

- **Length**: 6 characters
- **Case**: Uppercase (input normalized)
- **Separator**: Optional hyphen at position 3

## Character Set

Uses a 32-character alphabet to avoid confusion:

```
ABCDEFGHJKLMNPQRSTUVWXYZ23456789
```

**Excluded characters**:
- `I` - Looks like `1` or `l`
- `O` - Looks like `0`
- `0` - Looks like `O`
- `1` - Looks like `I` or `l`

## Entropy

- 32 characters ^ 6 positions = 1,073,741,824 combinations (~1 billion)
- Sufficient for concurrent room uniqueness
- Not designed for cryptographic security

## Generation

```typescript
import { generateRoomCode } from '@/lib/p2p/roomCodes';

const code = generateRoomCode(); // e.g., "K4XN2P"
```

Uses `crypto.getRandomValues()` when available, falls back to `Math.random()`.

## Validation

```typescript
import { isValidRoomCode, parseRoomCode } from '@/lib/p2p/roomCodes';

isValidRoomCode('ABC-DEF');  // true
isValidRoomCode('ABCDEF');   // true
isValidRoomCode('abc-def');  // true (case-insensitive)
isValidRoomCode('AB');       // false (too short)
isValidRoomCode('ABCDEFG');  // false (too long)
isValidRoomCode('ABC-DEI');  // false (contains I)

const code = parseRoomCode('abc-def'); // "ABCDEF" or null
```

## Normalization

User input is normalized before use:

1. Remove non-alphanumeric characters
2. Convert to uppercase
3. Truncate to 6 characters

```typescript
import { normalizeRoomCode } from '@/lib/p2p/roomCodes';

normalizeRoomCode('abc-def');     // "ABCDEF"
normalizeRoomCode('  Ab C  ');    // "ABC"
normalizeRoomCode('abc-def-ghi'); // "ABCDEF" (truncated)
```

## Display

```typescript
import { formatRoomCode } from '@/lib/p2p/roomCodes';

formatRoomCode('ABCDEF');  // "ABC-DEF"
formatRoomCode('ABC');     // "ABC"
```

## URL Sharing

Room codes can be shared via URL:

```
https://mekstation.app/sync?room=ABCDEF
https://mekstation.app/sync?room=ABC-DEF
```

Both formats are accepted and normalized.

## Configuration

Default settings in `P2P_CONFIG`:

```typescript
export const P2P_CONFIG = {
  roomCodeLength: 6,
  // ... other settings
};
```

## Best Practices

1. **Display formatted**: Always show `ABC-DEF` to users
2. **Accept flexible input**: Normalize all user input
3. **Copy unformatted**: Clipboard should contain `ABCDEF` for compatibility
4. **Validate early**: Check validity before attempting connection
