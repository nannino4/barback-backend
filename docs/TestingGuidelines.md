## Testing Guidelines

**Core Testing Principle**:
- **Tests Must Reflect Reality**: Tests should represent real-world scenarios and validate actual expected behavior. If a test fails, examine whether the underlying code or architecture needs fixing rather than modifying the test to pass artificially.
- **Fix Code, Not Tests**: When tests fail, prioritize fixing the underlying implementation, validation, error handling, or architecture rather than adjusting test expectations to match flawed behavior.
- **Meaningful Assertions**: Test scenarios that users will actually encounter and that matter for the application's correct functioning.

**Service Tests** (Unit-style):
- Test individual service methods in isolation
- Mock external services (Stripe, email providers, external APIs)
- Use in-memory MongoDB instance (`mongodb-memory-server`)
- **Focus on output validation**: Test the final state/result rather than implementation details
- **Database-driven assertions**: When a function writes to the database, verify the result by querying the database
- **Avoid implementation coupling**: Don't test internal function calls or implementation details
- File pattern: `*.service.spec.ts`

**Controller Tests** (Integration/E2E):
- Test HTTP routes end-to-end with real external services
- Use Stripe test API keys for payment operations
- Use in-memory MongoDB instance for fast, isolated tests
- Test authentication, validation, and complete request flows
- **Focus on HTTP contracts**: Test request/response formats, status codes, and data persistence
- File patterns: `*.controller.spec.ts` or `test/*.e2e-spec.ts`

**Database Setup**:
- Use `mongodb-memory-server` for all tests
- Each test gets fresh database instance automatically
- Manage connection lifecycle in test setup utilities

**Output-Focused Testing Principles**:
- **Test the "what", not the "how"**: Verify what the function achieves, not how it does it
- **Verify persistent state**: For functions that modify data, check the final state in the database
- **Test business outcomes**: Focus on the business logic and data transformations
- **Minimize mocking**: Only mock external dependencies (APIs, services), not internal logic
- **Database assertions**: Use direct database queries to verify data changes rather than relying on service method return values

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