import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors } from '../theme.js';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const logo = require('../../assets/logo-upb.png');

// Login glassmorphism (adaptado de la referencia). Usa Supabase auth.
export default function LoginScreen({ onClose, onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!isSupabaseConfigured) { setError('Falta configurar el servidor (.env.local).'); return; }
    if (!email.trim() || !password) { setError('Escribe tu correo y contraseña.'); return; }
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) { setError(authError.message || 'No se pudo iniciar sesión.'); return; }
      if (onLoggedIn) onLoggedIn();
    } catch (e) {
      setError(e?.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />

      <Pressable style={styles.back} onPress={onClose} hitSlop={12}>
        <Text style={styles.backText}>✕</Text>
      </Pressable>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.center}
      >
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Image source={logo} style={styles.avatarImg} resizeMode="contain" />
          </View>
          <Text style={styles.title}>Iniciar sesión</Text>

          <View style={styles.field}>
            <Text style={styles.icon}>✉</Text>
            <TextInput
              style={styles.input}
              placeholder="Correo"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.icon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={colors.faint}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ENTRAR</Text>}
          </Pressable>

          <Text style={styles.hint}>Usa la misma cuenta de la página web.</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  glow: { position: 'absolute', width: 380, height: 380, borderRadius: 380, opacity: 0.20 },
  glowTop: { top: -140, left: -120, backgroundColor: colors.electric },
  glowBottom: { bottom: -160, right: -120, backgroundColor: colors.cyan },
  back: { position: 'absolute', top: 48, right: 22, zIndex: 5, padding: 6 },
  backText: { color: colors.text, fontSize: 22 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 380, alignItems: 'center', padding: 24, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    gap: 14,
  },
  avatar: {
    width: 92, height: 92, borderRadius: 92, backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarImg: { width: 60, height: 60 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)', paddingBottom: 6,
  },
  icon: { color: colors.cyan, fontSize: 16, width: 20, textAlign: 'center' },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 8 },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center', width: '100%' },
  button: {
    width: '100%', backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 14,
    alignItems: 'center', marginTop: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
  hint: { color: colors.faint, fontSize: 12, textAlign: 'center' },
});
