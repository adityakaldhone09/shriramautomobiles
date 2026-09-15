import { formatCurrency, formatPhoneNumber } from '../../packages/shared/src/utils/index';

console.log('Testing shared utility formatting:');
const formattedPrice = formatCurrency(1250);
console.assert(formattedPrice.includes('1,250'), 'Currency formatting failed');

const formattedPhone = formatPhoneNumber('9876543210');
console.assert(formattedPhone.includes('+91'), 'Phone formatting failed');

console.log('[PASS] Shared utilities unit tests passed.');
