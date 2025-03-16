/** @type {import("prettier").Config} */
const config = {
  printWidth: 120,
  tabWidth: 2,
  singleQuote: true,
  semi: true,
  trailingComma: "all",
  arrowParens: "always",
  plugins: ["prettier-plugin-tailwindcss"],
};

export default config;
