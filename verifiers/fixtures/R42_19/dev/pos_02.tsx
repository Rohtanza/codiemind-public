import { StyleSheet, Text, View, useColorScheme } from 'react-native';

const light = StyleSheet.create({ card: { backgroundColor: '#f4f4f4' }, label: { color: '#111' } });
const dark = StyleSheet.create({ card: { backgroundColor: '#1c1c1e' }, label: { color: '#eee' } });

export function Card({ title }: { title: string }) {
  const styles = useColorScheme() === 'dark' ? dark : light;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{title}</Text>
    </View>
  );
}
