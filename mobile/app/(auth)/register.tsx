import { useState } from 'react'
import { Alert, Pressable, Text, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { Link, router } from 'expo-router'
import { supabase } from '../../src/shared/supabaseClient'

type Role = 'SHIPPER' | 'DRIVER' | 'OPERATOR'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<Role>('SHIPPER')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function onRegister() {
    if (!fullName || !phone || !email || !password) {
      Alert.alert('Atenção', 'Preencha todos os campos.')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          role, // MUITO importante: isso alimenta o trigger do profiles
        },
      },
    })

    setLoading(false)

    if (error) {
      Alert.alert('Erro ao cadastrar', error.message)
      return
    }

    // Se o projeto exige confirmação de email, data.session pode ser null
    if (!data.session) {
      Alert.alert(
        'Conta criada!',
        'Pode ser necessário confirmar seu email antes de entrar. Verifique sua caixa de entrada.',
      )
      router.replace('/(auth)/login')
      return
    }

    // Se já logou automaticamente:
    router.replace('/')
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, padding: 20, justifyContent: 'center' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 16 }}>Criar conta</Text>

      <Text style={{ marginBottom: 6 }}>Nome</Text>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Seu nome"
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 10, marginBottom: 12 }}
      />

      <Text style={{ marginBottom: 6 }}>Telefone</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="(62) 99999-0000"
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 10, marginBottom: 12 }}
      />

      <Text style={{ marginBottom: 6 }}>Perfil</Text>
      <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
        <Picker selectedValue={role} onValueChange={(v) => setRole(v)}>
          <Picker.Item label="Empresa (SHIPPER)" value="SHIPPER" />
          <Picker.Item label="Motorista (DRIVER)" value="DRIVER" />
          <Picker.Item label="Operador/Admin (OPERATOR)" value="OPERATOR" />
        </Picker>
      </View>

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
        onPress={onRegister}
        disabled={loading}
        style={{
          backgroundColor: loading ? '#999' : '#111',
          padding: 14,
          borderRadius: 12,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>{loading ? 'Criando...' : 'Criar conta'}</Text>
      </Pressable>

      <View style={{ marginTop: 16, flexDirection: 'row', gap: 6 }}>
        <Text>Já tem conta?</Text>
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text style={{ fontWeight: '700' }}>Entrar</Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  )
}
