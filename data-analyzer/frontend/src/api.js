const BASE = "/analyzer/api";

async function jsonOrThrow(res) {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body && body.detail) detail = body.detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  upload(file) {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${BASE}/upload`, { method: "POST", body: fd }).then(jsonOrThrow);
  },
  column(id, name) {
    return fetch(
      `${BASE}/datasets/${id}/columns/${encodeURIComponent(name)}`
    ).then(jsonOrThrow);
  },
  insights(id) {
    return fetch(`${BASE}/datasets/${id}/insights`).then(jsonOrThrow);
  },
  preview(id, n = 50) {
    return fetch(`${BASE}/datasets/${id}/preview?n=${n}`).then(jsonOrThrow);
  },
  health() {
    return fetch(`${BASE}/health`).then(jsonOrThrow);
  },
};
