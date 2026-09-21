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
        graffiti: ["'Hachi Maru Pop'", "'Yomogi'", "cursive"],
        handwriting: ["'Yomogi'", "'Zen Maru Gothic'", "cursive"],
        title: ["'Kaisei Decol'", "'Zen Maru Gothic'", "serif"],
      },
      colors: {
        marche: {
          bg: "#FAF6F0",
          paper: "#FDFBF7",
          olive: "#4A6B5D",
          "olive-dark": "#365245",
          "olive-light": "#6B8E7D",
          terracotta: "#C86D51",
          "terracotta-dark": "#A6533A",
          "terracotta-light": "#DF8C72",
          mustard: "#E0A96D",
          "mustard-light": "#F0C495",
          brown: "#4A3E38",
          ink: "#2D2622",
        },
        olive: {
          DEFAULT: "#4A6B5D",
          dark: "#365245",
          light: "#6B8E7D",
        },
        terracotta: {
          DEFAULT: "#C86D51",
          dark: "#A6533A",
          light: "#DF8C72",
        },
        mustard: {
          DEFAULT: "#E0A96D",
          light: "#F0C495",
        },
        kinari: {
          DEFAULT: "#FAF6F0",
          paper: "#FDFBF7",
        },
      },
      boxShadow: {
        signboard: "2px 2px 0px 0px #2D2622",
        "signboard-lg": "3px 3px 0px 0px #2D2622",
        "signboard-xl": "4px 4px 0px 0px #2D2622",
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
