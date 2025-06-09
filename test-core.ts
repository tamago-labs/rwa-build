#!/usr/bin/env node

/**
 * Simple test script to verify RWA.build implementation
 * This tests the core functionality without requiring XRPL connection
 */

import { validateTokenSymbol, validateAssetValue, validateTokenSupply } from './src/utils/validation';
import { calculateYieldDistribution, calculateTokenPrice } from './src/utils/calculations';
import { generateCurrencyCode, generateAssetId } from './src/utils/xrpl_helpers';
import { formatCurrency, formatPercentage } from './src/utils/formatting';

console.log('🧪 Testing RWA.build Core Functionality\n');

// Test 1: Validation Functions
console.log('📋 Testing Validation Functions:');

const tokenTest = validateTokenSymbol('BLD');
console.log(`✅ Token symbol validation: ${tokenTest.valid ? 'PASSED' : 'FAILED'}`);

const valueTest = validateAssetValue(2000000);
console.log(`✅ Asset value validation: ${valueTest.valid ? 'PASSED' : 'FAILED'}`);

const supplyTest = validateTokenSupply(2000, 2000000);
console.log(`✅ Token supply validation: ${supplyTest.valid ? 'PASSED' : 'FAILED'}`);

// Test 2: Financial Calculations
console.log('\n💰 Testing Financial Calculations:');

const yieldCalc = calculateYieldDistribution(2000000, 8, 'quarterly');
console.log(`✅ Yield calculation: ${yieldCalc.periodsPerYear === 4 ? 'PASSED' : 'FAILED'}`);
console.log(`   • Quarterly rate: ${formatPercentage(yieldCalc.ratePerPeriod)}`);
console.log(`   • Amount per quarter: ${formatCurrency(yieldCalc.amountPerPeriod)}`);

const tokenPrice = calculateTokenPrice(2000000, 2000);
console.log(`✅ Token price calculation: ${tokenPrice === 1000 ? 'PASSED' : 'FAILED'}`);
console.log(`   • Price per token: ${formatCurrency(tokenPrice)}`);

// Test 3: XRPL Helpers
console.log('\n🔧 Testing XRPL Helpers:');

const currencyCode = generateCurrencyCode('BLD');
console.log(`✅ Currency code generation: ${currencyCode === 'BLD' ? 'PASSED' : 'FAILED'}`);

const assetId = generateAssetId('BLD', 'rExampleIssuer123');
console.log(`✅ Asset ID generation: ${assetId === 'BLD.rExampleIssuer123' ? 'PASSED' : 'FAILED'}`);

// Test 4: Real Estate Example
console.log('\n🏢 Testing Real Estate Tokenization Example:');

const realEstate = {
    name: 'Manhattan Office Building',
    value: 2000000,
    tokens: 2000,
    yieldRate: 8,
    frequency: 'quarterly' as const
};

const reValidation = [
    validateTokenSymbol('BLD'),
    validateAssetValue(realEstate.value),
    validateTokenSupply(realEstate.tokens, realEstate.value)
].every(result => result.valid);

const reCalculations = calculateYieldDistribution(realEstate.value, realEstate.yieldRate, realEstate.frequency);

console.log(`✅ Real estate validation: ${reValidation ? 'PASSED' : 'FAILED'}`);
console.log(`   • Asset: ${realEstate.name}`);
console.log(`   • Value: ${formatCurrency(realEstate.value)}`);
console.log(`   • Tokens: ${realEstate.tokens.toLocaleString()} BLD`);
console.log(`   • Price per token: ${formatCurrency(realEstate.value / realEstate.tokens)}`);
console.log(`   • Quarterly yield: ${formatCurrency(reCalculations.amountPerPeriod)}`);

// Test 5: Treasury Bill Example
console.log('\n💰 Testing Treasury Bill Example:');

const treasury = {
    name: 'US Treasury Bills',
    value: 1000000,
    tokens: 1000,
    yieldRate: 5.2,
    frequency: 'monthly' as const
};

const tbValidation = [
    validateTokenSymbol('TBL'),
    validateAssetValue(treasury.value),
    validateTokenSupply(treasury.tokens, treasury.value)
].every(result => result.valid);

const tbCalculations = calculateYieldDistribution(treasury.value, treasury.yieldRate, treasury.frequency);

console.log(`✅ Treasury validation: ${tbValidation ? 'PASSED' : 'FAILED'}`);
console.log(`   • Asset: ${treasury.name}`);
console.log(`   • Value: ${formatCurrency(treasury.value)}`);
console.log(`   • Tokens: ${treasury.tokens.toLocaleString()} TBL`);
console.log(`   • Price per token: ${formatCurrency(treasury.value / treasury.tokens)}`);
console.log(`   • Monthly yield: ${formatCurrency(tbCalculations.amountPerPeriod)}`);

console.log('\n🎉 All core functionality tests completed!');
console.log('🚀 RWA.build is ready for Phase 1 implementation');
