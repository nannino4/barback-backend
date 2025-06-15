# Barback Application - Authentication Flow

This document outlines the authentication flow and technical choices made for the Barback application as of 15 June 2025.

## Core Strategy: JWT-based Authentication (Stateless) with Email Features

The application employs a stateless JWT (JSON Web Token) based authentication mechanism with comprehensive email verification and password reset capabilities. This means the server does not store session information about the user. Instead, the client sends a JWT with each request to protected endpoints, and the server verifies this token to authenticate the user.

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

### Core Authentication Flow

1.  **Registration (`/auth/register/email`)**:
    *   User submits registration data (email, password, firstName, lastName, optional phoneNumber).
    *   `AuthService.registerEmail()`: Creates new user account with hashed password.
    *   **Email Verification**: Automatically generates verification token and sends verification email.
    *   Returns access and refresh tokens (user can use the app immediately but should verify email).

2.  **Login (`/auth/login/email`)**:
    *   User submits credentials (email, password).
    *   `AuthService.loginEmail()`: Verifies credentials against stored user data (password hashes are compared using `bcrypt`).
    *   If valid, generates both an `access_token` and a `refresh_token`.
    *   Tokens are returned to the client.

3.  **Accessing Protected Routes**:
    *   Client includes the `access_token` in the `Authorization: Bearer <token>` header.
    *   `JwtAuthGuard` intercepts the request:
        *   Extracts the token.
        *   Verifies the token's signature and expiration using `JwtService` and `JWT_ACCESS_TOKEN_SECRET`.
        *   **Crucially, it checks `payload.type === 'access'` to ensure only access tokens are accepted by this guard.**
        *   If valid, attaches the token payload to `request.user` and allows access.
        *   If invalid (expired, wrong type, bad signature), throws an `UnauthorizedException`.

4.  **Token Refresh (`/auth/refresh-token`)**:
    *   When an access token expires, the client receives a 401 error.
    *   The client sends its stored `refresh_token` in the body of a POST request to `/auth/refresh-token`.
    *   `AuthService.validateRefreshToken()`:
        *   Verifies the refresh token using `JwtService` and `JWT_REFRESH_TOKEN_SECRET`.
        *   Checks `payload.type === 'refresh'`.
        *   If valid and the user exists, issues a new `access_token` and a new `refresh_token` (rotation).
        *   The new `access_token` and `refresh_token` are returned to the client.
    *   If the refresh token is invalid or expired, an `UnauthorizedException` is thrown, and the user must log in again.

### Email Verification Flow

1.  **Automatic Email Sending on Registration**:
    *   During registration, a verification email is automatically sent to the user's email address.
    *   If email sending fails, registration still succeeds (graceful degradation).

2.  **Manual Email Verification Request (`/auth/send-verification-email`)**:
    *   User can request a new verification email by providing their email address.
    *   System generates a new verification token (invalidates previous one).
    *   Verification email is sent with secure token link.

3.  **Email Verification (`/auth/verify-email` or `/auth/verify-email/:token`)**:
    *   User clicks verification link in email or submits token via API.
    *   System validates token and expiration (24 hours default).
    *   If valid, marks user's email as verified and clears verification token.
    *   Returns 200 OK on success, 401 Unauthorized on invalid/expired token.

### Password Reset Flow

1.  **Password Reset Request (`/auth/forgot-password`)**:
    *   User submits their email address.
    *   System generates secure reset token (if user exists and uses email authentication).
    *   Reset email is sent with token link.
    *   **Security**: Always returns success message to prevent email enumeration.

2.  **Password Reset (`/auth/reset-password`)**:
    *   User submits reset token and new password.
    *   System validates token and expiration (1 hour default).
    *   If valid, updates password hash and clears reset token.
    *   User must login again with new password.
    *   Returns 200 OK on success, 401 Unauthorized on invalid/expired token.

## Key Components

