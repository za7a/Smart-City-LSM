export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {
    colors: { bg: "var(--bg)", card: "var(--card)", ink: "var(--ink)", mut: "var(--mut)", line: "var(--bdr)", tint: "var(--tint)", bluet: "var(--bluet)", primary: "#30AFFF", gold: "#F0B429" },
    fontFamily: { sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"] } } },
};
