/* eslint-disable no-undef -- скрипт исполняется Node, а не браузером:
   process, console, fetch и URL здесь глобальные. Общий eslint.config.mjs
   про Node-окружение не знает, а править его ради одного файла незачем. */

// Генерация типов контракта из openapi.json бэкенда (ARCHITECTURE.md, 8.5).
//
//   pnpm --filter @partiya/api-contracts generate [путь-к-openapi.json]
//
// Путь берётся из аргумента, затем из переменной PARTIYA_OPENAPI, затем по умолчанию —
// снимок в соседнем репозитории (`partiya-api/docs/openapi.json`, коммитится вместе с кодом).
// Можно указать и URL живого сервера: http://localhost:8000/api/v1/openapi.json.
//
// Результат — два файла в src/generated/, оба правятся только этим скриптом:
//   openapi.ts — вывод openapi-typescript: paths, components, operations;
//   index.ts   — именованные псевдонимы для схем, чтобы не писать components["schemas"][…].

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(packageRoot, "src/generated");

const DEFAULT_SPEC = resolve(packageRoot, "../../../partiya-api/docs/openapi.json");
const specArg = process.argv[2] ?? process.env.PARTIYA_OPENAPI ?? DEFAULT_SPEC;
const isRemote = /^https?:\/\//.test(specArg);
const specPath = isRemote ? specArg : resolve(process.cwd(), specArg);

/** Шапка сгенерированного файла: чтобы никто не начал править его руками. */
function banner(kind) {
  return [
    "/* НЕ ПРАВИТЬ РУКАМИ.",
    ` * ${kind}`,
    " * Источник: openapi.json бэкенда partiya-api (ARCHITECTURE.md, 8.5).",
    " * Обновить: pnpm --filter @partiya/api-contracts generate",
    " */",
    "",
    "",
  ].join("\n");
}

/** Имена схем из спецификации — по ним строятся псевдонимы. */
async function schemaNames() {
  const raw = isRemote
    ? await fetch(specPath).then((response) => response.text())
    : await readFile(specPath, "utf8");
  const spec = JSON.parse(raw);
  return Object.keys(spec.components?.schemas ?? {}).sort();
}

/** Файл с псевдонимами: Problem вместо components["schemas"]["Problem"]. */
function aliasesSource(names) {
  const lines = [
    banner("Именованные псевдонимы схем контракта."),
    'import type { components, operations, paths } from "./openapi";',
    "",
    "export type { components, operations, paths };",
    "",
    "/** Все схемы одним объектом — на случай динамического доступа. */",
    'export type Schemas = components["schemas"];',
    "",
  ];
  for (const name of names) {
    lines.push(`export type ${name} = Schemas[${JSON.stringify(name)}];`);
  }
  lines.push("");
  return lines.join("\n");
}

const ast = await openapiTS(isRemote ? new URL(specPath) : pathToFileURL(specPath), {
  // Поля без `required` остаются необязательными — как их и отдаёт serde.
  alphabetize: true,
  // Пустой объект в спецификации — это `Record<string, never>`, а не `unknown`:
  // ошибок «свойство существует» на пустом теле так не будет.
  emptyObjectsUnknown: false,
});

await mkdir(outDir, { recursive: true });
await writeFile(
  resolve(outDir, "openapi.ts"),
  banner("Типы путей, операций и схем OpenAPI.") + astToString(ast),
  "utf8",
);
await writeFile(resolve(outDir, "index.ts"), aliasesSource(await schemaNames()), "utf8");

console.log(`@partiya/api-contracts: типы обновлены из ${specPath}`);
