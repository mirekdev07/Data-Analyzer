module.exports = {
  apps: [
    {
      name: "analyzer-api",
      cwd: "/var/www/analyzer/backend",
      interpreter: "none",
      script: "/var/www/analyzer/backend/.venv/bin/uvicorn",
      args: "app.main:app --host 127.0.0.1 --port 8101 --workers 1",
      env: {
        ANALYZER_UPLOAD_DIR: "/var/www/analyzer/uploads",
        ANALYZER_DATASET_TTL_SECONDS: "3600",
        ANALYZER_CLEANUP_INTERVAL_SECONDS: "300",
        ANALYZER_MAX_UPLOAD_BYTES: "104857600",
        ANALYZER_PREVIEW_DEFAULT_ROWS: "50",
      },
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: "512M",
    },
  ],
};
