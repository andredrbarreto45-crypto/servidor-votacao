import { View, Text, Button, Alert } from 'react-native';

const API_URL = "http://192.168.1.13:3000";

export default function Votacao() {

  async function votar(opcao) {
    try {
      const res = await fetch(`${API_URL}/votar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vereador_id: 1,
          materia_id: 2,
          opcao
        })
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Erro", data.erro);
      } else {
        Alert.alert("Sucesso", "Voto registrado!");
      }

    } catch (err) {
      Alert.alert("Erro", "Erro de conexão com o servidor");
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 10 }}>
      <Text style={{ fontSize: 24, textAlign: 'center' }}>
        Votação da Matéria
      </Text>

      <Button title="SIM" onPress={() => votar('SIM')} />
      <Button title="NÃO" onPress={() => votar('NAO')} />
      <Button title="ABSTENÇÃO" onPress={() => votar('ABSTENCAO')} />
    </View>
  );
}
