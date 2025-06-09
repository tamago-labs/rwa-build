import { validateTokenSymbol, validateAssetValue, validateTokenSupply, validateYieldRate } from '../src/utils/validation';

describe('Validation Utils', () => {
    describe('validateTokenSymbol', () => {
        test('should accept valid token symbols', () => {
            expect(validateTokenSymbol('BLD')).toEqual({ valid: true });
            expect(validateTokenSymbol('ABC')).toEqual({ valid: true });
            expect(validateTokenSymbol('123')).toEqual({ valid: true });
        });

        test('should reject invalid token symbols', () => {
            expect(validateTokenSymbol('BL')).toEqual({ valid: false, error: 'Token symbol must be exactly 3 characters' });
            expect(validateTokenSymbol('BLDG')).toEqual({ valid: false, error: 'Token symbol must be exactly 3 characters' });
            expect(validateTokenSymbol('bl1')).toEqual({ valid: false, error: 'Token symbol must contain only uppercase letters and numbers' });
        });

        test('should reject reserved symbols', () => {
            expect(validateTokenSymbol('XRP')).toEqual({ valid: false, error: "Token symbol 'XRP' is reserved" });
            expect(validateTokenSymbol('USD')).toEqual({ valid: false, error: "Token symbol 'USD' is reserved" });
        });
    });

    describe('validateAssetValue', () => {
        test('should accept valid asset values', () => {
            expect(validateAssetValue(1000)).toEqual({ valid: true });
            expect(validateAssetValue(1000000)).toEqual({ valid: true });
        });

        test('should reject invalid asset values', () => {
            expect(validateAssetValue(0)).toEqual({ valid: false, error: 'Asset value must be positive' });
            expect(validateAssetValue(-1000)).toEqual({ valid: false, error: 'Asset value must be positive' });
            expect(validateAssetValue(500)).toEqual({ valid: false, error: 'Minimum asset value is $1,000 for tokenization' });
        });
    });

    describe('validateTokenSupply', () => {
        test('should accept valid token supplies', () => {
            expect(validateTokenSupply(1000, 100000)).toEqual({ valid: true });
            expect(validateTokenSupply(10000, 1000000)).toEqual({ valid: true });
        });

        test('should reject invalid token supplies', () => {
            expect(validateTokenSupply(50, 100000)).toEqual({ valid: false, error: 'Minimum token supply is 100 tokens' });
            expect(validateTokenSupply(100000000000, 1000000)).toEqual({ valid: false, error: 'Token supply exceeds maximum limit of 100M tokens' });
        });

        test('should reject supplies that create too low price per token', () => {
            expect(validateTokenSupply(1000000, 1000)).toEqual({ 
                valid: false, 
                error: 'Price per token too low (minimum $0.01). Reduce token supply or increase asset value.' 
            });
        });
    });

    describe('validateYieldRate', () => {
        test('should accept valid yield rates', () => {
            expect(validateYieldRate(5.5)).toEqual({ valid: true });
            expect(validateYieldRate(0)).toEqual({ valid: true });
            expect(validateYieldRate(undefined)).toEqual({ valid: true });
        });

        test('should reject invalid yield rates', () => {
            expect(validateYieldRate(-1)).toEqual({ valid: false, error: 'Yield rate cannot be negative' });
            expect(validateYieldRate(51)).toEqual({ valid: false, error: 'Yield rate cannot exceed 50% annually' });
        });
    });
});
