import { StyleSheet, Text, View } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600' },
});

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>About this app</Text>
    </View>
  );
}
