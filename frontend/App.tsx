import HomePage from 'components/HomePage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './global.css';

export default function App() {
  return (
    <SafeAreaProvider>
      <HomePage />
    </SafeAreaProvider>
  );
}
