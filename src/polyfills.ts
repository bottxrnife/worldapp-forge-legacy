/**
 * Runtime polyfills for Expo Go / Hermes so viem and the World ID bridge
 * (AES-GCM) have the web APIs they expect.
 */
import { getRandomValues } from 'expo-crypto';

const g = globalThis as any;

if (typeof g.crypto === 'undefined') g.crypto = {};
if (typeof g.crypto.getRandomValues !== 'function') {
  g.crypto.getRandomValues = getRandomValues;
}
