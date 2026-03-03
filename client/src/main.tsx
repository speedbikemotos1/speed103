import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import logoImg from "@assets/LOGOBranding_1771926826080.png";

const setFavicon = () => {
  if (typeof document === "undefined") return;
  let link =
    document.querySelector<HTMLLinkElement>("link[rel='icon']") ??
    document.createElement("link");

  link.rel = "icon";
  link.type = "image/png";
  link.href = logoImg;

  if (!link.parentNode) {
    document.head.appendChild(link);
  }
};

setFavicon();

createRoot(document.getElementById("root")!).render(<App />);
