/**
 * Sidecar API client (best effort, with graceful fallback).
 */
(function () {
  var API_BASE = window.SIDECAR_API_BASE || "http://localhost:8787/api";
  var lastError = null;

  async function request(path, init) {
    try {
      var resp = await fetch(API_BASE + path, init || {});
      if (!resp.ok) {
        var body = null;
        try {
          body = await resp.json();
        } catch (_ignore) {}
        lastError = {
          status: resp.status,
          code: (body && body.code) || "HTTP_" + resp.status,
          message: (body && body.message) || (body && body.detail) || ("请求失败: " + resp.status)
        };
        return null;
      }
      lastError = null;
      return await resp.json();
    } catch (err) {
      lastError = {
        status: 0,
        code: "NETWORK_ERROR",
        message: (err && err.message) || "网络请求失败"
      };
      return null;
    }
  }

  window.SidecarApi = {
    getLastError: function () {
      return lastError;
    },
    listExperts: function () {
      return request("/experts");
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
    }
  };
})();