*   **`AuthModule` (`src/auth/auth.module.ts`)**: Imports `UserModule`, `ConfigModule`, `EmailModule`, and `JwtModule`. Configures `JwtModule` asynchronously to use secrets and expiration times from `ConfigService`.
*   **`AuthService` (`src/auth/auth.service.ts`)**: Contains the core logic for user validation, token generation (access and refresh), token refreshing, email verification, and password reset.
*   **`AuthController` (`src/auth/auth.controller.ts`)**: Exposes authentication endpoints including login, registration, refresh, email verification, and password reset.
*   **`EmailService` (`src/email/email.service.ts`)**: Handles email sending using Nodemailer with SMTP configuration. Generates verification and password reset emails.
*   **`JwtAuthGuard` (`src/auth/guards/jwt-auth.guard.ts`)**: A custom NestJS guard used to protect routes. It handles JWT extraction, verification (specifically for access tokens), and attaching the user payload to the request.
*   **Environment Variables** (e.g., `.env.dev`, `.env.test`):
    *   `JWT_ACCESS_TOKEN_SECRET`: Secret for signing/verifying access tokens.
    *   `JWT_ACCESS_TOKEN_EXPIRATION_TIME`: Lifetime for access tokens.
    *   `JWT_REFRESH_TOKEN_SECRET`: Secret for signing/verifying refresh tokens.
    *   `JWT_REFRESH_TOKEN_EXPIRATION_TIME`: Lifetime for refresh tokens.
    *   `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Email server configuration.
    *   `EMAIL_FROM`: Sender email address.
    *   `FRONTEND_URL`: Frontend URL for email links.
    *   `EMAIL_VERIFICATION_EXPIRY`: Email verification token lifetime (24h default).
    *   `PASSWORD_RESET_EXPIRY`: Password reset token lifetime (1h default).
*   **TypeScript Type Augmentation (`src/types/express.d.ts`)**: Extends the `Express.Request` interface to include an optional `user` property, allowing `request.user = payload` without TypeScript errors.

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Body | Response |
|--------|----------|-------------|------|----------|
| POST | `/auth/register/email` | Register new user with email/password | `{email, password, firstName, lastName, phoneNumber?}` | `{access_token, refresh_token}` |
| POST | `/auth/login/email` | Login with email/password | `{email, password}` | `{access_token, refresh_token}` |
| POST | `/auth/refresh-token` | Refresh access token | `{refresh_token}` | `{access_token, refresh_token}` |

### Email Verification Endpoints

| Method | Endpoint | Description | Body | Response |
|--------|----------|-------------|------|----------|
| POST | `/auth/send-verification-email` | Send/resend verification email | `{email}` | `200 OK` |
| POST | `/auth/verify-email` | Verify email with token | `{token}` | `200 OK` |
| GET | `/auth/verify-email/:token` | Browser-friendly verification link | - | `200 OK` |

### Password Reset Endpoints

| Method | Endpoint | Description | Body | Response |
|--------|----------|-------------|------|----------|
| POST | `/auth/forgot-password` | Request password reset | `{email}` | `200 OK` |
| POST | `/auth/reset-password` | Reset password with token | `{token, newPassword}` | `200 OK` |
| GET | `/auth/reset-password/:token` | Validate reset token | - | `200 OK` or `401 Unauthorized` |

## Security Considerations & Choices

*   **Stateless JWTs**: Chosen for scalability and simplicity in not managing server-side sessions.
*   **Separate Secrets for Token Types**: Using different secrets for access and refresh tokens enhances security. If one type of secret is compromised, the other remains secure.
*   **Short-lived Access Tokens, Long-lived Refresh Tokens**: Balances security (minimizing impact of leaked access tokens) with user experience (reducing frequency of full re-authentication).
*   **Explicit Token Type Checking**: Both `AuthService.validateRefreshToken()` and `JwtAuthGuard` explicitly check the `type` claim in the JWT payload to prevent misuse of tokens (e.g., using a refresh token to access a protected route directly).
*   **Email Verification Security**:
    *   Cryptographically secure random tokens using `crypto.randomBytes(32)`.
    *   Token expiration (24 hours default) to limit exposure window.
    *   One-time use tokens (cleared after successful verification).
    *   Graceful email sending failure handling.
*   **Password Reset Security**:
    *   Secure random tokens with short expiration (1 hour default).
    *   One-time use tokens cleared after password reset.
    *   Email enumeration prevention (always return success).
    *   Strong password validation requirements.
*   **Email Security**:
    *   SMTP authentication with secure transport.
    *   HTML and text email formats for better compatibility.
    *   Frontend URL configuration for proper link generation.
*   **No Passport.js**: Direct use of `@nestjs/jwt` for more granular control over the JWT implementation details.

## Future Considerations / Potential Enhancements

*   ~~**Refresh Token Rotation**: Issuing a new refresh token each time one is used to get a new access token. This can help detect if a refresh token has been stolen and used.~~ ✅ **Implemented**
*   ~~**Email Verification**: Implementing email verification for new user accounts with secure tokens and automated email sending.~~ ✅ **Implemented**
*   ~~**Password Reset**: Implementing secure password reset functionality via email with token-based validation.~~ ✅ **Implemented**
*   **Refresh Token Blacklisting/Revocation**: Implementing a mechanism (e.g., using Redis) to explicitly revoke refresh tokens if a user logs out, changes their password, or a security event occurs. This adds state but increases security for long-lived refresh tokens.
*   **Google OAuth Integration**: Adding Google OAuth as an alternative authentication method alongside email/password.
*   **Email Verification Enforcement**: Option to require email verification before allowing access to certain features.
*   **Advanced Email Templates**: More sophisticated HTML email templates with branding and responsive design.
*   **Email Rate Limiting**: Implementing rate limiting for email sending to prevent abuse.
*   **HTTP-only Cookies for Refresh Tokens (Web Clients)**: For web applications, storing refresh tokens in HTTP-only cookies can provide better protection against XSS attacks compared to `localStorage`.
*   **Multi-factor Authentication (MFA)**: Adding SMS or TOTP-based two-factor authentication for enhanced security.

## Email Service Configuration

The application uses Nodemailer for email delivery with the following configuration:

### Development/Testing
- Uses Ethereal Email for testing (creates preview URLs)
- Console logging of email content for debugging
- Shorter token expiration for faster testing cycles

### Production Recommendations
- Use a reliable SMTP provider (Gmail, SendGrid, AWS SES, Mailgun)
- Configure proper DNS records (SPF, DKIM, DMARC) for email deliverability
- Use environment-specific email templates with proper branding
- Implement email delivery monitoring and failure handling
- Set appropriate production token expiration times

### Environment Variables Setup
```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@barback.app
FRONTEND_URL=http://localhost:3001

# Email Settings
EMAIL_VERIFICATION_EXPIRY=24h
PASSWORD_RESET_EXPIRY=1h
```
