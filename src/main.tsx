import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { useGLTF } from "@react-three/drei"; useGLTF.setDecoderPath("/draco/");

createRoot(document.getElementById("root")!).render(<App />);
