import Vue from "vue";
import VueRouter from "vue-router";
import { legacyLocation } from "@/demo/legacy-route";

Vue.use(VueRouter);

const pagesBuild = import.meta.env.VITE_PAGES === "1";
const appBase = import.meta.env.BASE_URL || "/experts/";

const router = new VueRouter({
  mode: pagesBuild ? "hash" : "history",
  base: appBase,
  routes: [
    {
      path: "/",
      name: "experts",
      component: () => import("@/demo/pages/Experts.vue"),
    },
    {
      path: "/projects",
      name: "projects",
      component: () => import("@/demo/pages/Projects.vue"),
    },
    {
      path: "/projects/:id",
      name: "project",
      component: () => import("@/demo/pages/ProjectDetailPrototype.vue"),
    },
    {
      path: "/:id/chat",
      name: "chat",
      component: () => import("@/demo/pages/Chat.vue"),
    },
    {
      path: "/:id",
      name: "expert",
      component: () => import("@/demo/pages/ExpertManage.vue"),
    },
    { path: "*", redirect: "/" },
  ],
});

const legacy = legacyLocation(window.location.hash);
if (legacy) {
  const embed = new URLSearchParams(window.location.search).get("embed");
  const suffix =
    embed && !legacy.includes("embed=")
      ? legacy +
        (legacy.includes("?") ? "&" : "?") +
        "embed=" +
        encodeURIComponent(embed)
      : legacy;
  window.history.replaceState(
    null,
    "",
    pagesBuild ? appBase + "#" + suffix : "/experts" + suffix,
  );
}

// 宿主仍会传入身份参数；演示工程不读取身份，并立即从地址栏移除。
const cleanUrl = new URL(window.location.href);
let changed = false;
for (const key of ["token", "user_id", "org_id", "tenant_id"]) {
  if (cleanUrl.searchParams.has(key)) {
    cleanUrl.searchParams.delete(key);
    changed = true;
  }
}
if (changed)
  window.history.replaceState(
    null,
    "",
    cleanUrl.pathname + cleanUrl.search + cleanUrl.hash,
  );

router.beforeEach((to, from, next) => {
  if (
    from.query.embed &&
    !Object.prototype.hasOwnProperty.call(to.query, "embed")
  ) {
    next({
      path: to.path,
      query: { ...to.query, embed: from.query.embed },
      replace: true,
    });
  } else next();
});

export default router;
