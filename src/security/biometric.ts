import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricResult = 'ok' | 'cancelled' | 'failed' | 'unavailable';

/**
 * Ask the user to confirm with fingerprint / face, falling back to the device
 * PIN, pattern or password. Used before money moves and to unlock the app.
 *
 * A device with no screen lock at all returns 'unavailable'; callers decide
 * whether to allow the action (we allow it, so people without a screen lock
 * aren't locked out, but the server still authorises every request).
 */
export async function confirmWithBiometrics(reason: string): Promise<BiometricResult> {
  const [hasHardware, enrolledLevel] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.getEnrolledLevelAsync(),
  ]);
  if (!hasHardware && enrolledLevel === LocalAuthentication.SecurityLevel.NONE) return 'unavailable';
  if (enrolledLevel === LocalAuthentication.SecurityLevel.NONE) return 'unavailable';

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  if (result.success) return 'ok';
  if (result.error === 'user_cancel' || result.error === 'system_cancel' || result.error === 'app_cancel') {
    return 'cancelled';
  }
  return 'failed';
}

/** True when the action may proceed. */
export async function allowSensitiveAction(reason: string): Promise<boolean> {
  const result = await confirmWithBiometrics(reason);
  return result === 'ok' || result === 'unavailable';
}
