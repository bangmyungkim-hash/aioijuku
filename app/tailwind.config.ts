import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f8f5ef",
          100: "#f0ece3",
          200: "#e8e0d0",
          300: "#d4c8a8",
          400: "#c4a870",
          500: "#b8872a",
          600: "#a07020",
          700: "#8a5c18",
          800: "#724810",
          900: "#5a3808",
        },
      },
      fontFamily: {
        sans: [
          '"Inter"',
          '"Noto Sans JP"',
          '"Hiragino Kaku Gothic ProN"',
          '"Meiryo"',
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
