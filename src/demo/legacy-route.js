/** 把原型的 hash 深链映射到 /experts/ 下的 Vue Router history 路径。 */
export function legacyLocation(hash) {
  const raw = String(hash || "").replace(/^#/, "");
  if (!raw.startsWith("/")) return null;
  const [path, query = ""] = raw.split("?");
  if (path === "/experts" || path === "/experts/new")
    return `/${path.endsWith("/new") ? "?create=1" : query ? "?" + query : ""}`;
  if (path === "/projects" || path === "/projects/new")
    return `/projects${path.endsWith("/new") ? "?create=1" : query ? "?" + query : ""}`;
  const task = path.match(/^\/experts\/([^/]+)\/tasks\/([^/]+)$/);
  if (task)
    return `/${encodeURIComponent(decodeURIComponent(task[1]))}/chat?conv=${encodeURIComponent(decodeURIComponent(task[2]))}`;
  const taskList = path.match(/^\/experts\/([^/]+)\/tasks$/);
  if (taskList)
    return `/${encodeURIComponent(decodeURIComponent(taskList[1]))}/chat`;
  const expert = path.match(/^\/experts\/([^/]+)$/);
  if (expert)
    return `/${encodeURIComponent(decodeURIComponent(expert[1]))}${query ? "?" + query : ""}`;
  const project = path.match(/^\/projects\/([^/]+)$/);
  if (project)
    return `/projects/${encodeURIComponent(decodeURIComponent(project[1]))}${query ? "?" + query : ""}`;
  return null;
}
