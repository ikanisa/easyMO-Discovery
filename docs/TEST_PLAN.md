# Test Plan

**Date:** 2025-01-29  
**Status:** Active

---

## Overview

This document outlines the testing strategy for the easyMO Discovery platform, including unit tests, contract tests, integration tests, and CI/CD integration.

---

## 1. Test Types

### 1.1 Unit Tests

**Purpose:** Test individual functions and logic in isolation.

**Location:** `services/agent-runtime/src/tests/*.test.ts`

**Coverage:**
- ✅ Ranking logic (`ranking.test.ts`)
- ✅ Schema validation (`schemas.test.ts`)
- ✅ Mocked Maps API (`maps.test.ts`)
- ✅ Logging utilities (`logging.test.ts`)
- ✅ Rate limiting (`rateLimit.test.ts`)
- ✅ Error handling (`errors.test.ts`)
- ✅ Tracing (`tracing.test.ts`)

**Example:**
```typescript
describe('Ranking Logic', () => {
  it('should rank by distance when no query', async () => {
    const result = await rankListings({ listings: mockListings }, env);
    // Assertions...
  });
});
```

---

### 1.2 Contract Tests

**Purpose:** Ensure tool schemas match their expected contracts.

**Location:** `services/agent-runtime/src/tests/schemas.test.ts`

**Coverage:**
- ✅ All Zod schemas validated
- ✅ Input validation tests
- ✅ Error case tests
- ✅ Edge case tests

**Example:**
```typescript
describe('publishPresenceSchema', () => {
  it('should accept valid presence data', () => {
    expect(() => publishPresenceSchema.parse(valid)).not.toThrow();
  });
  
  it('should reject invalid coordinates', () => {
    expect(() => publishPresenceSchema.parse(invalid)).toThrow();
  });
});
```

---

### 1.3 Integration Tests

**Purpose:** Test component interactions and API endpoints.

**Location:** `services/agent-runtime/src/tests/integration.test.ts`

**Coverage:**
- ✅ End-to-end request flow
- ✅ Tool execution pipeline
- ✅ Error propagation
- ✅ Response formatting

---

### 1.4 Mocked External API Tests

**Purpose:** Test external API integrations without making real calls.

**Location:** `services/agent-runtime/src/tests/maps.test.ts`

**Coverage:**
- ✅ Google Maps Geocoding API (mocked)
- ✅ Google Maps Distance Matrix API (mocked)
- ✅ Error handling for API failures
- ✅ Rate limiting behavior

**Example:**
```typescript
describe('Maps API Integration (Mocked)', () => {
  it('should geocode text address successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGeocodeResponse,
    });
    // Test...
  });
});
```

---

## 2. Test Execution

### 2.1 Local Development

**Run all tests:**
```bash
cd services/agent-runtime
npm test
```

**Run tests in watch mode:**
```bash
npm run test:watch
```

**Run tests with UI:**
```bash
npm run test:ui
```

**Run specific test file:**
```bash
npm test ranking.test.ts
```

---

### 2.2 CI/CD

**GitHub Actions workflow:**
- Runs on every push and pull request
- Runs linting, type checking, and tests
- Fails build if any check fails

**Location:** `.github/workflows/ci.yml`

---

## 3. Test Coverage Goals

### Current Coverage

- ✅ Ranking logic: 100%
- ✅ Schema validation: 100%
- ✅ Maps API (mocked): 80%
- ⏳ Tool execution: 60% (in progress)
- ⏳ Error handling: 70% (in progress)

### Target Coverage

- **Unit Tests:** 80%+ coverage
- **Contract Tests:** 100% schema coverage
- **Integration Tests:** Critical paths covered
- **E2E Tests:** User journeys covered

---

## 4. Test Structure

### 4.1 Test File Naming

- Unit tests: `*.test.ts`
- Integration tests: `integration.test.ts`
- E2E tests: `*.e2e.test.ts`

### 4.2 Test Organization

