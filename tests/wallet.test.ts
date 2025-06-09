import { validateXRPLAddress } from '../src/utils/validation';
import { isValidXRPLAddress, generateAssetId, parseAssetId } from '../src/utils/xrpl_helpers';

describe('XRPL Wallet Utils', () => {
    describe('validateXRPLAddress', () => {
        test('should accept valid XRPL addresses', () => {
            expect(validateXRPLAddress('rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH')).toEqual({ valid: true });
            expect(validateXRPLAddress('rPT1Sjq2YGrBMTttX4GZHjKu9dyfQeEBUs')).toEqual({ valid: true });
        });

        test('should reject invalid XRPL addresses', () => {
            expect(validateXRPLAddress('invalid')).toEqual({ valid: false, error: 'Invalid XRPL address format' });
            expect(validateXRPLAddress('xN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH')).toEqual({ valid: false, error: 'Invalid XRPL address format' });
            expect(validateXRPLAddress('rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH0')).toEqual({ valid: false, error: 'Invalid XRPL address format' });
        });

        test('should handle empty or null addresses', () => {
            expect(validateXRPLAddress('')).toEqual({ valid: false, error: 'Address is required' });
        });
    });

    describe('isValidXRPLAddress', () => {
        test('should return true for valid addresses', () => {
            expect(isValidXRPLAddress('rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH')).toBe(true);
            expect(isValidXRPLAddress('rPT1Sjq2YGrBMTttX4GZHjKu9dyfQeEBUs')).toBe(true);
        });

        test('should return false for invalid addresses', () => {
            expect(isValidXRPLAddress('invalid')).toBe(false);
            expect(isValidXRPLAddress('xN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH')).toBe(false);
        });
    });

    describe('generateAssetId', () => {
        test('should generate correct asset IDs', () => {
            expect(generateAssetId('BLD', 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH'))
                .toBe('BLD.rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH');
            expect(generateAssetId('TBL', 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfQeEBUs'))
                .toBe('TBL.rPT1Sjq2YGrBMTttX4GZHjKu9dyfQeEBUs');
        });
    });

    describe('parseAssetId', () => {
        test('should parse valid asset IDs', () => {
            expect(parseAssetId('BLD.rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH')).toEqual({
                currency: 'BLD',
                issuer: 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH'
            });
        });

        test('should return null for invalid asset IDs', () => {
            expect(parseAssetId('invalid')).toBeNull();
            expect(parseAssetId('BLD')).toBeNull();
            expect(parseAssetId('BLD.rN7n7otQ.extra')).toBeNull();
        });
    });
});
