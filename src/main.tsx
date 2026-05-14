import { createRoot } from "react-dom/client";
import { useGLTF } from "@react-three/drei";
import App from "./App.tsx";
import "./index.css";

useGLTF.setDecoderPath("/draco/");

createRoot(document.getElementById("root")!).render(<App />);