```
services/agent-runtime/src/tests/
├── ranking.test.ts          # Ranking logic tests
├── schemas.test.ts          # Schema contract tests
├── maps.test.ts             # Maps API tests (mocked)
├── logging.test.ts          # Logging utility tests
├── rateLimit.test.ts        # Rate limiting tests
├── errors.test.ts           # Error handling tests
├── tracing.test.ts          # Tracing utility tests
├── integration.test.ts      # Integration tests
└── worker.test.ts           # Worker endpoint tests
```

---

## 5. Mocking Strategy

### 5.1 External APIs

**Google Maps API:**
- Mocked using `vi.fn()` and `global.fetch`
- Returns realistic response structures
- Tests error cases (network errors, API errors)

**Supabase:**
- Mocked using `@supabase/supabase-js` test utilities
- Tests RPC function calls
- Tests error handling

**OpenAI:**
- Mocked using OpenAI SDK test utilities
- Tests streaming and non-streaming responses
- Tests error handling

### 5.2 Environment Variables

**Test Environment:**
```typescript
const mockEnv = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-key',
  OPENAI_API_KEY: 'test-openai-key',
  GOOGLE_MAPS_API_KEY: 'test-maps-key',
};
```

---

## 6. Test Data

### 6.1 Fixtures

**Location:** `services/agent-runtime/src/tests/fixtures/`

**Examples:**
- `mockListings.ts` - Sample marketplace listings
- `mockPresence.ts` - Sample presence data
- `mockRideIntents.ts` - Sample ride intents
- `mockMessages.ts` - Sample chat messages

### 6.2 Test Users

**Mock User IDs:**
- `test-user-1` - Driver
- `test-user-2` - Passenger
- `test-user-3` - Vendor

---

## 7. Continuous Integration

### 7.1 GitHub Actions Workflow

**Triggers:**
- Push to `main` branch
- Pull requests
- Manual trigger

**Steps:**
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Run linting (`npm run lint`)
5. Run type checking (`npm run typecheck`)
6. Run tests (`npm test`)
7. Generate coverage report

**Location:** `.github/workflows/ci.yml`

---

## 8. Test Maintenance

### 8.1 Updating Tests

**When to update:**
- Schema changes
- New tool additions
- Logic changes
- Bug fixes

**Process:**
1. Update test to reflect new behavior
2. Run tests locally
3. Commit with test updates
4. CI will verify

### 8.2 Test Failures

**Investigation:**
1. Check CI logs for error details
2. Reproduce locally
3. Fix test or code as needed
4. Re-run tests

---

## 9. Performance Testing

### 9.1 Load Testing

**Tools:**
- k6
- Artillery
- Locust

**Scenarios:**
- Concurrent chat requests
- Rate limit enforcement
- Tool execution under load

### 9.2 Benchmarking

**Metrics:**
- Request latency (p50, p95, p99)
- Tool execution time
- Database query time
- Memory usage

---

## 10. E2E Testing

### 10.1 Playwright Tests

**Location:** `apps/pwa/tests/e2e/`

**Coverage:**
- User authentication flow
- Chat interface
- Tool execution
- Error handling

**Run:**
```bash
cd apps/pwa
npm run test:e2e
```

---

## 11. Test Checklist

### Before Deployment

- [ ] All unit tests passing
- [ ] All contract tests passing
- [ ] Integration tests passing
- [ ] No linting errors
- [ ] No type errors
- [ ] Coverage meets targets
- [ ] E2E tests passing (if applicable)

---

## 12. Future Improvements

### Planned

1. **Increase Coverage**
   - Add tests for all tools
   - Add tests for agent routing
   - Add tests for streaming responses

2. **Performance Tests**
   - Add load testing
   - Add benchmarking
   - Add memory leak tests

3. **Visual Regression Tests**
   - Add Playwright visual tests
   - Test UI components

4. **Security Tests**
   - Add security scanning
   - Add dependency vulnerability checks

---

## References

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Playwright Documentation](https://playwright.dev/)

