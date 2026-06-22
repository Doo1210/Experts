(function () {
  var params = new URLSearchParams(window.location.search);
  var mode = String(params.get("mode") || "").toLowerCase();
  var apiBase = String(params.get("apiBase") || "").trim();

  window.SIDECAR_API_BASE = "";
  window.DEV_MOCK = true;

  if (mode === "sidecar" || mode === "api") {
    window.SIDECAR_API_BASE = apiBase || "http://127.0.0.1:8787/api";
    window.DEV_MOCK = false;
  }
})();
