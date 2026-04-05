import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gf: {
          black: "#0a0a0a",
          dark: "#111111",
          surface: "#1a1a1a",
          border: "#2a2a2a",
          muted: "#888888",
          pink: {
            DEFAULT: "#ff2d8a",
            light: "#ff6bb3",
            dark: "#cc1a6e",
            glow: "rgba(255, 45, 138, 0.15)",
          },
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}

export default config
