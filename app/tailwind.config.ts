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
        // あいおい塾 ブランドカラー（ダークプレミアム）
        brand: {
          50:  "#060b18",
          100: "#0c1425",
          200: "#0f1e35",
          300: "#1a2d4a",
          400: "#243d5e",
          500: "#d4a843",
          600: "#c9a030",
          700: "#b8912e",
          800: "#a07a20",
          900: "#856315",
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
