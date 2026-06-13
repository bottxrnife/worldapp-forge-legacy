/**
 * biometric_service — optional Face ID / Touch ID / device passcode gate.
 *
 * Wraps expo-local-authentication. Never hard-blocks a flow: if the module is
 * absent (web), the device has no biometric hardware, or nothing is enrolled,
 * the gate passes through so payments still work. Only an explicit failed/
 * cancelled prompt returns false.
 */
import { Platform } from 'react-native';

function mod(): any | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-local-authentication');
  } catch {
    return null;
  }
}

export async function authenticateForSpend(reason = 'Confirm payment'): Promise<boolean> {
  const LA = mod();
  if (!LA) return true; // web / not installed → don't block the flow
  try {
    const hasHardware = await LA.hasHardwareAsync();
    const enrolled = await LA.isEnrolledAsync();
    if (!hasHardware || !enrolled) return true; // nothing to authenticate against
    const res = await LA.authenticateAsync({ promptMessage: reason, disableDeviceFallback: false });
    return !!res.success;
  } catch {
    return true; // never strand a payment on an auth glitch
  }
}
