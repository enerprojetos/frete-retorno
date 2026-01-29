import { useState } from 'react'
import { Alert, Pressable, Text, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native'
import { Link, router } from 'expo-router'
import { supabase } from '../../src/shared/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function onLogin() {
    if (!email || !password) {
      Alert.alert('Atenção', 'Preencha email e senha.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)

    if (error) {
      Alert.alert('Erro no login', error.message)
      return
    }

    // Se logou, o app/index.tsx vai redirecionar pelo role
    router.replace('/')
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, padding: 20, justifyContent: 'center' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 16 }}>Entrar</Text>

      <Text style={{ marginBottom: 6 }}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="seuemail@exemplo.com"
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 10, marginBottom: 12 }}
      />

      <Text style={{ marginBottom: 6 }}>Senha</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="********"
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 10, marginBottom: 16 }}
      />

      <Pressable
        onPress={onLogin}
        disabled={loading}
        style={{
          backgroundColor: loading ? '#999' : '#111',
          padding: 14,
          borderRadius: 12,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>{loading ? 'Entrando...' : 'Entrar'}</Text>
      </Pressable>

      <View style={{ marginTop: 16, flexDirection: 'row', gap: 6 }}>
        <Text>Não tem conta?</Text>
        <Link href="/(auth)/register" asChild>
          <Pressable>
            <Text style={{ fontWeight: '700' }}>Criar conta</Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  )
}
