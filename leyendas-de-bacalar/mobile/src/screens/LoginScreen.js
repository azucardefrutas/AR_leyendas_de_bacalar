import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Image, Pressable,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme.js';
import { BrandText, GlassCard, GradientButton } from '../components/Brand.js';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

// Ícono de la app (la imagen del usuario).
const appIcon = require('../../assets/app-icon.png');

export default function LoginScreen({ onClose, onLoggedIn }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!isSupabaseConfigured) { setError('Falta configurar el servidor.'); return; }
    if (!email.trim() || !password) { setError('Escribe tu correo y contraseña.'); return; }
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) { setError(authError.message || 'No se pudo iniciar sesión.'); return; }
      if (onLoggedIn) onLoggedIn();
    } catch (e) {
      setError(e?.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  const fieldStyle = [styles.field, { backgroundColor: colors.surface, borderColor: colors.cardBrd }];

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={colors.bgGrad} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
        <GlassCard style={styles.card} intensity={40} radius={26}>
          <View style={styles.iconWrap}>
            <Image source={appIcon} style={styles.icon} resizeMode="contain" />
          </View>
          <BrandText size={32} color={colors.accent} spacing={2} style={{ textAlign: 'center', marginTop: 12 }}>
            BIENVENIDO
          </BrandText>
          <Text style={[styles.note, { color: colors.muted }]}>
            Inicia sesión para ver los modelos de tus leyendas
          </Text>

          <View style={fieldStyle}>
            <MaterialIcons name="mail-outline" size={20} color={colors.primary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Correo"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={fieldStyle}>
            <MaterialIcons name="lock-outline" size={20} color={colors.primary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Contraseña"
              placeholderTextColor={colors.faint}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <GradientButton
            label={loading ? 'ENTRANDO…' : 'ENTRAR'}
            onPress={submit}
            disabled={loading}
            style={{ marginTop: 18 }}
            gradient={colors.primaryGrad}
          />

          <Pressable onPress={onClose} hitSlop={8} style={styles.ghostWrap}>
            <Text style={[styles.ghost, { color: colors.primary }]}>Explorar sin cuenta ›</Text>
          </Pressable>
        </GlassCard>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, padding: 22 },
  iconWrap: { alignSelf: 'center', marginTop: 2 },
  icon: { width: 84, height: 84, borderRadius: 22 },
  note: { textAlign: 'center', fontSize: 13, marginTop: 2, marginBottom: 6, lineHeight: 18 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, marginTop: 12,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 2 },
  error: { color: '#E24B4A', fontSize: 13, textAlign: 'center', marginTop: 10 },
  ghostWrap: { marginTop: 14, alignSelf: 'center' },
  ghost: { fontSize: 13.5, fontWeight: '600' },
});
