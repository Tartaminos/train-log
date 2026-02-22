import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>train-log</Text>
        <Text style={styles.subtitle}>Projeto Expo + TypeScript + expo-router</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  title: {
    color: '#e2e8f0',
    fontSize: 30,
    fontWeight: '700'
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 16
  }
});
