import { useState, useEffect, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Navbar as BsNavbar,
  Button,
  Stack,
  Form,
} from "react-bootstrap";
import {
  Play,
  Cpu,
  Terminal as TerminalIcon,
  Files,
  Download,
  Upload,
  Settings,
  FileCode2,
  ChevronDown,
  FolderClosed,
  Pencil,
  CornerDownRight,
  LogIn,
  LogOut,
  User,
} from "lucide-react";
import { translateWithAI } from "./services/aiService";
import { useAuth } from "./useAuth";
import { AuthModal } from "./AuthModal";
import { useCloudFiles } from "./Usecloudefiles";
import Editor, { useMonaco } from "@monaco-editor/react";

const App = () => {
  const { user, logout } = useAuth();
  const { files, createFile, saveFile, deleteFile } = useCloudFiles();

  const [showAuth, setShowAuth] = useState(false);
  const [naturalCode, setNaturalCode] = useState(
    'CHIEDI "Come ti chiami?" Nome\nSTAMPA "Ciao " + Nome',
  );
  const [pythonCode, setPythonCode] = useState("");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "Benvenuto in Righi-IDE. Scrivi il codice e premi ESEGUI.",
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [language, setLanguage] = useState("Python");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [fileName, setFileName] = useState("programma");
  const [isEditingName, setIsEditingName] = useState(false);
  const [activeTab, setActiveTab] = useState("explorer");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">(
    "saved",
  );

  const pyodideRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === "dark";

  // ── Pyodide ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const initPy = async () => {
      // @ts-ignore
      pyodideRef.current = await window.loadPyodide();
      setTerminalOutput((prev) => [...prev, "✓ Motore Python pronto."]);
    };
    initPy();
  }, []);

  // autocompletion .rig
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      // 1. Registriamo il nostro linguaggio personalizzato "rig"
      monaco.languages.register({ id: "rig" });

      // 2. Registriamo i suggerimenti di autocompletamento
      const completionProvider =
        monaco.languages.registerCompletionItemProvider("rig", {
          provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };

            const suggestions = [
              {
                label: "STAMPA",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: 'STAMPA "${1:testo}"',
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Stampa un testo o una variabile a schermo",
                range: range,
              },
              {
                label: "CHIEDI",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: 'CHIEDI "${1:Domanda?}" ${2:NomeVariabile}',
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation:
                  "Chiede un input all'utente e lo salva in una variabile",
                range: range,
              },
              {
                label: "SE (Condizione)",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText:
                  "SE ${1:condizione}\n\t${2:codice}\nALTRIMENTI\n\t${3:codice}\nFINE",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Blocco condizionale If/Else",
                range: range,
              },
              {
                label: "RIPETI",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: "RIPETI ${1:N} VOLTE\n\t${2:codice}\nFINE",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Ciclo For semplificato",
                range: range,
              },
              {
                label: "MENTRE",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: "MENTRE ${1:condizione}\n\t${2:codice}\nFINE",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Ciclo While",
                range: range,
              },
              {
                label: "FUNZIONE",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText:
                  "FUNZIONE ${1:nome}(${2:parametri})\n\t${3:codice}\n\tRITORNA ${4:valore}\nFINE",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Dichiarazione di una funzione",
                range: range,
              },
            ];

            return { suggestions: suggestions };
          },
        });

      // Pulizia quando il componente viene smontato
      return () => {
        completionProvider.dispose();
      };
    }
  }, [monaco]);

  // ── Auto-translate ─────────────────────────────────────────────────────────
  useEffect(() => {
    setSaveStatus("unsaved");
    const controller = new AbortController(); // Creiamo il controller

    const t = setTimeout(async () => {
      if (naturalCode.trim()) {
        try {
          // Passiamo il segnale alla funzione
          const translated = await translateWithAI(
            naturalCode,
            language,
            controller.signal,
          );
          if (translated) setPythonCode(translated);
        } catch (err: any) {
          // Ignoriamo l'errore se è stato annullato volontariamente
          if (err.name !== "AbortError")
            console.error("Translation failed", err);
        }
      }
    }, 800);

    // Quando l'utente digita un nuovo carattere, puliamo il timeout e annulliamo la fetch in corso
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [naturalCode, language]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        language === "Python" ? runPython() : runWithPiston();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [naturalCode, pythonCode, language, activeFileId]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getLangExt = (lang: string) =>
    ({
      python: "py",
      javascript: "js",
      typescript: "ts",
      java: "java",
      "c#": "cs",
      "c++": "cpp",
      kotlin: "kt",
      go: "go",
    })[lang.toLowerCase()] || "txt";

  const getMonacoLang = (lang: string) =>
    lang.toLowerCase() === "c#"
      ? "csharp"
      : lang.toLowerCase() === "c++"
        ? "cpp"
        : lang.toLowerCase();

  // ── Save to cloud ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setSaveStatus("saving");
    try {
      if (activeFileId) {
        await saveFile(activeFileId, {
          rigContent: naturalCode,
          translatedContent: pythonCode,
          language,
          name: `${fileName}.rig`,
        });
      } else {
        const f = await createFile(`${fileName}.rig`, "file", null);
        await saveFile(f._id, {
          rigContent: naturalCode,
          translatedContent: pythonCode,
          language,
        });
        setActiveFileId(f._id);
      }
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
    }
  };

  const handleOpenFile = (file: any) => {
    setActiveFileId(file._id);
    setFileName(file.name.replace(/\.rig$/, ""));
    setNaturalCode(file.rigContent || "");
    setPythonCode(file.translatedContent || "");
    setLanguage(file.language || "Python");
    setSaveStatus("saved");
  };

  const handleNewFile = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    const f = await createFile("nuovo_file.rig", "file", null);
    setActiveFileId(f._id);
    setFileName("nuovo_file");
    setNaturalCode("");
    setPythonCode("");
    setSaveStatus("saved");
  };

  // ── Run Python ─────────────────────────────────────────────────────────────
  const runPython = async () => {
    if (!pyodideRef.current) return;
    setIsRunning(true);
    setTerminalOutput(["--- Nuova Esecuzione ---"]);
    try {
      pyodideRef.current.setStdout({
        batched: (t: string) => setTerminalOutput((p) => [...p, t]),
      });
      await pyodideRef.current.runPythonAsync(`
import js
def input(prompt=""):
    result = js.prompt(str(prompt))
    return result if result is not None else ""
import builtins
builtins.input = input
`);
      await pyodideRef.current.runPythonAsync(pythonCode);
      setTerminalOutput((p) => [
        ...p,
        "\n✅ Esecuzione terminata con successo.",
      ]);
    } catch (err: any) {
      setTerminalOutput((p) => [...p, `❌ ERRORE PYTHON: ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  // ── Run other languages ────────────────────────────────────────────────────
  const runWithPiston = async () => {
    setIsRunning(true);
    setTerminalOutput(["--- Nuova Esecuzione ---"]);
    try {
      if (language === "JavaScript") {
        const logs: string[] = [];
        new Function("console", pythonCode)({
          log: (...a: any[]) => logs.push(a.join(" ")),
        });
        logs.forEach((l) => setTerminalOutput((p) => [...p, l]));
        setTerminalOutput((p) => [...p, "\n✅ Esecuzione terminata."]);
        return;
      }
      if (language === "TypeScript") {
        setTerminalOutput((p) => [
          ...p,
          "⚠ TypeScript: eseguito come JS (tipi ignorati)",
        ]);
        const stripped = pythonCode
          .replace(/:\s*\w+(\[\])?/g, "")
          .replace(/^export\s+/gm, "");
        const logs: string[] = [];
        new Function("console", stripped)({
          log: (...a: any[]) => logs.push(a.join(" ")),
        });
        logs.forEach((l) => setTerminalOutput((p) => [...p, l]));
        setTerminalOutput((p) => [...p, "\n✅ Esecuzione terminata."]);
        return;
      }
      const res = await fetch("http://localhost:5000/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pythonCode, language }),
      });
      const data = await res.json();
      if (data.error) {
        setTerminalOutput((p) => [...p, `❌ ${data.error}`]);
        return;
      }
      (data.output || "(nessun output)")
        .split("\n")
        .filter(Boolean)
        .forEach((l: string) => setTerminalOutput((p) => [...p, l]));
      if (data.cpuTime)
        setTerminalOutput((p) => [
          ...p,
          `\n✅ Terminato — CPU: ${data.cpuTime}s`,
        ]);
    } catch (err: any) {
      setTerminalOutput((p) => [...p, `❌ Errore: ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  /*   const handleReverseTranslate = async () => {
  try {
    const res = await fetch("http://localhost:5000/api/reverse-translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: pythonCode, language }),
    });
    const data = await res.json();
    if (data.rigCode) setNaturalCode(data.rigCode);
  } catch (err) {
    console.error("Errore traduzione inversa", err);
  }
}; */

  // ── Download local ─────────────────────────────────────────────────────────
  const downloadFile = (content: string, name: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    a.download = name;
    a.click();
  };

  const handleImportRig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name.replace(/\.rig$/i, ""));
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string")
        setNaturalCode(ev.target.result);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleSidebar = (tab: string) => {
    if (activeTab === tab && isSidebarOpen) setIsSidebarOpen(false);
    else {
      setActiveTab(tab);
      setIsSidebarOpen(true);
    }
  };

  // ── Save status indicator ──────────────────────────────────────────────────
  const saveColor =
    saveStatus === "saved"
      ? "#34d399"
      : saveStatus === "saving"
        ? "#f59e0b"
        : "#f87171";
  const saveLabel =
    saveStatus === "saved"
      ? "✓ Salvato"
      : saveStatus === "saving"
        ? "⏳ Salvataggio..."
        : "● Non salvato";

  function handleReverseTranslate(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    throw new Error("Function not implemented.");
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className={`vh-100 d-flex flex-column overflow-hidden ${isDark ? "bg-dark text-light" : "bg-light text-dark"}`}
    >
      {/* AUTH MODAL */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* NAVBAR */}
      <BsNavbar
        bg={isDark ? "black" : "light"}
        variant={isDark ? "dark" : "light"}
        className={`px-3 border-bottom ${isDark ? "border-secondary" : "border-secondary-subtle"}`}
        style={{ height: "50px" }}
      >
        <BsNavbar.Brand className="d-flex align-items-center gap-2">
          <Cpu size={24} className="text-warning" />
          <span
            className={`fw-bold fs-5 ${isDark ? "text-light" : "text-dark"}`}
          >
            RIGHI-IDE
          </span>
        </BsNavbar.Brand>

        {/* Account */}
        {user ? (
          <Stack direction="horizontal" gap={1}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 700,
                color: "#000",
              }}
            >
              {user.name[0].toUpperCase()}
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={logout}
              title="Disconnetti"
              className="p-1 text-secondary"
            >
              <LogOut size={18} />
            </Button>
          </Stack>
        ) : (
          <Button
            variant="outline-secondary"
            size="sm"
            className="d-flex align-items-center gap-1"
            onClick={() => setShowAuth(true)}
          >
            <LogIn size={18} /> Accedi
          </Button>
        )}

        {/* Save status */}
        <span
          style={{
            fontSize: "11px",
            color: saveColor,
            marginLeft: "16px",
            fontFamily: "monospace",
          }}
        >
          {saveLabel}
        </span>

        <Stack direction="horizontal" gap={2} className="ms-auto">
          {/* Save button */}
          <Button
            variant="outline-warning"
            size="sm"
            onClick={handleSave}
            style={{ fontSize: "12px", fontFamily: "monospace" }}
          >
            <Download size={13} style={{ marginRight: 4 }} />
            {user ? "SALVA" : "SALVA (accedi)"}
          </Button>

          {/* Inserisci questo bottone subito PRIMA del selettore del linguaggio o vicino al tasto ESEGUI */}
          {/* <Button
            variant="outline-secondary"
            size="sm"
            className="me-2 text-warning border-secondary"
            onClick={handleReverseTranslate}
            title="Traduci il codice straniero in pseudocodice .rig"
          >
            ← Traduzione Inversa
          </Button> */}

          {/* Language selector */}
          <Form.Select
            size="sm"
            style={{ width: "140px" }}
            className={
              isDark
                ? "bg-dark text-light border-secondary"
                : "bg-white text-dark"
            }
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {[
              "Python",
              "JavaScript",
              "TypeScript",
              "Java",
              "C#",
              "C++",
              "Kotlin",
              "Go",
            ].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Form.Select>

          {/* Run button */}
          <Button
            variant="warning"
            size="sm"
            className="fw-bold d-flex align-items-center gap-1"
            onClick={language === "Python" ? runPython : runWithPiston}
            disabled={isRunning}
          >
            <Play size={16} fill="currentColor" />
            {isRunning ? "ESECUZIONE..." : "ESEGUI"}
          </Button>
        </Stack>
      </BsNavbar>

      {/* BODY */}
      <div className="d-flex flex-grow-1 overflow-hidden">
        {/* ACTIVITY BAR */}
        <div
          className={`d-flex flex-column align-items-center py-3 border-end ${isDark ? "border-secondary" : "border-secondary-subtle"}`}
          style={{
            width: "50px",
            backgroundColor: isDark ? "#181818" : "#e1e1e1",
          }}
        >
          <Button
            variant="link"
            className={`p-2 mb-2 ${activeTab === "explorer" && isSidebarOpen ? (isDark ? "text-warning" : "text-primary") : "text-secondary"}`}
            onClick={() => toggleSidebar("explorer")}
            title="Esplora Risorse"
          >
            <Files size={24} strokeWidth={1.5} />
          </Button>
          <Button
            variant="link"
            className={`p-2 ${activeTab === "settings" && isSidebarOpen ? (isDark ? "text-warning" : "text-primary") : "text-secondary"}`}
            onClick={() => toggleSidebar("settings")}
            title="Impostazioni"
          >
            <Settings size={24} strokeWidth={1.5} />
          </Button>
        </div>

        {/* SIDEBAR */}
        {isSidebarOpen && (
          <div
            className={`d-flex flex-column border-end ${isDark ? "border-secondary" : "border-secondary-subtle"}`}
            style={{
              width: "260px",
              backgroundColor: isDark ? "#252526" : "#f3f3f3",
            }}
          >
            {/* ── EXPLORER ── */}
            {activeTab === "explorer" && (
              <>
                <div
                  className={`px-3 py-2 text-uppercase fw-bold border-bottom d-flex align-items-center justify-content-between ${isDark ? "text-secondary border-secondary" : "text-muted border-secondary-subtle"}`}
                  style={{ fontSize: "11px", letterSpacing: "0.08em" }}
                >
                  Esplora Risorse
                  {user && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 text-secondary"
                      onClick={handleNewFile}
                      title="Nuovo file"
                    >
                      <FileCode2 size={14} />
                    </Button>
                  )}
                </div>

                <div className="p-2" style={{ flex: 1, overflowY: "auto" }}>
                  {/* Current project */}
                  <div
                    className={`d-flex align-items-center gap-1 mb-2 px-1 ${isDark ? "text-light" : "text-dark"}`}
                  >
                    <ChevronDown size={16} />
                    <FolderClosed size={16} className="text-warning" />
                    <span className="fw-bold small">PROGETTO_ATTUALE</span>
                  </div>

                  {/* .rig file */}
                  <div
                    className={`d-flex align-items-center justify-content-between px-3 py-1 rounded ${isDark ? "text-warning bg-secondary bg-opacity-25" : "text-primary bg-secondary bg-opacity-10"}`}
                    style={{ minHeight: "32px" }}
                  >
                    <div className="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden">
                      <FileCode2 size={16} className="flex-shrink-0" />
                      {isEditingName ? (
                        <Form.Control
                          size="sm"
                          value={fileName}
                          autoFocus
                          style={{ height: "20px" }}
                          className={`p-0 px-1 font-monospace ${isDark ? "bg-dark text-light border-warning" : ""}`}
                          onChange={(e) =>
                            setFileName(
                              e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""),
                            )
                          }
                          onBlur={() => setIsEditingName(false)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setIsEditingName(false);
                          }}
                        />
                      ) : (
                        <span
                          className="small font-monospace text-truncate"
                          onDoubleClick={() => setIsEditingName(true)}
                        >
                          {fileName}.rig
                        </span>
                      )}
                    </div>
                    {!isEditingName && (
                      <Button
                        variant="link"
                        className="p-0 text-secondary ms-2"
                        onClick={() => setIsEditingName(true)}
                      >
                        <Pencil size={12} />
                      </Button>
                    )}
                  </div>

                  {/* translated file */}
                  <div
                    className="d-flex align-items-center gap-2 px-3 py-1 mt-1"
                    style={{ marginLeft: "12px" }}
                  >
                    <CornerDownRight
                      size={14}
                      className="text-secondary flex-shrink-0"
                    />
                    <FileCode2
                      size={14}
                      className="text-secondary flex-shrink-0"
                    />
                    <span className="small font-monospace text-truncate text-secondary">
                      {fileName}.{getLangExt(language)}
                    </span>
                  </div>

                  {/* Cloud files */}
                  {user && files.length > 0 && (
                    <>
                      <div
                        className={`mt-3 mb-1 px-1 d-flex align-items-center gap-1 ${isDark ? "text-secondary" : "text-muted"}`}
                        style={{ fontSize: "11px", letterSpacing: "0.06em" }}
                      >
                        <ChevronDown size={14} />
                        <FolderClosed size={14} />
                        <span className="fw-bold">I MIEI FILE</span>
                      </div>
                      {files.map((f) => (
                        <div
                          key={f._id}
                          onClick={() => handleOpenFile(f)}
                          className={`d-flex align-items-center gap-2 px-3 py-1 rounded`}
                          style={{
                            cursor: "pointer",
                            minHeight: "28px",
                            background:
                              activeFileId === f._id
                                ? isDark
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.08)"
                                : "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (activeFileId !== f._id)
                              (
                                e.currentTarget as HTMLElement
                              ).style.background = isDark
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(0,0,0,0.04)";
                          }}
                          onMouseLeave={(e) => {
                            if (activeFileId !== f._id)
                              (
                                e.currentTarget as HTMLElement
                              ).style.background = "transparent";
                          }}
                        >
                          <FileCode2
                            size={14}
                            className="text-info flex-shrink-0"
                          />
                          <span
                            className="small font-monospace text-truncate"
                            style={{ color: isDark ? "#9cdcfe" : "#0070c1" }}
                          >
                            {f.name}
                          </span>
                          <span
                            className="ms-auto"
                            style={{ fontSize: "10px", color: "#555" }}
                          >
                            {f.language}
                          </span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Not logged in prompt */}
                  {!user && (
                    <div
                      className="mt-3 px-2 text-center"
                      style={{ fontSize: "12px", color: "#666" }}
                    >
                      <User
                        size={20}
                        style={{ marginBottom: "6px", opacity: 0.4 }}
                      />
                      <div>Accedi per salvare i file nel cloud</div>
                      <Button
                        variant="outline-warning"
                        size="sm"
                        className="mt-2 w-100"
                        style={{ fontSize: "11px" }}
                        onClick={() => setShowAuth(true)}
                      >
                        Accedi / Registrati
                      </Button>
                    </div>
                  )}
                </div>

                {/* File actions */}
                <div
                  className={`p-3 border-top ${isDark ? "border-secondary" : "border-secondary-subtle"}`}
                >
                  <span className="text-secondary small fw-bold mb-2 d-block">
                    AZIONI FILE
                  </span>
                  <Stack gap={2}>
                    <input
                      type="file"
                      accept=".rig"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      onChange={handleImportRig}
                    />
                    <Button
                      variant="outline-info"
                      size="sm"
                      className="d-flex align-items-center justify-content-center gap-2 w-100"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={14} /> Importa .rig
                    </Button>
                    <Button
                      variant={isDark ? "outline-light" : "outline-dark"}
                      size="sm"
                      className="d-flex align-items-center justify-content-center gap-2 w-100"
                      onClick={() =>
                        downloadFile(naturalCode, `${fileName}.rig`)
                      }
                    >
                      <Download size={14} /> Scarica .rig
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      className="d-flex align-items-center justify-content-center gap-2 w-100 fw-bold"
                      onClick={() =>
                        downloadFile(
                          pythonCode,
                          `${fileName}.${getLangExt(language)}`,
                        )
                      }
                    >
                      <Download size={14} /> Scarica .{getLangExt(language)}
                    </Button>
                  </Stack>
                </div>
              </>
            )}

            {/* ── SETTINGS ── */}
            {activeTab === "settings" && (
              <div className="p-3">
                <p
                  className={`fw-bold mb-3 ${isDark ? "text-light" : "text-dark"}`}
                >
                  Impostazioni
                </p>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-secondary fw-bold mb-1">
                    TEMA COLORI
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={theme}
                    onChange={(e) =>
                      setTheme(e.target.value as "dark" | "light")
                    }
                    className={
                      isDark ? "bg-dark text-light border-secondary" : ""
                    }
                  >
                    <option value="dark">Scuro (Dark)</option>
                    <option value="light">Chiaro (Light)</option>
                  </Form.Select>
                </Form.Group>
                <hr
                  className={
                    isDark ? "border-secondary" : "border-secondary-subtle"
                  }
                />
                <div style={{ fontSize: "11px", color: "#666" }}>
                  <span className="d-block fw-bold">Righi-IDE Engine</span>
                  <span className="d-block">Versione: 2.0.0</span>
                  {user && (
                    <span className="d-block mt-1" style={{ color: "#f59e0b" }}>
                      Account: {user.email}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* EDITORS + TERMINAL */}
        <Container
          fluid
          className="p-0 d-flex flex-column flex-grow-1 overflow-hidden"
        >
          <Row className="g-0 flex-grow-1">
            <Col
              md={6}
              className={`h-100 border-end position-relative ${isDark ? "border-secondary" : "border-secondary-subtle"}`}
            >
              <div className="position-absolute top-0 end-0 p-2 z-3 text-secondary small font-monospace select-none">
                {fileName}.rig
              </div>
              <Editor
                height="100%"
                language="rig"
                theme={isDark ? "vs-dark" : "light"}
                value={naturalCode}
                onChange={(v) => setNaturalCode(v || "")}
                options={{
                  fontSize: 16,
                  minimap: { enabled: false },
                  padding: { top: 16 },
                }}
              />
            </Col>
            <Col
              md={6}
              className={`h-100 position-relative ${isDark ? "bg-black" : "bg-white"}`}
            >
              <div className="position-absolute top-0 end-0 p-2 z-3 text-secondary small font-monospace select-none">
                {fileName}.{getLangExt(language)}
              </div>
              <Editor
                height="100%"
                language={getMonacoLang(language)}
                theme={isDark ? "vs-dark" : "light"}
                value={pythonCode}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  padding: { top: 16 },
                }}
              />
            </Col>
          </Row>

          {/* Terminal */}
          <div
            className={`p-2 border-top ${isDark ? "bg-black border-secondary" : "bg-light border-secondary-subtle"}`}
            style={{ height: "30%" }}
          >
            <div className="d-flex align-items-center gap-2 mb-2 text-secondary px-2">
              <TerminalIcon size={14} />
              <small className="fw-bold">TERMINALE DI OUTPUT</small>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  color: "#555",
                }}
              >
                Ctrl+Enter per eseguire · Ctrl+S per salvare
              </span>
            </div>
            <div
              className="h-100 overflow-auto px-3 font-monospace small pb-4"
              style={{
                backgroundColor: isDark ? "#050505" : "#fff",
                color: isDark ? "#4ade80" : "#000",
              }}
            >
              {terminalOutput.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
};

export default App;
