import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  server: {
    proxy: {
      "/api": {
        target: "https://petshop-vert-ten.vercel.app",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "src/pages/index.html"),
        produtos: resolve(__dirname, "src/pages/produtos.html"),
        servicos: resolve(__dirname, "src/pages/servicos.html"),
        contato: resolve(__dirname, "src/pages/contato.html"),
        login: resolve(__dirname, "src/pages/login.html"),
        admin: resolve(__dirname, "src/pages/admin.html"),
      },
    },
  },
});