import { useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { FileText, Folder } from "lucide-react";

type FileMetadata = {
  name: string;
  is_dir: boolean;
  size_kb: number;
};

const styles = `
@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,600&display=swap");

:root {
  --bg: #f6f1e9;
  --bg-accent: #eadcc5;
  --ink: #1f2328;
  --muted: #6b6f76;
  --primary: #136f63;
  --primary-dark: #0f5a51;
  --card: #fffaf2;
  --border: #e2d4be;
  --chip: #f1e5cf;
  --danger: #b42318;
  --shadow: rgba(31, 35, 40, 0.12);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: "Newsreader", "Georgia", serif;
  color: var(--ink);
  background:
    radial-gradient(1200px 700px at 10% 20%, rgba(19, 111, 99, 0.12), transparent 60%),
    radial-gradient(900px 600px at 90% 10%, rgba(198, 145, 61, 0.12), transparent 55%),
    linear-gradient(140deg, var(--bg), var(--bg-accent));
}

#root {
  min-height: 100vh;
}

main {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
}

.app {
  width: min(1080px, 100%);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 28px;
  padding: 32px;
  box-shadow: 0 24px 60px var(--shadow);
  position: relative;
  overflow: hidden;
}

.app::before {
  content: "";
  position: absolute;
  inset: -80px -40px auto auto;
  width: 240px;
  height: 240px;
  background: radial-gradient(circle at 30% 30%, rgba(19, 111, 99, 0.25), transparent 70%);
  opacity: 0.8;
  pointer-events: none;
}

header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

h1 {
  margin: 0;
  font-family: "Space Grotesk", "Trebuchet MS", sans-serif;
  font-size: clamp(1.8rem, 2.8vw, 2.7rem);
  letter-spacing: -0.02em;
}

.subtitle {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 0.98rem;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
}

button {
  border: none;
  padding: 14px 20px;
  border-radius: 14px;
  font-family: "Space Grotesk", "Trebuchet MS", sans-serif;
  font-weight: 600;
  font-size: 1rem;
  color: #fff;
  background: linear-gradient(135deg, var(--primary), #1b8b7d);
  box-shadow: 0 12px 24px rgba(19, 111, 99, 0.35);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

button:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 28px rgba(19, 111, 99, 0.35);
}

button:active {
  transform: translateY(0);
}

button:disabled {
  cursor: wait;
  box-shadow: none;
  background: linear-gradient(135deg, #9bb9b2, #86a7a1);
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--chip);
  color: var(--muted);
  font-size: 0.85rem;
  border: 1px solid var(--border);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 0 4px rgba(19, 111, 99, 0.15);
}

.status.scanning .status-dot {
  background: #c46d0d;
  box-shadow: 0 0 0 4px rgba(196, 109, 13, 0.2);
}

.metrics {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  font-family: "Space Grotesk", "Trebuchet MS", sans-serif;
}

.metric-line {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink);
}

.metric-line span {
  font-variant-numeric: tabular-nums;
}

.location {
  color: var(--muted);
  font-size: 0.92rem;
}

.list {
  margin-top: 24px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 8px;
  max-height: 420px;
  overflow-y: auto;
  display: grid;
  gap: 8px;
}

.list-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fffaf3;
  border: 1px solid rgba(226, 212, 190, 0.6);
  animation: fadeUp 0.35s ease both;
}

.list-row.dir {
  background: #f6efe4;
}

.entry-name {
  font-family: "Space Grotesk", "Trebuchet MS", sans-serif;
  font-size: 0.95rem;
  word-break: break-word;
}

.entry-meta {
  font-size: 0.85rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.empty {
  padding: 28px;
  text-align: center;
  color: var(--muted);
  font-size: 0.95rem;
  border: 1px dashed var(--border);
  border-radius: 14px;
  background: #fffdf8;
}

.toast {
  position: absolute;
  right: 24px;
  bottom: 24px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.92rem;
  color: #fff;
  background: var(--danger);
  box-shadow: 0 10px 22px rgba(180, 35, 24, 0.35);
  animation: toastSlide 0.35s ease both;
  max-width: 300px;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes toastSlide {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 720px) {
  .app {
    padding: 24px;
  }

  .list {
    max-height: 360px;
  }
}
`;

function App() {
  const [status, setStatus] = useState<"Ready" | "Scanning">("Ready");
  const [entries, setEntries] = useState<FileMetadata[]>([]);
  const [selectedDir, setSelectedDir] = useState("");
  const [durationMs, setDurationMs] = useState(0);
  const [scannedEntries, setScannedEntries] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const fileCount = useMemo(
    () => entries.filter((entry) => !entry.is_dir).length,
    [entries],
  );
  const statusLabel =
    status === "Scanning"
      ? scannedEntries
        ? `Scanning ${scannedEntries.toLocaleString()} items...`
        : "Scanning..."
      : "Ready";

  const showError = (message: string) => {
    setToast(message);
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 4000);
  };

  const chooseDirectory = async () => {
    const selection = await open({
      directory: true,
      multiple: false,
      title: "Choose Directory",
    });
    if (!selection || Array.isArray(selection)) {
      return;
    }

    setSelectedDir(selection);
    setStatus("Scanning");
    setEntries([]);
    setDurationMs(0);
    setScannedEntries(0);
    const start = performance.now();
    let finished = false;
    let unlistenBatch: (() => void) | null = null;
    let unlistenProgress: (() => void) | null = null;
    let unlistenComplete: (() => void) | null = null;
    const finalize = () => {
      if (finished) {
        return;
      }
      finished = true;
      unlistenBatch?.();
      unlistenProgress?.();
      unlistenComplete?.();
      setStatus("Ready");
    };

    try {
      unlistenBatch = await listen<FileMetadata[]>("scan_batch", (event) => {
        setEntries((current) => [...current, ...event.payload]);
      });
      unlistenProgress = await listen<number>("scan_progress", (event) => {
        setScannedEntries(event.payload);
      });
      unlistenComplete = await listen<number>("scan_complete", (event) => {
        setScannedEntries(event.payload);
        setDurationMs(Math.round(performance.now() - start));
        finalize();
      });

      await invoke("scan_directory", {
        path: selection,
      });
    } catch (err) {
      const message =
        typeof err === "string"
          ? err
          : (err as { message?: string })?.message ?? "Unable to scan directory.";
      showError(message);
      finalize();
    }
  };

  return (
    <main>
      <style>{styles}</style>
      <section className="app">
        <header>
          <div>
            <h1>High-Performance File Scanner</h1>
            <p className="subtitle">
              Built to prove speed with instant scan metrics and clear metadata.
            </p>
          </div>
          <div className={`status ${status === "Scanning" ? "scanning" : ""}`}>
            <span className="status-dot" />
            {statusLabel}
          </div>
        </header>

        <div className="controls">
          <button type="button" onClick={chooseDirectory} disabled={status !== "Ready"}>
            Choose Directory
          </button>
        </div>

        <div className="metrics">
          <div className="metric-line">
            Scanned <span>{fileCount}</span> files in{" "}
            <span>{durationMs}</span> milliseconds.
          </div>
          <div className="location">
            {selectedDir ? `Directory: ${selectedDir}` : "No directory selected."}
          </div>
        </div>

        {entries.length ? (
          <div className="list">
            {entries.map((entry, index) => (
              <div
                key={`${entry.name}-${index}`}
                className={`list-row ${entry.is_dir ? "dir" : ""}`}
                style={{ animationDelay: `${index * 12}ms` }}
              >
                {entry.is_dir ? <Folder size={18} /> : <FileText size={18} />}
                <div className="entry-name">{entry.name}</div>
                <div className="entry-meta">
                  {entry.is_dir ? "Folder" : `${entry.size_kb.toFixed(1)} KB`}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No results yet. Choose a directory to scan.</div>
        )}

        {toast ? <div className="toast">{toast}</div> : null}
      </section>
    </main>
  );
}

export default App;
