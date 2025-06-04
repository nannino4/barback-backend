# Coding Guidelines

This document outlines the coding standards and practices to follow when working on this project. Strictly follow these guidelines when making any code changes.

## Core Principles

- **Readability & Maintainability**: Code should be easy to understand, navigate, and modify. Prioritize clarity over cleverness.
- **Code Economy**: Write the least amount of code possible to achieve the objective. Avoid unnecessary abstractions and boilerplate.
- **SOLID Principles**: Follow SOLID principles where they add value.

## General Guidelines

### Variables & Constants

- Use `const` by default, `let` only when necessary, never `var`
- Prefer early returns to reduce nesting
- Use TypeScript's type system effectively; avoid `any` unless absolutely necessary
- Name boolean variables with prefixes like `is`, `has`, `should`

### Functions

- Keep functions small and focused on a single responsibility
- Aim for no more than 20-30 lines per function
- Limit parameters to 3 or fewer; use objects for more parameters
- Use descriptive function names that indicate what they do

### Error Handling

- Always handle promise rejections and exceptions
- Use appropriate HTTP exceptions from NestJS (`BadRequestException`, etc.)
- Log errors with sufficient context for debugging

## Logging

### Log Content and Formatting

-   **Request ID**: All log messages related to a specific HTTP request **must** include a unique Request ID. This is crucial for tracing the lifecycle of a request across different services and modules.
    -   *Implementation Note*: This will be integrated into `MyLogger` using a mechanism like `nestjs-cls` or custom middleware with `AsyncLocalStorage` to make the request ID available throughout the call stack.
-   **Method Name & Context**: Provide context for your log messages.
    -   Pass it as the second argument to the logger methods: `this.logger.debug('User created successfully', 'UserService#createUser');`
    -   The logger prefix includes `[ClassName]` or `[ClassName#methodName]` if provided.
-   **Clear Messages**: Write log messages that are clear, concise, and provide enough information to understand the event without needing to read the source code.

## Code Formatting Style

The following formatting rules are enforced by ESLint and should be adhered to:

- **Brace Style**: Use Allman style braces (braces on their own line). Single-line blocks are allowed.
    ```javascript
    // Correct
    if (condition)
    {
            // code
    }
    else
    {
            // code
    }

    if (condition) { /* code */ } // Also correct for single line
    ```
- **Indentation**: Use 4 spaces for indentation.
- **Tabs**: Do not use tabs; use spaces instead.
- **Comma Dangle**: Use trailing commas for multiline object literals, array literals, function parameters, etc.
- **Line length**: Try to keep the line length to a maximum of 80 columns when possible

## TypeScript Configuration

The following TypeScript compiler options from `tsconfig.json` directly influence how you should write code:

- **`strict: true`**: This is a critical setting that enables a comprehensive suite of type-checking rules. When writing code, adhere to the following implications:
    - **Explicit Types**: Variables must have explicit types if their type cannot be immediately inferred by TypeScript. Avoid using `any` unless there is a very specific and justified reason (due to `noImplicitAny`).
    - **Null and Undefined Handling**: Values that can be `null` or `undefined` must be explicitly typed as such (e.g., `string | null`). You must perform checks for `null` or `undefined` before attempting to use these values (due to `strictNullChecks`).
    - **No Unused Variables or Parameters**: Unused local variables and function parameters will be flagged as errors by the compiler (due to `noUnusedLocals` and `noUnusedParameters`). Ensure all declared variables and parameters serve a purpose in your code.
    - **Consistent Function Returns**: If a function is declared to return a value, all possible code paths within that function must explicitly return a value of the declared type (due to `noImplicitReturns`).


## Testing Guidelines

See [TestingGuidelines.md](./TestingGuidelines.md).

## MongoDB/Database Guidelines

- Model data according to access patterns, not just entity relationships
- Use appropriate indexes for frequently queried fields
- **Index Definition**: All database indexes must be defined explicitly using the `SchemaName.index({ field: 1 }, { options });` method after the schema is created (e.g., `UserSchema.index(...)`). Do not rely on shorthand index definitions within `@Prop` decorators (like `index: true` or `unique: true` for indexing purposes). This ensures clarity and centralized control over index configurations.
- Validate data before saving to database
- Use transactions for operations that must succeed or fail as a unit
- When using NestJS with MongoDB, leverage an ODM like Mongoose and the `@nestjs/mongoose` module for integration.

## NestJS-Specific Guidelines

- Use built-in decorators for request validation
- Leverage Pipes for input transformation and validation
- Use Guards for authentication/authorization
- Keep controllers thin, with business logic in services
- Use DTOs to validate input and document API contracts

## Documentation

- Add JSDoc comments for public APIs
- Document non-obvious decisions with inline comments
- Keep README and other documentation up-to-date

## Performance Considerations

- Be mindful of N+1 query problems
- Consider pagination for endpoints returning lists
- Propose and use appropriate caching strategies where beneficial
- Optimize assets and API responses

## Security Guidelines

- Never trust client input
- Store sensitive information in environment variables
- Apply the principle of least privilege

---

Remember: The best code is often the code you don't write. Solve the actual problem, not the imagined one.
