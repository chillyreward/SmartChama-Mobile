import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { features } from '../config/features';
import { confirmWithBiometrics } from './biometric';
import { colors } from '../theme/colors';

// Locks the app when it returns from the background after LOCK_AFTER_MS.
// Content underneath stays mounted (no data refetch) but is fully covered.

const LOCK_AFTER_MS = 60 * 1000;

type Props = {
  /** Only lock when someone is signed in. */
  enabled: boolean;
  onSignOut: () => void;
  children: React.ReactNode;
};

export const AppLock: React.FC<Props> = ({ enabled, onSignOut, children }) => {
  const active = enabled && features.appLock;
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState('');
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    setMessage('');
    const result = await confirmWithBiometrics('Unlock Akibora');
    prompting.current = false;
    if (result === 'ok' || result === 'unavailable') {
      setLocked(false);
    } else if (result === 'failed') {
      setMessage("That didn't match. Try again.");
    }
  }, []);

  useEffect(() => {
    if (!active) {
      setLocked(false);
      return;
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active' && backgroundedAt.current !== null) {
        const away = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (away >= LOCK_AFTER_MS) {
          setLocked(true);
          unlock();
        }
      }
    });
    return () => sub.remove();
  }, [active, unlock]);

  return (
    <View style={styles.fill}>
      {children}
      {locked && (
        <View style={styles.overlay} accessibilityViewIsModal>
          <Ionicons name="lock-closed" size={48} color={colors.primary} />
          <Text style={styles.title}>Akibora is locked</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <TouchableOpacity style={styles.button} onPress={unlock} accessibilityRole="button">
            <Text style={styles.buttonText}>Unlock</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSignOut} accessibilityRole="button">
            <Text style={styles.link}>Sign out instead</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background.light,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text.light },
  message: { fontSize: 14, color: '#B91C1C' },
  button: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 48, borderRadius: 14 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  link: { color: colors.textSecondary.light, fontSize: 14, marginTop: 8 },
});
