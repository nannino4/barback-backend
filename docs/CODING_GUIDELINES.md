# Coding Guidelines

This document outlines the coding standards and practices to follow when working on this project. Please review these guidelines before making any code changes.

## Core Principles

- **Readability & Maintainability**: Code should be easy to understand, navigate, and modify. Prioritize clarity over cleverness.
- **Code Economy**: Write the least amount of code possible to achieve the objective. Avoid unnecessary abstractions and boilerplate.
- **SOLID Principles**: Follow SOLID principles where they add value, but don't over-engineer.

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

## Architecture Guidelines

### Project Structure

- Organize by feature rather than technical layers
- Keep related files close to each other
- Follow NestJS module patterns

### SOLID Principles Application

1. **Single Responsibility Principle**: Each class should have only one reason to change
2. **Open/Closed Principle**: Code should be open for extension but closed for modification
3. **Liskov Substitution Principle**: Derived types should be substitutable for their base types
4. **Interface Segregation**: Many specific interfaces are better than one general-purpose interface
5. **Dependency Inversion**: Depend on abstractions, not concretions

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

## Testing Guidelines

- Write tests for all business logic
- Follow the AAA pattern: Arrange, Act, Assert
- Mock external dependencies
- Aim for meaningful test coverage, not just percentage

## MongoDB/Database Guidelines

- Model data according to access patterns, not just entity relationships
- Use appropriate indexes for frequently queried fields
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
- Use appropriate caching strategies where beneficial
- Optimize assets and API responses

## Security Guidelines

- Never trust client input
- Store sensitive information in environment variables
- Apply the principle of least privilege
- Keep dependencies up to date

## Commit Guidelines

- Use descriptive commit messages
- Keep commits focused on a single change
- Reference issue numbers where applicable

## Review Process

- Code should be reviewed by at least one other developer
- Automated tests must pass before merging
- Review for security implications
- Consider performance impact

---

Remember: The best code is often the code you don't write. Solve the actual problem, not the imagined one.
