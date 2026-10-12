import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const roots = ["src"];
const forbidden = [
  [/\bfetch\s*\(/, "fetch 请求"],
  [/\baxios\b/, "Axios"],
  [/\bEventSource\b/, "真实 SSE"],
  [/\bXMLHttpRequest\b/, "XHR 请求"],
  [/(?:@\/|\.\.\/)api\//, "真实 API 模块导入"],
  [/\/api\/des\//, "DES API 路径"],
];
const failures = [];

function visit(relative) {
  const absolute = path.join(root, relative);
  const stat = fs.statSync(absolute);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(absolute))
      visit(path.join(relative, entry));
    return;
  }
  if (!/\.(?:js|vue|scss)$/.test(relative) || relative.endsWith(".test.js"))
    return;
  const source = fs.readFileSync(absolute, "utf8");
  for (const [pattern, label] of forbidden)
    if (pattern.test(source)) failures.push(`${relative}: ${label}`);
}

roots.forEach(visit);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else console.log("运行入口未引用真实请求、DES API 或 SSE。");
