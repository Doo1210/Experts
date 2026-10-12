import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
const lock = JSON.parse(
  fs.readFileSync(path.join(root, "package-lock.json"), "utf8"),
);
const expected = {
  vue: "2.7.16",
  "vue-template-compiler": "2.7.16",
  "element-ui": "2.15.14",
  "vue-router": "3.6.5",
  sass: "1.97.3",
  jszip: "3.10.1",
  prettier: "3.9.6",
  vite: "5.4.21",
  "vite-plugin-vue2": "2.0.3",
};
const hostComparable = [
  "vue",
  "vue-template-compiler",
  "element-ui",
  "vue-router",
  "sass",
  "jszip",
  "prettier",
];
const errors = [];

for (const [name, version] of Object.entries(expected)) {
  const declared = pkg.dependencies?.[name] || pkg.devDependencies?.[name];
  const installed = lock.packages?.[`node_modules/${name}`]?.version;
  if (declared !== version)
    errors.push(
      `${name}: package.json=${declared || "missing"}, expected=${version}`,
    );
  if (installed !== version)
    errors.push(
      `${name}: package-lock=${installed || "missing"}, expected=${version}`,
    );
}

const hostArg = process.argv.indexOf("--host-lock");
if (hostArg !== -1) {
  const hostPath = process.argv[hostArg + 1];
  if (!hostPath || !fs.existsSync(hostPath))
    errors.push(`宿主锁文件不存在：${hostPath || "(未提供路径)"}`);
  else {
    const source = fs.readFileSync(hostPath, "utf8");
    for (const name of hostComparable) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = source.match(
        new RegExp(
          `^      ${escaped}:\\r?\\n        specifier: [^\\r\\n]+\\r?\\n        version: ([^\\r\\n]+)`,
          "m",
        ),
      );
      const hostVersion = match?.[1]?.match(/^\d+\.\d+\.\d+/)?.[0];
      if (hostVersion !== expected[name])
        errors.push(
          `${name}: 宿主=${hostVersion || "未找到"}, 新工程=${expected[name]}`,
        );
    }
  }
}

if (pkg.engines?.node !== "22.10.0")
  errors.push("Node engines 必须固定为 22.10.0");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    "演示工程依赖版本与宿主基线一致；Vue 与 vue-template-compiler 均为 2.7.16。",
  );
