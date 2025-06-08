import { plainToInstance } from 'class-transformer';
import { OutTokensDto } from './out.tokens.dto';

describe('OutTokensDto - Output-Focused Tests', () => 
{
    describe('Token Response Format Validation', () => 
    {
        it('should expose only access and refresh tokens in API response', () => 
        {
            // Arrange - Simulate service response with extra internal data
            const serviceTokenData = {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                // Internal fields that should NOT appear in API response
                userId: 'user_123',
                sessionId: 'session_456',
                deviceInfo: 'Chrome on macOS',
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0...',
                issuedAt: new Date(),
                expiresAt: new Date(),
                refreshExpiresAt: new Date(),
                jwtPayload: { sub: 'user_123', iat: 1234567890, exp: 1234567890 },
            };

            // Act - Transform to API response format
            const apiResponse = plainToInstance(OutTokensDto, serviceTokenData, {
                excludeExtraneousValues: true,
            }) as OutTokensDto;

            // Assert - Only token fields should be in API response
            expect(apiResponse.access_token).toBe(serviceTokenData.access_token);
            expect(apiResponse.refresh_token).toBe(serviceTokenData.refresh_token);

            // Verify no internal data leaks into API response
            expect((apiResponse as any).userId).toBeUndefined();
            expect((apiResponse as any).sessionId).toBeUndefined();
            expect((apiResponse as any).deviceInfo).toBeUndefined();
            expect((apiResponse as any).ipAddress).toBeUndefined();
            expect((apiResponse as any).userAgent).toBeUndefined();
            expect((apiResponse as any).issuedAt).toBeUndefined();
            expect((apiResponse as any).expiresAt).toBeUndefined();
            expect((apiResponse as any).refreshExpiresAt).toBeUndefined();
            expect((apiResponse as any).jwtPayload).toBeUndefined();
        });

        it('should preserve token integrity through transformation', () => 
        {
            // Arrange - Valid JWT tokens
            const validTokens = {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
                refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.different_signature_here',
            };

            // Act - Transform tokens
            const apiResponse = plainToInstance(OutTokensDto, validTokens, {
                excludeExtraneousValues: true,
            }) as OutTokensDto;

            // Assert - Tokens should be unchanged and maintain JWT format
            expect(apiResponse.access_token).toBe(validTokens.access_token);
            expect(apiResponse.refresh_token).toBe(validTokens.refresh_token);
            
            // Verify JWT format is preserved (3 base64 parts separated by dots)
            expect(apiResponse.access_token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
            expect(apiResponse.refresh_token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
        });
    });

    describe('Authentication Flow API Responses', () => 
    {
        it('should format login endpoint response correctly', () => 
        {
            // Arrange - Login service response with metadata
            const loginServiceResponse = {
                access_token: 'login_access_token_here',
                refresh_token: 'login_refresh_token_here',
                token_type: 'Bearer', // OAuth metadata - should be excluded
                expires_in: 3600, // Token expiry info - should be excluded
                scope: 'read write', // OAuth scope - should be excluded
            };

            // Act - Transform to API response
            const apiResponse = plainToInstance(OutTokensDto, loginServiceResponse, {
                excludeExtraneousValues: true,
            }) as OutTokensDto;

            // Assert - Only tokens in API response
            expect(apiResponse.access_token).toBe(loginServiceResponse.access_token);
            expect(apiResponse.refresh_token).toBe(loginServiceResponse.refresh_token);
            expect((apiResponse as any).token_type).toBeUndefined();
            expect((apiResponse as any).expires_in).toBeUndefined();
            expect((apiResponse as any).scope).toBeUndefined();
        });

        it('should format registration endpoint response correctly', () => 
        {
            // Arrange - Registration service response with user data
            const registrationServiceResponse = {
                access_token: 'new_user_access_token',
                refresh_token: 'new_user_refresh_token',
                user: { // User data should be handled separately, not in token response
                    id: 'user_123',
                    email: 'newuser@example.com',
                },
                welcome_email_sent: true, // Internal operation status - should be excluded
            };

            // Act - Transform to API response
            const apiResponse = plainToInstance(OutTokensDto, registrationServiceResponse, {
                excludeExtraneousValues: true,
            }) as OutTokensDto;

            // Assert - Only tokens in API response
            expect(apiResponse.access_token).toBe(registrationServiceResponse.access_token);
            expect(apiResponse.refresh_token).toBe(registrationServiceResponse.refresh_token);
            expect((apiResponse as any).user).toBeUndefined();
            expect((apiResponse as any).welcome_email_sent).toBeUndefined();
        });

        it('should format refresh token endpoint response correctly', () => 
        {
            // Arrange - Token refresh service response with tracking data
            const refreshServiceResponse = {
                access_token: 'new_access_token',
                refresh_token: 'new_refresh_token',
                previous_token: 'old_access_token', // Token rotation tracking - should be excluded
                revoked_tokens: ['token1', 'token2'], // Security tracking - should be excluded
            };

            // Act - Transform to API response
            const apiResponse = plainToInstance(OutTokensDto, refreshServiceResponse, {
                excludeExtraneousValues: true,
            }) as OutTokensDto;

            // Assert - Only new tokens in API response
            expect(apiResponse.access_token).toBe(refreshServiceResponse.access_token);
            expect(apiResponse.refresh_token).toBe(refreshServiceResponse.refresh_token);
            expect((apiResponse as any).previous_token).toBeUndefined();
            expect((apiResponse as any).revoked_tokens).toBeUndefined();
        });
    });

    describe('Security and Data Protection', () => 
    {
        it('should prevent sensitive data exposure in API response', () => 
        {
            // Arrange - Service response with highly sensitive internal data
            const serviceResponseWithSecrets = {
                access_token: 'public_access_token',
                refresh_token: 'public_refresh_token',
                // Critical internal data that must NEVER be exposed
                signing_key: 'super_secret_jwt_key',
                database_connection: 'mongodb://user:pass@localhost:27017/db',
                user_password_hash: '$2b$10$hashedPassword',
                internal_user_data: {
                    role: 'admin',
                    permissions: ['all'],
                },
            };

            // Act - Transform to API response
            const apiResponse = plainToInstance(OutTokensDto, serviceResponseWithSecrets, {
                excludeExtraneousValues: true,
            }) as OutTokensDto;

            // Assert - Only safe token fields are exposed
            expect(Object.keys(apiResponse)).toEqual(['access_token', 'refresh_token']);
            
            // Verify no sensitive data leaks
            expect((apiResponse as any).signing_key).toBeUndefined();
            expect((apiResponse as any).database_connection).toBeUndefined();
            expect((apiResponse as any).user_password_hash).toBeUndefined();
            expect((apiResponse as any).internal_user_data).toBeUndefined();
        });

        it('should handle edge cases safely', () => 
        {
            // Arrange - Various edge case inputs
            const edgeCaseInputs = [
                { access_token: '', refresh_token: '' }, // Empty strings
                { access_token: null, refresh_token: undefined }, // Null/undefined
                { access_token: 'valid_token', refresh_token: null }, // Mixed values
            ];

            edgeCaseInputs.forEach(input => 
            {
                // Act - Transform edge case input
                const apiResponse = plainToInstance(OutTokensDto, input, {
                    excludeExtraneousValues: true,
                }) as OutTokensDto;

                // Assert - API response should handle edge cases gracefully
                expect(apiResponse.access_token).toBe(input.access_token);
                expect(apiResponse.refresh_token).toBe(input.refresh_token);
            });
        });
    });
});
