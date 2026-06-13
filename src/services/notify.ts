/**
 * notify_service — local notifications (reward ready, payment received).
 *
 * Wraps expo-notifications behind a runtime require so the app still type-checks
 * and runs if the package isn't present (and no-ops on web / when permission is
 * denied), consistent with the repo's "every integration degrades gracefully"
 * rule. Nothing here ever throws into a UI flow.
 */
import { Platform } from 'react-native';

// Runtime require keeps this resilient: no hard module dependency at type-check
// time, and a missing/unsupported module simply disables notifications.
function getModule(): any | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications');
  } catch {
    return null;
  }
}

let permissionAsked = false;

/** Lazily request notification permission once. Returns whether granted. */
export async function ensureNotifyPermission(): Promise<boolean> {
  const N = getModule();
  if (!N) return false;
  try {
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    if (permissionAsked && !current.canAskAgain) return false;
    permissionAsked = true;
    const req = await N.requestPermissionsAsync();
    return !!req.granted;
  } catch {
    return false;
  }
}

/** Fire a local notification immediately. Silently no-ops if unavailable. */
export async function notify(title: string, body: string): Promise<void> {
  const N = getModule();
  if (!N) return;
  try {
    const ok = await ensureNotifyPermission();
    if (!ok) return;
    await N.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {
    // non-fatal
  }
}

/** "Your free reward is ready" when a loyalty card fills up. */
export async function scheduleRewardReady(brand: string, reward: string): Promise<void> {
  await notify(`${brand} — reward ready 🎉`, `Your free ${reward} is waiting. Tap to redeem.`);
}

/** "You received money" for red packets / P2P. */
export async function notifyReceived(amountUsd: number, from: string): Promise<void> {
  await notify('Money received 💸', `${from} sent you $${amountUsd.toFixed(2)}.`);
}
