import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: "#0b0f14",
        panel: "#131923",
        border: "#1f2937",
        accent: "#3b82f6"
      }
    }
  },
  plugins: []
};

export default config;
