import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/auth": {
        target: "http://localhost:8002",
        changeOrigin: true,
      },
      "/client": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
      "/model": {
        target: "http://localhost:8003",
        changeOrigin: true,
      },
    },
  },
});
