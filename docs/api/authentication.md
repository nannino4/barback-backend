# Authentication API Documentation

## Overview
The Authentication module handles user registration, login, email verification, password reset, and token management. It provides secure JWT-based authentication with access and refresh tokens.

## Endpoints

### POST /auth/register/email
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
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Validation Rules**:
- Email: Valid email format, max 255 characters
- Password: Min 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 symbol
- FirstName/LastName: Max 50 characters each
- PhoneNumber: Optional, must be valid Italian mobile format

**Notes**:
- Automatically sends email verification after registration
- User can use the app immediately but should verify email
- Email verification token expires in 24 hours

---

### POST /auth/login/email
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
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:
- `401 Unauthorized`: Invalid credentials

---

### POST /auth/refresh-token
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
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:
- `401 Unauthorized`: Invalid or expired refresh token

---

## Email Verification

### POST /auth/send-verification-email
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

### POST /auth/verify-email
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

### GET /auth/verify-email/:token
Browser-friendly email verification link.

**Authentication**: Not required

**Parameters**:
- `token` (path): Email verification token

**Response** (200 OK): HTML confirmation page

**Errors**:
- `400 Bad Request`: Invalid or expired token

---

## Password Reset

### POST /auth/forgot-password
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

### POST /auth/reset-password
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

### GET /auth/reset-password/:token
Validate reset token (for frontend form display).

**Authentication**: Not required

**Parameters**:
- `token` (path): Password reset token

**Response** (200 OK): Empty response (token is valid)

**Errors**:
- `400 Bad Request`: Invalid or expired token

---

## Token Information

### Access Tokens
- **Lifetime**: 15 minutes
- **Usage**: Include in `Authorization: Bearer <token>` header
- **Payload**: Contains user ID, email, and roles

### Refresh Tokens
- **Lifetime**: 7 days
- **Usage**: Used to obtain new access tokens
- **Security**: Stored securely, single-use (new refresh token issued on each refresh)

### Token Payload Structure
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "roles": ["USER"],
  "iat": 1640995200,
  "exp": 1640996100
}
```

## Security Features

1. **Password Hashing**: bcrypt with salt
2. **Rate Limiting**: Applied to sensitive endpoints
3. **Token Rotation**: New refresh token on each use
4. **Email Verification**: Required for full account activation
5. **Secure Password Requirements**: Strong password validation
6. **Token Expiration**: Short-lived access tokens

## Error Handling

Common error responses:

**Invalid Request Data** (400):
```json
{
  "statusCode": 400,
  "message": ["password must be stronger"],
  "error": "Bad Request"
}
```

**Authentication Failed** (401):
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

**Rate Limited** (429):
```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "error": "Too Many Requests"
}
```
