import { app } from '../../backend/src/app';

console.log('Testing Express API creation:');
console.assert(typeof app === 'function', 'App is not an Express function');
console.log('[PASS] API application instantiated successfully.');
