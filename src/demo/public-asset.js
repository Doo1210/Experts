/** Resolve public assets for both the host's /experts/ mount and GitHub Pages. */
export function publicAsset(source) {
  const value = String(source || "");
  if (!value || /^(?:data:|blob:|https?:\/\/)/i.test(value)) return value;
  const base = import.meta.env.BASE_URL || "/experts/";
  const relative = value.replace(/^\/experts\//i, "").replace(/^\/+/, "");
  return base + relative;
}
