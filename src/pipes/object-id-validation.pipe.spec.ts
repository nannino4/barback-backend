import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ObjectIdValidationPipe } from './object-id-validation.pipe';

describe('ObjectIdValidationPipe', () =>
{
    let pipe: ObjectIdValidationPipe;

    beforeEach(() =>
    {
        pipe = new ObjectIdValidationPipe();
    });

    it('should be defined', () =>
    {
        expect(pipe).toBeDefined();
    });

    describe('transform', () =>
    {
        it('should transform valid ObjectId string to ObjectId', () =>
        {
            // Arrange
            const validObjectIdString = '507f1f77bcf86cd799439011';

            // Act
            const result = pipe.transform(validObjectIdString);

            // Assert
            expect(result).toBeInstanceOf(Types.ObjectId);
            expect(result.toString()).toBe(validObjectIdString);
        });

        it('should transform valid 24-character hex string to ObjectId', () =>
        {
            // Arrange
            const validHexString = 'abcdef123456789012345678';

            // Act
            const result = pipe.transform(validHexString);

            // Assert
            expect(result).toBeInstanceOf(Types.ObjectId);
            expect(result.toString()).toBe(validHexString);
        });

        it('should throw BadRequestException for invalid ObjectId format', () =>
        {
            // Arrange
            const invalidObjectIds = [
                'invalid-id',
                '123',
                'not-an-object-id',
                '507f1f77bcf86cd79943901', // Too short
                '507f1f77bcf86cd7994390111', // Too long
                'gggf1f77bcf86cd799439011', // Invalid characters
                '',
                '   ',
            ];

            // Act & Assert
            invalidObjectIds.forEach(invalidId =>
            {
                expect(() => pipe.transform(invalidId)).toThrow(BadRequestException);
                expect(() => pipe.transform(invalidId)).toThrow(`Invalid ObjectId format: ${invalidId}`);
            });
        });

        it('should handle null and undefined by throwing BadRequestException', () =>
        {
            // Act & Assert
            expect(() => pipe.transform(null as any)).toThrow(BadRequestException);
            expect(() => pipe.transform(undefined as any)).toThrow(BadRequestException);
        });

        it('should handle special characters by throwing BadRequestException', () =>
        {
            // Arrange
            const specialCharacters = [
                '507f1f77bcf86cd799439@11',
                '507f1f77bcf86cd799439#11',
                '507f1f77bcf86cd79943$011',
            ];

            // Act & Assert
            specialCharacters.forEach(invalidId =>
            {
                expect(() => pipe.transform(invalidId)).toThrow(BadRequestException);
            });
        });
    });
});
