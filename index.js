import { registerRootComponent } from "expo";
import App from "./App.js"; // <-- force .js so Metro doesn't prefer an old .tsx
registerRootComponent(App);
