# Coding Guidelines

This document outlines the coding standards and practices to follow when working on this project. Strictly follow these guidelines when making any code changes.

## Core Principles

- **Readability & Maintainability**: Code should be easy to understand, navigate, and modify. Prioritize clarity over cleverness.

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
- Use appropriate HTTP exceptions
- Log errors with sufficient context for debugging

## Logging

### Log Content and Formatting

-   **Request ID**: All log messages related to a specific HTTP request **must** include a unique Request ID. This is crucial for tracing the lifecycle of a request across different services and modules.
-   **Method Name & Context**: Provide context for your log messages.
    -   Pass it as the second argument to the logger methods: `this.logger.debug('User created successfully', 'UserService#createUser');`
    -   The logger prefix includes `[ClassName]` or `[ClassName#methodName]` if provided.
-   **Clear Messages**: Write log messages that are clear, concise, and provide enough information to understand the event without needing to read the source code.
-   **Log At Beginning and End**: Include log messages at the beginning and end of each method to trace execution flow.

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


## NestJS-Specific Guidelines

- Use built-in decorators for request validation
- Leverage Pipes for input transformation and validation
- Use Guards for authentication/authorization
- Keep controllers thin, with business logic in services
- Use DTOs to validate input and document API contracts

### DTO Naming Conventions

DTOs (Data Transfer Objects) should follow a clear naming convention to indicate their purpose:

- **Input DTOs**: Prefix with `in.` for DTOs that define input data structure
  - Example: `in.login-email.dto.ts`, `in.create-user.dto.ts`, `in.update-subscription.dto.ts`
- **Output DTOs**: Prefix with `out.` for DTOs that define output data structure  
  - Example: `out.user-response.dto.ts`, `out.tokens.dto.ts`

### DTO Field Optionality

**Important**: DTO fields should use TypeScript's `optional` modifier (`?`), never `null` union types.

- ✅ **Correct**: `profilePictureUrl?: string;`
- ❌ **Incorrect**: `profilePictureUrl: string | null;`
- ❌ **Incorrect**: `profilePictureUrl?: string | null;`

**Rationale**:
- DTOs represent API contracts where fields are either present or absent
- Optional fields (`?`) correctly represent "may not be present" in the response
- Null values add unnecessary complexity to type checking
- Database schemas handle null values; DTOs should not expose this implementation detail

**Examples**:
```typescript
// ✅ Good DTO
export class OutUserPublicDto 
{
    @Expose()
    id!: string;  // Required field
    
    @Expose()
    profilePictureUrl?: string;  // Optional field - may not be in response
}

// ❌ Bad DTO
export class OutUserPublicDto 
{
    @Expose()
    id!: string;
    
    @Expose()
    profilePictureUrl?: string | null;  // Don't use null in DTOs
}
```

## Documentation

- Add JSDoc comments for public APIs
- Document only non-obvious decisions with inline comments
