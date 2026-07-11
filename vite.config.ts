import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" gör att bygget fungerar oavsett under vilken sökväg
// appen hostas (GitHub Pages lägger den under /<repo>/).
export default defineConfig({
  base: "./",
  plugins: [react()],
});
