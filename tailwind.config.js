/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sec: {
          canvas: "#F4F7FB",
          surface: "#FFFFFF",
          text: "#172033",
          muted: "#64748B",
          blue: "#4F46E5",
          indigo: "#6366F1",
          coral: "#EA6F6C",
          orange: "#F49C0D",
          green: "#10B881",
          pink: "#EB4899",
          line: "#E4E9F2"
        }
      },
      boxShadow: { card: "0 2px 8px rgba(30, 41, 59, 0.035), 0 12px 30px rgba(30, 41, 59, 0.025)" },
      borderRadius: { card: "14px" }
    }
  },
  plugins: []
};
