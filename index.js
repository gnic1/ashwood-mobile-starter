// Ensure gesture handler is loaded before any navigation or UI code
import 'react-native-gesture-handler';

import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';
import App from './App';

// Quiet known, harmless warnings (we'll clean these later if they appear)
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// This wires App as the native entry for both Expo Go and a dev build
registerRootComponent(App);
