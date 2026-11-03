/**
 * 部署前缀工具。
 *
 * GitHub Pages 的项目站点地址是 `https://<user>.github.io/<repo>/`，
 * public 下的资源必须带上 `/<repo>/` 前缀，否则线上 404。
 *
 * 但 `base` 只改写了 Vite 处理过的模块与 index.html 里的引用，
 * **不会**改写 JS 里字符串拼出来的 `/works-opt/x.webp`。
 * 所以 works.json / profile / 简历图这些绝对路径统一过一遍这里。
 */
const BASE = import.meta.env.BASE_URL;

/** `/works-opt/a.webp` → `/design-portfolio/works-opt/a.webp`（dev 下仍是原样） */
export function asset(path: string): string {
  if (!path.startsWith('/')) return path;
  return BASE.replace(/\/+$/, '') + path;
}
