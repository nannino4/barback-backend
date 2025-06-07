import { plainToInstance } from 'class-transformer';
import { OutTokensDto } from './out.tokens.dto';

describe('Auth DTOs', () => 
{
    describe('OutTokensDto', () => 
    {
        describe('Token Exposure and Security', () => 
        {
            it('should only expose access and refresh tokens', () => 
            {
                const tokenData = {
                    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    // Internal fields that should be excluded
                    userId: 'user_123',
                    sessionId: 'session_456',
                    deviceInfo: 'Chrome on macOS',
                    ipAddress: '192.168.1.1',
                    userAgent: 'Mozilla/5.0...',
                    issuedAt: new Date(),
                    expiresAt: new Date(),
                    refreshExpiresAt: new Date(),
                    jwtPayload: {
                        sub: 'user_123',
                        iat: 1234567890,
                        exp: 1234567890,
                    },
                };

                const transformed = plainToInstance(OutTokensDto, tokenData, {
                    excludeExtraneousValues: true,
                }) as OutTokensDto;

                // Should include only token fields
                expect(transformed.access_token).toBe(tokenData.access_token);
                expect(transformed.refresh_token).toBe(tokenData.refresh_token);

                // Should exclude all internal authentication data
                expect((transformed as any).userId).toBeUndefined();
                expect((transformed as any).sessionId).toBeUndefined();
                expect((transformed as any).deviceInfo).toBeUndefined();
                expect((transformed as any).ipAddress).toBeUndefined();
                expect((transformed as any).userAgent).toBeUndefined();
                expect((transformed as any).issuedAt).toBeUndefined();
                expect((transformed as any).expiresAt).toBeUndefined();
                expect((transformed as any).refreshExpiresAt).toBeUndefined();
                expect((transformed as any).jwtPayload).toBeUndefined();
            });

            it('should handle empty or invalid token data', () => 
            {
                const emptyTokenData = {
                    access_token: '',
                    refresh_token: '',
                };

                const transformed = plainToInstance(OutTokensDto, emptyTokenData, {
                    excludeExtraneousValues: true,
                }) as OutTokensDto;

                expect(transformed.access_token).toBe('');
                expect(transformed.refresh_token).toBe('');
            });

            it('should maintain token format integrity', () => 
            {
                const validTokens = {
                    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
                    refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.different_signature_here',
                };

                const transformed = plainToInstance(OutTokensDto, validTokens, {
                    excludeExtraneousValues: true,
                }) as OutTokensDto;

                // Tokens should be preserved exactly as provided
                expect(transformed.access_token).toBe(validTokens.access_token);
                expect(transformed.refresh_token).toBe(validTokens.refresh_token);
                
                // Verify JWT format is maintained (basic format check)
                expect(transformed.access_token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
                expect(transformed.refresh_token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
            });
        });

        describe('Authentication Flow Integration', () => 
        {
            it('should handle login response format', () => 
            {
                const loginResponse = {
                    access_token: 'access_jwt_token_here',
                    refresh_token: 'refresh_jwt_token_here',
                    token_type: 'Bearer', // Should be excluded
                    expires_in: 3600, // Should be excluded
                    scope: 'read write', // Should be excluded
                };

                const transformed = plainToInstance(OutTokensDto, loginResponse, {
                    excludeExtraneousValues: true,
                }) as OutTokensDto;

                expect(transformed.access_token).toBe(loginResponse.access_token);
                expect(transformed.refresh_token).toBe(loginResponse.refresh_token);
                expect((transformed as any).token_type).toBeUndefined();
                expect((transformed as any).expires_in).toBeUndefined();
                expect((transformed as any).scope).toBeUndefined();
            });

            it('should handle refresh token response format', () => 
            {
                const refreshResponse = {
                    access_token: 'new_access_token',
                    refresh_token: 'new_refresh_token',
                    previous_token: 'old_access_token', // Should be excluded
                    revoked_tokens: ['token1', 'token2'], // Should be excluded
                };

                const transformed = plainToInstance(OutTokensDto, refreshResponse, {
                    excludeExtraneousValues: true,
                }) as OutTokensDto;

                expect(transformed.access_token).toBe(refreshResponse.access_token);
                expect(transformed.refresh_token).toBe(refreshResponse.refresh_token);
                expect((transformed as any).previous_token).toBeUndefined();
                expect((transformed as any).revoked_tokens).toBeUndefined();
            });

            it('should handle registration response format', () => 
            {
                const registrationResponse = {
                    access_token: 'new_user_access_token',
                    refresh_token: 'new_user_refresh_token',
                    user: { // Should be excluded - handled separately
                        id: 'user_123',
                        email: 'newuser@example.com',
                    },
                    welcome_email_sent: true, // Should be excluded
                };

                const transformed = plainToInstance(OutTokensDto, registrationResponse, {
                    excludeExtraneousValues: true,
                }) as OutTokensDto;

                expect(transformed.access_token).toBe(registrationResponse.access_token);
                expect(transformed.refresh_token).toBe(registrationResponse.refresh_token);
                expect((transformed as any).user).toBeUndefined();
                expect((transformed as any).welcome_email_sent).toBeUndefined();
            });
        });

        describe('Security Considerations', () => 
        {
            it('should not log or expose sensitive internal data', () => 
            {
                const tokenDataWithSecrets = {
                    access_token: 'public_access_token',
                    refresh_token: 'public_refresh_token',
                    // Highly sensitive data that must be excluded
                    signing_key: 'super_secret_key',
                    database_connection: 'mongodb://...',
                    user_password_hash: 'bcrypt_hash_here',
                    internal_user_data: {
                        role: 'admin',
                        permissions: ['all'],
                    },
                };

                const transformed = plainToInstance(OutTokensDto, tokenDataWithSecrets, {
                    excludeExtraneousValues: true,
                }) as OutTokensDto;

                // Only tokens should be present
                expect(Object.keys(transformed)).toEqual(['access_token', 'refresh_token']);
                
                // Verify no secret data is exposed
                expect((transformed as any).signing_key).toBeUndefined();
                expect((transformed as any).database_connection).toBeUndefined();
                expect((transformed as any).user_password_hash).toBeUndefined();
                expect((transformed as any).internal_user_data).toBeUndefined();
            });

            it('should handle null or undefined tokens safely', () => 
            {
                const nullTokenData = {
                    access_token: null,
                    refresh_token: undefined,
                };

                const transformed = plainToInstance(OutTokensDto, nullTokenData, {
                    excludeExtraneousValues: true,
                }) as OutTokensDto;

                expect(transformed.access_token).toBeNull();
                expect(transformed.refresh_token).toBeUndefined();
            });
        });
    });
});
