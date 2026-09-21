import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/types/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Zen Maru Gothic'", "-apple-system", "sans-serif"],
      },
      colors: {
        marche: {
          bg: "#FAF6F0",
          paper: "#FDFBF7",
          olive: "#4A6B5D",
          "olive-dark": "#365245",
          terracotta: "#C86D51",
          mustard: "#E0A96D",
          brown: "#4A3E38",
          ink: "#2D2622",
        },
      },
      keyframes: {
        "fade-in": {
          "from": { opacity: "0" },
          "to": { opacity: "1" },
        },
        "slide-up-fade": {
          "from": { opacity: "0", transform: "translateY(1rem)" },
          "to": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-bounce": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out forwards",
        "slide-up-fade": "slide-up-fade 0.4s ease-out forwards",
        "pop": "pop-bounce 0.2s ease-in-out",
      },
    },
  },
  plugins: [],
};
export default config;
