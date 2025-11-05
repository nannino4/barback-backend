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
    *   **Transmission**: Sent in the request body to a dedicated `/api/auth/refresh-token` endpoint.
    *   **Storage**: Client is responsible for securely storing the refresh token.
    *   **Rotation**: Refresh tokens are now rotated. When a refresh token is used to obtain a new access token, a new refresh token is also issued and returned to the client. The client must then use this new refresh token for subsequent refreshes. This helps mitigate the risk of a compromised refresh token being used indefinitely.

## Authentication Flow

### Core Authentication Flow

1.  **Registration (`/api/auth/register/email`)**:
    *   User submits registration data (email, password, firstName, lastName, optional phoneNumber).
    *   `AuthService.registerEmail()`: Creates new user account with hashed password.
    *   **Email Verification**: Automatically generates verification token and sends verification email.
    *   Returns access and refresh tokens (user can use the app immediately but should verify email).

2.  **Login (`/api/auth/login/email`)**:
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

4.  **Token Refresh (`/api/auth/refresh-token`)**:
    *   When an access token expires, the client receives a 401 error.
    *   The client sends its stored `refresh_token` in the body of a POST request to `/api/auth/refresh-token`.
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

2.  **Manual Email Verification Request (`/api/auth/send-verification-email`)**:
    *   User can request a new verification email by providing their email address.
    *   System generates a new verification token (invalidates previous one).
    *   Verification email is sent with secure token link.

3.  **Email Verification (`/api/auth/verify-email` or `/api/auth/verify-email/:token`)**:
    *   User clicks verification link in email or submits token via API.
    *   System validates token and expiration (24 hours default).
    *   If valid, marks user's email as verified and clears verification token.
    *   Returns 200 OK on success, 401 Unauthorized on invalid/expired token.

### Password Reset Flow

1.  **Password Reset Request (`/api/auth/forgot-password`)**:
    *   User submits their email address.
    *   System generates secure reset token (if user exists and uses email authentication).
    *   Reset email is sent with token link.
    *   **Security**: Always returns success message to prevent email enumeration.

2.  **Password Reset (`/api/auth/reset-password`)**:
    *   User submits reset token and new password.
    *   System validates token and expiration (1 hour default).
    *   If valid, updates password hash and clears reset token.
    *   User must login again with new password.
    *   Returns 200 OK on success, 401 Unauthorized on invalid/expired token.

### Google OAuth Flow

Google OAuth 2.0 authentication is supported as an alternative to email/password authentication, providing seamless account linking and enhanced user experience.

1.  **Get Authorization URL (`/api/auth/oauth/google`)**:
    *   Frontend requests Google OAuth authorization URL from backend.
    *   Backend generates OAuth URL with signed JWT state parameter (10 min expiration) for CSRF protection.
    *   Returns authorization URL and state value to frontend.

2.  **User Authorization at Google**:
    *   Frontend redirects user to Google authorization URL.
    *   User authenticates with Google and grants permissions.
    *   Google redirects back to configured frontend callback URL (`http://localhost:3001/oauth/google/callback`) with authorization code and state.

3.  **Handle Authorization Code**:
    *   Frontend extracts authorization code and state from URL parameters.
    *   Frontend validates state matches stored value (UX protection).
    *   Frontend sends POST request to backend (`/api/auth/oauth/google/callback`) with authorization code and state.
    *   Backend validates state JWT signature and expiration (CSRF protection).
    *   Backend exchanges code for Google access token and retrieves user profile.
    *   System handles account linking scenarios automatically:
        - **New User**: Creates new account with Google authentication
        - **Existing Email Account**: Links Google account to existing email-based account  
        - **Existing Google Account**: Normal authentication flow
    *   Returns access and refresh tokens on successful authentication.

#### Account Linking Scenarios

The Google OAuth integration intelligently handles different account scenarios:

*   **New User Registration**: Creates new account with `authProvider: 'google'` and Google profile information.
*   **Existing Email User + Google Login**: Automatically links Google account to existing email-based account, allowing authentication via both methods.
*   **Existing Google User**: Updates profile information (especially profile picture) and provides normal authentication.
*   **Email Conflict Prevention**: Prevents duplicate accounts by properly linking or rejecting conflicting authentication methods.

#### Security Considerations

*   **State Parameter Validation**: CSRF protection using stateless signed JWTs as state parameters. The state uses a dedicated secret (`JWT_OAUTH_STATE_SECRET`) separate from app authentication tokens for security isolation. Each state JWT is short-lived (10 minutes default), contains a purpose claim and cryptographic nonce, and is validated on callback without requiring server-side session storage.
*   **Dedicated OAuth State Secret**: OAuth state tokens use a separate secret from access/refresh tokens. This ensures that if state tokens are compromised (e.g., from URL logging), app authentication remains secure.
*   **Frontend-Initiated Flow**: Authorization code is handled by frontend, then securely sent to backend via POST.
*   **Token Validation**: Google access tokens are validated and user profile information is verified before account creation/linking.
*   **Email Verification**: Google users are automatically considered email-verified since Google handles email verification.

## Security Considerations & Choices

*   **Stateless JWTs**: Chosen for scalability and simplicity in not managing server-side sessions.
*   **Separate Secrets for Token Types**: Using different secrets for access tokens, refresh tokens, and OAuth state tokens enhances security through isolation. If one secret is compromised, the others remain secure. OAuth state tokens particularly benefit from isolation as they appear in URLs and are more exposed to logging.
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
*   ~~**Google OAuth Integration**: Adding Google OAuth as an alternative authentication method alongside email/password.~~ ✅ **Implemented**
*   ~~**Email Verification Enforcement**: Option to require email verification before allowing access to certain features.~~ ✅ **Implemented**
*   **Advanced Email Templates**: More sophisticated HTML email templates with branding and responsive design.
*   ~~**Email Rate Limiting**: Implementing rate limiting for email sending to prevent abuse.~~ ✅ **Implemented**

## Environment Variables

```bash
# JWT Configuration
JWT_ACCESS_TOKEN_SECRET=your-access-token-secret
JWT_ACCESS_TOKEN_EXPIRATION_TIME=15m
JWT_REFRESH_TOKEN_SECRET=your-refresh-token-secret
JWT_REFRESH_TOKEN_EXPIRATION_TIME=7d
JWT_OAUTH_STATE_SECRET=your-oauth-state-secret
JWT_OAUTH_STATE_EXPIRATION_TIME=10m

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-from-console
GOOGLE_CLIENT_SECRET=your-google-client-secret-from-console
# Frontend callback URL - Google redirects users here after authentication
GOOGLE_REDIRECT_URI=http://localhost:5173/oauth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Email Settings (see EmailServiceDocumentation.md for full email configuration)
EMAIL_VERIFICATION_EXPIRY=24h
PASSWORD_RESET_EXPIRY=1h
```
