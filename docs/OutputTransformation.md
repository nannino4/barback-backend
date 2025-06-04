# Output Transformation with class-transformer

This document explains how the application uses `class-transformer` with `ClassSerializerInterceptor` to automatically handle output transformation and secure sensitive data exclusion.

## Overview

The application now uses NestJS's built-in support for automatic response transformation via the `ClassSerializerInterceptor`. This interceptor automatically transforms returned objects based on class-transformer decorators, ensuring that:

1. **Sensitive data is automatically excluded** from API responses
2. **Response structure is consistent** across all endpoints
3. **Data transformation is handled declaratively** using decorators
4. **Type safety is maintained** with proper DTOs

## Configuration

### Global Interceptor Setup

The `ClassSerializerInterceptor` is configured globally in `app.module.ts`:

```typescript
import { Module, ClassSerializerInterceptor } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule {}
```

## Response DTOs

### UserResponseDto

The main user response DTO excludes all sensitive fields by using `@Expose()` decorators:

```typescript
export class UserResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString() || obj.id)
  id!: string;

  @Expose()
  email!: string;

  @Expose()
  firstName!: string;

  // ... other safe fields

  // Sensitive fields are NOT exposed:
  // - hashedPassword
  // - emailVerificationToken
  // - passwordResetToken
  // - passwordResetExpires
}
```

### Authentication Response DTOs

**RegisterResponseDto** and **LoginResponseDto** include both tokens and safe user data:

```typescript
export class RegisterResponseDto {
  @Expose()
  access_token!: string;

  @Expose()
  refresh_token!: string;

  @Expose()
  @Type(() => UserResponseDto)
  user!: UserResponseDto;
}
```

## Controller Implementation

Controllers now return proper response DTOs and let the interceptor handle transformation:

```typescript
@Controller('auth')
export class AuthController {
  @Post('register/email')
  async register(@Body() registerUserDto: RegisterEmailDto): Promise<RegisterResponseDto> {
    const result = await this.authService.registerEmail(registerUserDto);
    return result; // Automatically transformed by ClassSerializerInterceptor
  }

  @Post('login/email')
  async emailLogin(@Body() loginDto: LoginEmailDto): Promise<LoginResponseDto> {
    const result = await this.authService.loginEmailWithUser(loginDto.email, loginDto.password);
    return result; // Automatically transformed by ClassSerializerInterceptor
  }
}
```

## Service Layer Changes

Services now return response objects that include user data:

```typescript
@Injectable()
export class AuthService {
  async registerEmail(registerUserDto: RegisterEmailDto): Promise<RegisterResponseDto> {
    // ... user creation logic
    
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: newUser as any, // Will be transformed by ClassSerializerInterceptor
    };
  }

  async loginEmailWithUser(email: string, pass: string): Promise<LoginResponseDto> {
    const user = await this.loginEmail(email, pass);
    const tokens = await this.generateTokens(user);
    
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: user as any, // Will be transformed by ClassSerializerInterceptor
    };
  }
}
```

## Benefits of This Approach

### 1. **Automatic Security**
- Sensitive fields are automatically excluded without manual filtering
- No risk of accidentally exposing sensitive data
- Consistent security across all endpoints

### 2. **Declarative Configuration**
- Response structure is defined once in DTOs
- No need for manual transformation in controllers
- Easy to understand and maintain

### 3. **Type Safety**
- Full TypeScript support
- Compile-time checking of response structures
- IDE autocomplete and error detection

### 4. **Performance**
- Built-in NestJS interceptor with optimized performance
- No additional transformation overhead in business logic
- Automatic caching of transformation metadata

## Usage Examples

### Safe User Data in Responses

**Before (manual filtering):**
```typescript
async getCurrentUser(@CurrentUser() user: User) {
  const { hashedPassword, emailVerificationToken, ...safeUser } = user;
  return safeUser; // Manual exclusion - error-prone
}
```

**After (automatic transformation):**
```typescript
async getCurrentUser(@CurrentUser() user: User): Promise<UserResponseDto> {
  return user as unknown as UserResponseDto; // Automatic transformation
}
```

### Authentication Responses

**Registration response includes user data:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isActive": true,
    "authProvider": "email",
    "isEmailVerified": false,
    "createdAt": "2025-06-04T19:40:20.000Z",
    "updatedAt": "2025-06-04T19:40:20.000Z"
  }
}
```

**Note:** Sensitive fields like `hashedPassword`, `emailVerificationToken`, etc. are automatically excluded.

## Testing

The test helper has been updated to work with the new pattern:

```typescript
export class AuthTestHelper {
  static createSafeUserResponse(user: Partial<User>): UserResponseDto {
    return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
  }
}
```

## Migration Notes

If you need to add new fields to responses:

1. **Add the field to the entity/schema**
2. **Add `@Expose()` decorator to the response DTO**
3. **The field will automatically appear in API responses**

If you need to exclude a field:

1. **Simply don't add `@Expose()` decorator to the response DTO**
2. **The field will be automatically excluded from API responses**

## Key Files Modified

- `src/app.module.ts` - Global interceptor configuration
- `src/auth/dto/register-response.dto.ts` - New registration response DTO
- `src/auth/dto/login-response.dto.ts` - New login response DTO
- `src/auth/auth.controller.ts` - Updated to use response DTOs
- `src/auth/auth.service.ts` - Updated to return user data with tokens
- `src/admin/admin.controller.ts` - Updated to use response DTOs
- `src/user/dto/user-response.dto.ts` - Enhanced with documentation
- `test/utils/auth.helper.ts` - Updated helper methods

This pattern ensures that sensitive data is never accidentally exposed while providing a clean, maintainable, and type-safe approach to API response handling.
