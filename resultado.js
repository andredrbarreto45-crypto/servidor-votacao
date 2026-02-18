import { View, Text, Button } from 'react-native';
import { useEffect, useState } from 'react';

const API_URL = "http://192.168.1.13:3000";

export default function Resultado() {
  const [dados, setDados] = useState({ sim: 0, nao: 0, abstencao: 0 });

  async function carregarResultado() {
    try {
      const res = await fetch(`${API_URL}/resultado`);
      const json = await res.json();
      setDados(json);
    } catch (err) {
      console.log("Erro ao carregar resultado");
    }
  }

  useEffect(() => {
    carregarResultado();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 10 }}>
      <Text style={{ fontSize: 28, textAlign: 'center' }}>Resultado</Text>

      <Text style={{ fontSize: 22, textAlign: 'center' }}>
        SIM: {dados.sim}
      </Text>

      <Text style={{ fontSize: 22, textAlign: 'center' }}>
        NÃO: {dados.nao}
      </Text>

      <Text style={{ fontSize: 22, textAlign: 'center' }}>
        ABSTENÇÃO: {dados.abstencao}
      </Text>

      <Button title="Atualizar" onPress={carregarResultado} />
    </View>
  );
}
