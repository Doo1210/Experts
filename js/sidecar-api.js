/**
 * Sidecar API client — probes /healthz on startup, then uses the first reachable base.
 */
(function () {
  function normalizeBase(base) {
    var raw = String(base || "").trim();
    if (!raw) return "";
    return raw.replace(/\/+$/, "");
  }

  function uniquePush(list, value) {
    if (!value) return;
    if (list.indexOf(value) >= 0) return;
    list.push(value);
  }

  function healthUrl(apiBase) {
    return apiBase.replace(/\/api\/?$/, "") + "/healthz";
  }

  var configuredBase = normalizeBase(window.SIDECAR_API_BASE);
  var API_BASE_CANDIDATES = [];
  uniquePush(API_BASE_CANDIDATES, configuredBase);
  uniquePush(API_BASE_CANDIDATES, "http://127.0.0.1:8787/api");
  uniquePush(API_BASE_CANDIDATES, "http://127.0.0.1:8788/api");
  uniquePush(API_BASE_CANDIDATES, "http://127.0.0.1:8789/api");
  uniquePush(API_BASE_CANDIDATES, "http://localhost:8787/api");
  uniquePush(API_BASE_CANDIDATES, "http://localhost:8788/api");
  uniquePush(API_BASE_CANDIDATES, "http://localhost:8789/api");

  var API_BASE = API_BASE_CANDIDATES[0] || "http://127.0.0.1:8787/api";
  var lastError = null;
  var readyPromise = null;

  async function probeSidecarBase() {
    for (var i = 0; i < API_BASE_CANDIDATES.length; i++) {
      var base = API_BASE_CANDIDATES[i];
      try {
        var resp = await fetch(healthUrl(base), { method: "GET" });
        if (resp.ok) {
          API_BASE = base;
          lastError = null;
          return base;
        }
      } catch (_ignore) {}
    }
    lastError = {
      status: 0,
      code: "NETWORK_ERROR",
      message: "无法连接 sidecar。请先运行 start-demo.ps1，或通过 http://127.0.0.1:8086/index.html 打开页面（不要用 file://）。"
    };
    return null;
  }

  function ensureReady() {
    if (!readyPromise) {
      readyPromise = probeSidecarBase();
    }
    return readyPromise;
  }

  async function request(path, init, baseIndex) {
    await ensureReady();
    var idx = typeof baseIndex === "number" ? baseIndex : API_BASE_CANDIDATES.indexOf(API_BASE);
    if (idx < 0) idx = 0;
    var requestInit = init || {};

    for (var i = idx; i < API_BASE_CANDIDATES.length; i++) {
      var base = API_BASE_CANDIDATES[i];
      try {
        var resp = await fetch(base + path, requestInit);
        if (!resp.ok) {
          var body = null;
          try {
            body = await resp.json();
          } catch (_ignore2) {}
          lastError = {
            status: resp.status,
            code: (body && body.code) || "HTTP_" + resp.status,
            message: (body && body.message) || (body && body.detail) || ("请求失败: " + resp.status)
          };
          return null;
        }
        API_BASE = base;
        lastError = null;
        return await resp.json();
      } catch (err) {
        if (i === API_BASE_CANDIDATES.length - 1) {
          lastError = {
            status: 0,
            code: "NETWORK_ERROR",
            message: (err && err.message) || "网络请求失败"
          };
          return null;
        }
      }
    }
    return null;
  }

  window.SidecarApi = {
    probe: probeSidecarBase,
    ensureReady: ensureReady,
    getApiBase: function () {
      return API_BASE;
    },
    getLastError: function () {
      return lastError;
    },
    listExperts: function () {
      return request("/experts");
    },
    getExpert: function (profile) {
      return request("/experts/" + encodeURIComponent(profile));
    },
    syncProfiles: function () {
      return request("/experts/sync-profiles", { method: "POST" });
    },
    provisionBundledProfiles: function () {
      return request("/profiles/bundled/provision", { method: "POST" });
    },
    listBundledProfiles: function () {
      return request("/profiles/bundled");
    },
    listHermesProfiles: function () {
      return request("/profiles/hermes");
    },
    createExpert: function (payload) {
      return request("/experts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    },
    deleteExpert: function (profile) {
      return request("/experts/" + encodeURIComponent(profile), { method: "DELETE" });
    },
    patchExpert: function (profile, payload) {
      return request("/experts/" + encodeURIComponent(profile), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    },
    listTasks: function (profile) {
      return request("/experts/" + encodeURIComponent(profile) + "/tasks");
    },
    createTask: function (profile, title) {
      return request("/experts/" + encodeURIComponent(profile) + "/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || "新任务" })
      });
    },
    deleteTask: function (profile, taskId) {
      return request(
        "/experts/" + encodeURIComponent(profile) + "/tasks/" + encodeURIComponent(taskId),
        { method: "DELETE" }
      );
    },
    updateTask: function (profile, taskId, patch) {
      return request(
        "/experts/" + encodeURIComponent(profile) + "/tasks/" + encodeURIComponent(taskId),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch || {})
        }
      );
    },
    listMessages: function (profile, taskId) {
      return request("/experts/" + encodeURIComponent(profile) + "/tasks/" + encodeURIComponent(taskId) + "/messages");
    },
    sendMessage: function (profile, taskId, content) {
      return request("/experts/" + encodeURIComponent(profile) + "/tasks/" + encodeURIComponent(taskId) + "/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content })
      });
    },
    listArtifacts: function (profile, taskId) {
      return request("/experts/" + encodeURIComponent(profile) + "/tasks/" + encodeURIComponent(taskId) + "/artifacts");
    },
    listProgress: function (profile, taskId) {
      return request("/experts/" + encodeURIComponent(profile) + "/tasks/" + encodeURIComponent(taskId) + "/progress");
    },
    streamTaskEvents: function (profile, taskId, turnId, handlers) {
      handlers = handlers || {};
      return ensureReady().then(function () {
        var url = API_BASE
          + "/experts/" + encodeURIComponent(profile)
          + "/tasks/" + encodeURIComponent(taskId)
          + "/events?turn=" + encodeURIComponent(turnId);
        var es = new EventSource(url);
        function bind(type, fn) {
          if (!fn) return;
          es.addEventListener(type, function (ev) {
            var data = {};
            try {
              data = JSON.parse(ev.data || "{}");
            } catch (_ignore) {}
            fn(data);
          });
        }
        bind("reasoning.delta", handlers.onReasoningDelta);
        bind("message.delta", handlers.onMessageDelta);
        bind("tool.generating", handlers.onToolGenerating);
        bind("tool.started", handlers.onToolStarted);
        bind("tool.completed", handlers.onToolCompleted);
        bind("task.title", handlers.onTaskTitle);
        bind("turn.complete", handlers.onTurnComplete);
        bind("turn.error", handlers.onTurnError);
        es.onerror = function () {
          if (handlers.onError) handlers.onError(es);
        };
        return es;
      });
    },
    toggleExpertSkill: function (profile, name, enabled) {
      return request("/experts/" + encodeURIComponent(profile) + "/skills/toggle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, enabled: !!enabled })
      });
    },
    getExpertSkills: function (profile) {
      return request("/experts/" + encodeURIComponent(profile) + "/skills");
    },
    putExpertSkills: function (profile, payload) {
      return request("/experts/" + encodeURIComponent(profile) + "/skills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {})
      });
    },
    getExpertTools: function (profile) {
      return request("/experts/" + encodeURIComponent(profile) + "/tools");
    },
    putExpertTools: function (profile, payload) {
      return request("/experts/" + encodeURIComponent(profile) + "/tools", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {})
      });
    },
    listMaterials: function (profile) {
      return request("/experts/" + encodeURIComponent(profile) + "/materials");
    },
    uploadMaterial: function (profile, file) {
      var form = new FormData();
      form.append("file", file);
      return request("/experts/" + encodeURIComponent(profile) + "/materials", {
        method: "POST",
        body: form
      });
    },
    deleteMaterial: function (profile, materialId) {
      return request(
        "/experts/" + encodeURIComponent(profile) + "/materials/" + encodeURIComponent(materialId),
        { method: "DELETE" }
      );
    },
    listExpertArtifacts: function (profile, query) {
      var qs = "";
      if (query && query.taskId) qs += "?taskId=" + encodeURIComponent(query.taskId);
      if (query && query.type) qs += (qs ? "&" : "?") + "type=" + encodeURIComponent(query.type);
      return request("/experts/" + encodeURIComponent(profile) + "/artifacts" + qs);
    },
    getMemory: function (profile) {
      return request("/experts/" + encodeURIComponent(profile) + "/memory");
    },
    postMemory: function (profile, payload) {
      return request("/experts/" + encodeURIComponent(profile) + "/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {})
      });
    },
    deleteMemory: function (profile, entryId) {
      return request(
        "/experts/" + encodeURIComponent(profile) + "/memory/" + encodeURIComponent(entryId),
        { method: "DELETE" }
      );
    },
    getImChannels: function (profile) {
      return request("/experts/" + encodeURIComponent(profile) + "/im-channels");
    },
    putImChannels: function (profile, payload) {
      return request("/experts/" + encodeURIComponent(profile) + "/im-channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {})
      });
    },
    restartGateway: function (profile) {
      return request("/experts/" + encodeURIComponent(profile) + "/gateway/restart", {
        method: "POST"
      });
    },
    listPermissions: function (profile) {
      return request("/experts/" + encodeURIComponent(profile) + "/permissions");
    },
    createPermission: function (profile, payload) {
      return request("/experts/" + encodeURIComponent(profile) + "/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {})
      });
    },
    patchPermission: function (profile, permId, payload) {
      return request(
        "/experts/" + encodeURIComponent(profile) + "/permissions/" + encodeURIComponent(permId),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload || {})
        }
      );
    },
    deletePermission: function (profile, permId) {
      return request(
        "/experts/" + encodeURIComponent(profile) + "/permissions/" + encodeURIComponent(permId),
        { method: "DELETE" }
      );
    },
    applyPermissions: function (profile) {
      return request("/experts/" + encodeURIComponent(profile) + "/permissions/apply", { method: "POST" });
    }
  };
})();
