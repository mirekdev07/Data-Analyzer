import { useEffect, useState } from "react";
import { api } from "./api.js";
import { C, fontStack, space } from "./styles/tokens.js";
import { Dropzone } from "./components/Dropzone.jsx";
import { Header } from "./components/Header.jsx";
import { ColumnGrid } from "./components/ColumnGrid.jsx";
import { Summary } from "./components/Summary.jsx";
import { PreviewTable } from "./components/PreviewTable.jsx";
import { Empty } from "./components/states/Empty.jsx";
import { Loading } from "./components/states/Loading.jsx";
import { ErrorBanner } from "./components/states/Error.jsx";

export default function App() {
  const [phase, setPhase] = useState("empty");
  const [dataset, setDataset] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  async function handleFile(file) {
    setPhase("uploading");
    setErrorMsg(null);
    setPreview(null);
    try {
      const res = await api.upload(file);
      setDataset(res);
      setPhase("ready");
      api
        .preview(res.dataset_id, 50)
        .then(setPreview)
        .catch(() => setPreview(null));
    } catch (err) {
      setErrorMsg(err.message || "Unknown error");
      setPhase("error");
    }
  }

  function reset() {
    setDataset(null);
    setPreview(null);
    setErrorMsg(null);
    setPhase("empty");
  }

  return (
    <div
      style={{
        maxWidth: 1240,
        margin: "0 auto",
        padding: `${space.xl}px ${space.lg}px ${space.xxl}px`,
        display: "flex",
        flexDirection: "column",
        gap: space.lg,
      }}
    >
      <BrandHeader />

      {phase !== "ready" && (
        <Dropzone onFile={handleFile} busy={phase === "uploading"} />
      )}

      {phase === "empty" && <Empty />}
      {phase === "uploading" && <Loading />}
      {phase === "error" && (
        <ErrorBanner message={errorMsg} onRetry={reset} />
      )}

      {phase === "ready" && dataset && (
        <>
          <Header summary={dataset.summary} onReset={reset} />
          <SectionTitle title="Columns" subtitle={`${dataset.columns.length} detected`} />
          <ColumnGrid datasetId={dataset.dataset_id} columns={dataset.columns} />
          <SectionTitle title="Summary" subtitle="auto-generated insights" />
          <Summary datasetId={dataset.dataset_id} />
          {preview && (
            <>
              <SectionTitle
                title="Preview"
                subtitle={`first ${preview.rows.length} rows`}
              />
              <PreviewTable columns={preview.columns} rows={preview.rows} />
            </>
          )}
        </>
      )}

      <Footer />
    </div>
  );
}

function BrandHeader() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: space.md,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          fontFamily: fontStack.display,
          fontWeight: 800,
          fontSize: 32,
          letterSpacing: -1,
          color: C.text,
        }}
      >
        Data Analyzer
      </div>
      <div
        style={{
          fontFamily: fontStack.mono,
          fontSize: 12,
          color: C.muted,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        CSV · JSON · Excel → instant statistics
      </div>
    </header>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: space.sm,
        marginTop: space.md,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: fontStack.display,
          fontWeight: 700,
          fontSize: 22,
          color: C.text,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <span
          style={{
            fontFamily: fontStack.mono,
            fontSize: 11,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: C.muted,
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer
      style={{
        marginTop: space.xl,
        paddingTop: space.md,
        borderTop: `1px solid ${C.border}`,
        color: C.faint,
        fontFamily: fontStack.mono,
        fontSize: 11,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        textAlign: "center",
      }}
    >
      Files are processed on the server and removed after 1 hour.
    </footer>
  );
}
