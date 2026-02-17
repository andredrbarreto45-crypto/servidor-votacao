import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

const API_URL = "https://yellow-coins-beg.loca.lt";

export default function Login() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const router = useRouter();

  async function entrar() {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, senha })
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Erro', data.erro);
        return;
      }

      router.replace('/votacao');
    } catch (err) {
      Alert.alert('Erro', 'Não conectou ao servidor');
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Login do Vereador</Text>

      <TextInput
        placeholder="Usuário"
        value={login}
        onChangeText={setLogin}
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />

      <TextInput
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
        style={{ borderWidth: 1, marginBottom: 20, padding: 8 }}
      />

      <Button title="Entrar" onPress={entrar} />
    </View>
  );
}
