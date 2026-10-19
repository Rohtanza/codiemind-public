import { Appearance, Text, View } from 'react-native';

export default function Banner() {
  const isDark = Appearance.getColorScheme() === 'dark';
  return (
    <View style={{ padding: 16, backgroundColor: isDark ? '#222' : '#ddd' }}>
      <Text style={{ color: isDark ? '#fff' : '#000' }}>Welcome</Text>
    </View>
  );
}
