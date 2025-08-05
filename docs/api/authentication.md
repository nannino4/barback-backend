# Authentication API Documentation

## Overview
The Authentication module handles user registration, login, email verification, password reset, and token management. It provides secure JWT-based authentication with access and refresh tokens.

## Core Endpoints

### POST /api/auth/register/email
Register a new user with email and password.

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+393331234567"  // Optional, must be Italian format
}
```

**Response** (201 Created):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+393331234567",
    "profilePictureUrl": null,
    "isEmailVerified": false
  }
}
```

**Validation Rules**:
- Email: Valid email format, max 255 characters
- Password: Min 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 symbol
- FirstName/LastName: Max 50 characters each
- PhoneNumber: Optional, must be valid Italian mobile format

**Error Responses**:

**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters",
    "firstName should not be empty"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**409 Conflict** - Email Already Exists:
```json
{
  "message": "User with email \"user@example.com\" already exists",
  "error": "EMAIL_ALREADY_EXISTS",
  "statusCode": 409
}
```

**500 Internal Server Error** - Password Hashing Failed:
```json
{
  "message": "Password hashing failed",
  "error": "PASSWORD_HASHING_FAILED",
  "statusCode": 500
}
```

**500 Internal Server Error** - Database Operation Failed:
```json
{
  "message": "Database operation failed: user creation - [details]",
  "error": "DATABASE_OPERATION_FAILED",
  "statusCode": 500
}
```

**500 Internal Server Error** - Token Generation Failed:
```json
{
  "message": "Token generation failed: [details]",
  "error": "TOKEN_GENERATION_FAILED",
  "statusCode": 500
}
```

**Notes**:
- Automatically sends email verification after registration
- User can use the app immediately but should verify email
- Email verification token expires in 24 hours
- Invitation processing and email sending failures don't block registration

---

### POST /api/auth/login/email
Login with email and password.

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+393331234567",
    "profilePictureUrl": null,
    "isEmailVerified": false
  }
}
```

**Error Responses**:

**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "email must be an email",
    "password should not be empty"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**401 Unauthorized** - Invalid Credentials:
```json
{
  "message": "Email or password is incorrect",
  "error": "INVALID_CREDENTIALS",
  "statusCode": 401
}
```

**401 Unauthorized** - Wrong Authentication Provider:
```json
{
  "message": "This account uses google authentication. Please use the correct sign-in method.",
  "error": "WRONG_AUTH_PROVIDER",
  "statusCode": 401
}
```

**500 Internal Server Error** - Token Generation Failed:
```json
{
  "message": "Token generation failed: [details]",
  "error": "TOKEN_GENERATION_FAILED",
  "statusCode": 500
}
```

**Security Notes**:
- Invalid email and wrong password return the same error to prevent user enumeration
- Rate limiting may apply to prevent brute force attacks

---

### POST /api/auth/refresh-token
Refresh an expired access token using a valid refresh token.

**Authentication**: Not required (uses refresh token)

**Request Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+393331234567",
    "profilePictureUrl": null,
    "isEmailVerified": false
  }
}
```

**Error Responses**:

**400 Bad Request** - Validation Errors:
```json
{
  "message": [
    "refresh_token should not be empty"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**401 Unauthorized** - Invalid or Expired Refresh Token:
```json
{
  "message": "Invalid or expired refresh token",
  "error": "INVALID_REFRESH_TOKEN",
  "statusCode": 401
}
```

**500 Internal Server Error** - Token Generation Failed:
```json
{
  "message": "Token generation failed: [details]",
  "error": "TOKEN_GENERATION_FAILED",
  "statusCode": 500
}
```

**Security Notes**:
- All invalid refresh token scenarios return the same 401 error to prevent information disclosure
- This includes cases where the user no longer exists, token is expired, or token is malformed

---

## Email Verification

### POST /api/auth/send-verification-email
Send or resend email verification.

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200 OK): Empty response

**Rate Limiting**: 1 email per minute per email address

---

### POST /api/auth/verify-email
Verify email with token (for API calls).

**Authentication**: Not required

**Request Body**:
```json
{
  "token": "verification_token_here"
}
```

**Response** (200 OK): Empty response

**Errors**:
- `400 Bad Request`: Invalid or expired token

---

### GET /api/auth/verify-email/:token
Browser-friendly email verification link.

**Authentication**: Not required

**Parameters**:
- `token` (path): Email verification token

**Response** (200 OK): HTML confirmation page

**Errors**:
- `400 Bad Request`: Invalid or expired token

---

## Password Reset

### POST /api/auth/forgot-password
Request password reset email.

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200 OK): Empty response

**Notes**:
- Always returns 200 even if email doesn't exist (security)
- Reset token expires in 1 hour
- Rate limited to 1 request per minute per email

---

### POST /api/auth/reset-password
Reset password using reset token.

**Authentication**: Not required

**Request Body**:
```json
{
  "token": "reset_token_here",
  "newPassword": "NewStrongPass123!"
}
```

**Response** (200 OK): Empty response

**Validation Rules**:
- New password: Same rules as registration password

**Errors**:
- `400 Bad Request`: Invalid token or password validation failed

---

### GET /api/auth/reset-password/:token
Validate reset token (for frontend form display).

**Authentication**: Not required

**Parameters**:
- `token` (path): Password reset token

**Response** (200 OK): Empty response (token is valid)

**Errors**:
- `400 Bad Request`: Invalid or expired token

---

## Google OAuth Authentication

### GET /api/auth/oauth/google
Generate Google OAuth authorization URL.

**Authentication**: Not required

**Response** (200 OK):
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "state": "random_state_string_for_security"
}
```

**Usage**:
- Frontend calls this endpoint to get the OAuth URL
- Frontend redirects user to the returned `authUrl`
- Google redirects to your frontend callback page with authorization code
- Frontend then calls the callback endpoint with the code

---

### POST /api/auth/oauth/google/callback
Handle Google OAuth authorization code and authenticate user.

**Authentication**: Not required

**Request Body**:
```json
{
  "code": "authorization_code_from_google",
  "state": "state_parameter_for_validation"  // Optional
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@gmail.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": null,
    "profilePictureUrl": "https://lh3.googleusercontent.com/...",
    "isEmailVerified": true
  }
}
```

**Account Linking Behavior**:
- **New User**: Creates new account with Google authentication
- **Existing Email User**: Links Google account to existing email/password account
- **Existing Google User**: Returns authentication for existing user
- **Email Conflict**: Returns 409 if email exists with different OAuth provider

---

**Google OAuth Integration Notes**:
- Users authenticated via Google have `authProvider: "google"`
- Google users cannot change passwords (only available for email users)
- Profile pictures are automatically synced from Google
- Email verification is automatic for Google users
- Supports seamless account linking for existing email users
