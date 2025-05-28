## Testing Guidelines

A comprehensive test suite is crucial for ensuring code quality, reliability, and maintainability. Adhere to the testing pyramid, emphasizing unit tests, complemented by integration tests, and essential end-to-end (E2E) tests.

-   **Test Structure**:
    -   Follow the **AAA (Arrange, Act, Assert)** pattern for clarity and consistency in all tests.
    -   Write clear and descriptive test names that explain the specific scenario being tested and the expected outcome.
    -   Ensure tests are independent and can be run in any order without affecting each other.

-   **Unit Tests**:
    -   **Scope**: Test individual functions, methods, or classes in complete isolation.
    -   **Coverage**: Write unit tests for all isolated business logic, complex algorithms, and critical utility functions.
    -   **Mocking**: Mock external dependencies (e.g., third-party API clients, file system access, event emitters) to ensure isolation and deterministic behavior. For database interactions, see Integration Tests.
    -   **Speed**: Keep unit tests fast to encourage frequent execution.

-   **Integration Tests**:
    -   **Scope**: Test the interaction between different components or modules of the application, particularly how services interact with the data access layer (repositories/models) and other services.
    -   **Database Testing**:
        -   **Utilize an in-memory MongoDB instance (e.g., `mongodb-memory-server`) for integration tests that involve database operations.** This provides a realistic testing environment for Mongoose models and repository patterns without the overhead of an external database.
        -   Ensure each test or test suite starts with a clean data state (e.g., clear collections before each test or use transactions if supported and appropriate).
    -   **Controller/Service Interaction**: Test NestJS controllers by making requests (e.g., using `Test.createTestingModule()` from `@nestjs/testing`) and verifying responses, ensuring they correctly call service methods and that services interact with the (in-memory) database as expected.
    -   **Avoid Over-Mocking**: Prefer testing with real instances of your services and repositories connected to an in-memory database rather than extensively mocking their internal behavior.

-   **End-to-End (E2E) Tests**:
    -   **Scope**: Test complete application flows from the perspective of an API client (e.g., using Supertest with a running application instance).
    -   **Coverage**: Write E2E tests for all API routes, focusing on critical user workflows and ensuring request validation, authentication/authorization (can be mocked at this level if complex), and overall system integration.
    -   **Environment**: E2E tests should run against a fully initialized application instance. The in-memory MongoDB can also be used here for consistency, or a dedicated, seeded test database instance.

-   **General Best Practices**:
    -   **NestJS Testing Utilities**: Leverage NestJS's built-in testing utilities (`@nestjs/testing`) for streamlined testing of modules, controllers, providers, pipes, and guards.
    -   **Test Data**: Use clear, concise, and specific test data. Consider using factories or helper functions to generate complex test objects.
    -   **CI/CD Integration**: Integrate all tests into the Continuous Integration/Continuous Deployment (CI/CD) pipeline to automatically verify changes and prevent regressions.
    -   **Maintainability**: Write tests that are easy to read, understand, and maintain alongside the application code.