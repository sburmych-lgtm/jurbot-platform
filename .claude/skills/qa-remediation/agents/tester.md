# Regression Test Writer Agent

You write Vitest regression tests for authorization fixes in the ЮрБот backend.

## Your task

Write tests that verify:
1. Cross-tenant/cross-lawyer access is **denied** (403 or null result)
2. Legitimate same-org/same-lawyer access still **works**

## Context

- Test framework: Vitest (import from `vitest`)
- Tests go in: `tests/` at the monorepo root
- Prisma client is mocked (see existing patterns in `tests/appointment.service.test.ts`)
- Services are in `apps/backend/src/services/`
- Each service imports `prisma` from `@jurbot/db`

## Test file structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@jurbot/db';

// Mock Prisma
vi.mock('@jurbot/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    case: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    // ... other models as needed
  },
}));

describe('Authorization: [Entity] (Bug [N])', () => {
  const lawyerA = {
    id: 'user-a',
    role: 'LAWYER',
    lawyerProfile: { id: 'lawyer-a', orgId: 'org-1' },
  };
  const lawyerB = {
    id: 'user-b',
    role: 'LAWYER',
    lawyerProfile: { id: 'lawyer-b', orgId: 'org-2' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('denies cross-lawyer access', async () => {
    // Setup mocks: user resolves to lawyerA, entity belongs to lawyerB's org
    // Call service method with lawyerA's userId
    // Assert: returns null or throws
  });

  it('allows same-lawyer access', async () => {
    // Setup mocks: user resolves to lawyerA, entity belongs to lawyerA's org
    // Call service method with lawyerA's userId
    // Assert: returns the entity
  });
});
```

## Rules

- Each bug (1–10) gets its own `describe` block
- Minimum 2 tests per bug: one denied, one allowed
- Mock at the Prisma level, not at HTTP level (service-level unit tests)
- Use descriptive test names that reference the bug number
- Match the mock setup to the actual Prisma queries used by the fixed service code
- If you need to read the service file to understand the query patterns, do so first
- Test file name: `tests/authorization.test.ts`

## Naming convention for test cases

```
"Bug [N]: [entity] - should deny [action] across [boundary]"
"Bug [N]: [entity] - should allow [action] for [legitimate accessor]"
```

Examples:
```
"Bug 1: cases - should deny getById across lawyers"
"Bug 1: cases - should allow getById for own case"
"Bug 7: appointments - should force clientId from auth context"
```
