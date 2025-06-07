# Barback Application - Authentication Flow

This document outlines the authentication flow and technical choices made for the Barback application as of 28 May 2025.

## Core Strategy: JWT-based Authentication (Stateless)

The application employs a stateless JWT (JSON Web Token) based authentication mechanism. This means the server does not store session information about the user. Instead, the client sends a JWT with each request to protected endpoints, and the server verifies this token to authenticate the user.

We are **not** using Passport.js for this implementation; JWT handling is done using the `@nestjs/jwt` library directly.

## Token Types

Two types of JWTs are used:

1.  **Access Token**:
    *   **Purpose**: Grants access to protected API resources.
    *   **Payload Includes**: `userId` (as `sub`), `email`, `role`, `type: 'access'`.
    *   **Lifetime**: Short-lived (e.g., 15 minutes, configurable via `JWT_ACCESS_TOKEN_EXPIRATION_TIME` in `.env` files).
    *   **Secret**: Signed with `JWT_ACCESS_TOKEN_SECRET` from `.env`.
    *   **Transmission**: Sent in the `Authorization: Bearer <token>` header for requests to protected routes.

2.  **Refresh Token**:
    *   **Purpose**: Used to obtain a new access token when the current one expires, without requiring the user to re-enter credentials.
    *   **Payload Includes**: `userId` (as `sub`), `type: 'refresh'`.
    *   **Lifetime**: Longer-lived (e.g., 7 days, configurable via `JWT_REFRESH_TOKEN_EXPIRATION_TIME` in `.env` files).
    *   **Secret**: Signed with `JWT_REFRESH_TOKEN_SECRET` from `.env` (a different secret than the access token for better security).
    *   **Transmission**: Sent in the request body to a dedicated `/auth/refresh-token` endpoint.
    *   **Storage**: Client is responsible for securely storing the refresh token.
    *   **Rotation**: Refresh tokens are now rotated. When a refresh token is used to obtain a new access token, a new refresh token is also issued and returned to the client. The client must then use this new refresh token for subsequent refreshes. This helps mitigate the risk of a compromised refresh token being used indefinitely.

## Authentication Flow

1.  **Login (`/auth/login`)**:
    *   User submits credentials (email, password).
    *   `AuthService.validateUser()`: Verifies credentials against stored user data (password hashes are compared using `bcrypt`).
    *   If valid, `AuthService.login()`: Generates both an `access_token` and a `refresh_token`.
    *   Tokens are returned to the client.

2.  **Accessing Protected Routes**:
    *   Client includes the `access_token` in the `Authorization: Bearer <token>` header.
    *   `JwtAuthGuard` intercepts the request:
        *   Extracts the token.
        *   Verifies the token's signature and expiration using `JwtService` and `JWT_ACCESS_TOKEN_SECRET`.
        *   **Crucially, it checks `payload.type === 'access'` to ensure only access tokens are accepted by this guard.**
        *   If valid, attaches the token payload to `request.user` and allows access.
        *   If invalid (expired, wrong type, bad signature), throws an `UnauthorizedException`.

3.  **Token Refresh (`/auth/refresh-token`)**:
    *   When an access token expires, the client receives a 401 error.
    *   The client sends its stored `refresh_token` in the body of a POST request to `/auth/refresh-token`.
    *   `AuthService.refreshToken()`:
        *   Verifies the refresh token using `JwtService` and `JWT_REFRESH_TOKEN_SECRET`.
        *   Checks `payload.type === 'refresh'`.
        *   If valid and the user exists, issues a new `access_token` and a new `refresh_token` (rotation).
        *   The new `access_token` and `refresh_token` are returned to the client.
    *   If the refresh token is invalid or expired, an `UnauthorizedException` is thrown, and the user must log in again.

## Key Components

*   **`AuthModule` (`src/auth/auth.module.ts`)**: Imports `UserModule`, `ConfigModule`, and `JwtModule`. Configures `JwtModule` asynchronously to use secrets and expiration times from `ConfigService`.
*   **`AuthService` (`src/auth/auth.service.ts`)**: Contains the core logic for user validation, token generation (access and refresh), and token refreshing.
*   **`AuthController` (`src/auth/auth.controller.ts`)**: Exposes the `/auth/login` and `/auth/refresh-token` endpoints.
*   **`JwtAuthGuard` (`src/auth/guards/jwt-auth.guard.ts`)**: A custom NestJS guard used to protect routes. It handles JWT extraction, verification (specifically for access tokens), and attaching the user payload to the request.
*   **Environment Variables** (e.g., `.env.dev`, `.env.test`):
    *   `JWT_ACCESS_TOKEN_SECRET`: Secret for signing/verifying access tokens.
    *   `JWT_ACCESS_TOKEN_EXPIRATION_TIME`: Lifetime for access tokens.
    *   `JWT_REFRESH_TOKEN_SECRET`: Secret for signing/verifying refresh tokens.
    *   `JWT_REFRESH_TOKEN_EXPIRATION_TIME`: Lifetime for refresh tokens.
*   **TypeScript Type Augmentation (`src/types/express.d.ts`)**: Extends the `Express.Request` interface to include an optional `user` property, allowing `request.user = payload` without TypeScript errors.

## Security Considerations & Choices

*   **Stateless JWTs**: Chosen for scalability and simplicity in not managing server-side sessions.
*   **Separate Secrets for Token Types**: Using different secrets for access and refresh tokens enhances security. If one type of secret is compromised, the other remains secure.
*   **Short-lived Access Tokens, Long-lived Refresh Tokens**: Balances security (minimizing impact of leaked access tokens) with user experience (reducing frequency of full re-authentication).
*   **Explicit Token Type Checking**: Both `AuthService.refreshToken()` and `JwtAuthGuard` explicitly check the `type` claim in the JWT payload to prevent misuse of tokens (e.g., using a refresh token to access a protected route directly).
*   **No Passport.js**: Direct use of `@nestjs/jwt` for more granular control over the JWT implementation details.

## Future Considerations / Potential Enhancements

*   ~~**Refresh Token Rotation**: Issuing a new refresh token each time one is used to get a new access token. This can help detect if a refresh token has been stolen and used.~~ (Implemented)
*   **Refresh Token Blacklisting/Revocation**: Implementing a mechanism (e.g., using Redis) to explicitly revoke refresh tokens if a user logs out, changes their password, or a security event occurs. This adds state but increases security for long-lived refresh tokens.
*   **More Specific DTOs**: Using Data Transfer Objects (DTOs) for login and refresh token request bodies for better validation and clarity.
*   **HTTP-only Cookies for Refresh Tokens (Web Clients)**: For web applications, storing refresh tokens in HTTP-only cookies can provide better protection against XSS attacks compared to `localStorage`.
