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
  for (const [pattern, label] of forbidden) {
    // Only project-bundled sample downloads may use fetch. The source module
    // must not contain a service origin, proxy path, upload or API endpoint.
    if (relative === "src/demo/file-preview.js" && label === "fetch 请求") {
      if (
        /https?:|127\.0\.0\.1|localhost|fileUpload|onlinePreview|VITE_KK|method\s*:/.test(
          source,
        ) ||
        !source.includes("acceptance-fixtures/")
      )
        failures.push(`${relative}: 示例读取包含外部服务或非静态请求`);
      continue;
    }
    if (pattern.test(source)) failures.push(`${relative}: ${label}`);
  }
}

roots.forEach(visit);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else
  console.log("仅允许读取随项目部署的静态样例；无预览服务、业务 API 或 SSE。");
