import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/* Слои apps/web/src: app · routes · module(<имя>) · shared
     shared    ↛ modules, routes, app      shared внизу иерархии
     modules   ↛ routes, app               домен не знает о композиции
     modules/X ↛ modules/Y                 кросс-модульных импортов нет
     routes|shared|app → modules/*         только через index.ts                */
export default tseslint.config(
  // Отчёты и трейсы Playwright — сгенерированные артефакты (в т. ч. e2e/real/**), не исходники.
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/routeTree.gen.ts",
      "mockups/**",
      ".turbo/**",
      "**/playwright-report/**",
      "**/test-results/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: { project: "apps/web/tsconfig.json" } },
      "boundaries/elements": [
        { type: "app", pattern: "apps/web/src/app/**/*", mode: "full" },
        { type: "routes", pattern: "apps/web/src/routes/**/*", mode: "full" },
        { type: "module", pattern: "apps/web/src/modules/*/**/*", mode: "full", capture: ["moduleName"] },
        { type: "shared", pattern: "apps/web/src/shared/**/*", mode: "full" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "allow",
          rules: [
            {
              from: { type: "shared" },
              disallow: { to: { type: ["module", "routes", "app"] } },
              message: "shared/* не зависит от modules/routes/app — он внизу иерархии.",
            },
            {
              from: { type: "module" },
              disallow: { to: { type: ["routes", "app"] } },
              message: "modules/* не зависит от routes/app — домен не знает о композиции.",
            },
            {
              from: { type: "module", captured: { moduleName: "*" } },
              disallow: { to: { type: "module", captured: { moduleName: "!{{from.captured.moduleName}}" } } },
              message: "Кросс-модульный импорт. Поднимите общий код в shared/* или пробросьте через routes/.",
            },
            {
              from: [{ type: "routes" }, { type: "shared" }, { type: "app" }],
              disallow: { to: { type: "module", internalPath: "!index.ts" } },
              message: "Импорт внутренностей модуля. Используйте его index.ts.",
            },
          ],
        },
      ],
    },
  },
);
