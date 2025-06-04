## Testing Guidelines

**Service Tests** (Unit-style):
- Test individual service methods in isolation
- Mock external services (Stripe, email providers, external APIs)
- Use in-memory MongoDB instance (`mongodb-memory-server`)
- File pattern: `*.service.spec.ts`

**Controller Tests** (Integration/E2E):
- Test HTTP routes end-to-end with real external services
- Use Stripe test API keys for payment operations
- Use in-memory MongoDB instance for fast, isolated tests
- Test authentication, validation, and complete request flows
- File patterns: `*.controller.spec.ts` or `test/*.e2e-spec.ts`

**Database Setup**:
- Use `mongodb-memory-server` for all tests
- Each test gets fresh database instance automatically
- Manage connection lifecycle in test setup utilities

## File Structure

```
src/
├── users/
│   ├── users.service.ts
│   ├── users.service.spec.ts      # Service tests with mocked externals + in-memory DB
│   ├── users.controller.ts
│   └── users.controller.spec.ts   # Route integration tests with real services + in-memory DB
│
test/
├── app.e2e-spec.ts               # Full application E2E tests
└── utils/
    └── database.helper.ts        # mongodb-memory-server setup/teardown utilities
```

**Test Utilities**:
- Database helpers in `test/utils/database.helper.ts` for `mongodb-memory-server` setup
- Mock factories for external services (Stripe, email providers)
- Authentication test helpers for protected routes