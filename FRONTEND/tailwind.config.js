/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "Apple Color Emoji",
          "Segoe UI Emoji"
        ]
      },
      boxShadow: {
        soft: "0 12px 30px rgba(2,6,23,.35)",
        card: "0 10px 25px rgba(2,6,23,.35)"
      }
    }
  },
  plugins: [require("@tailwindcss/forms")]
};

