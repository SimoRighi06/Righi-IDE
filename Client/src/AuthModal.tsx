import { useState } from "react";
import { useAuth } from "./useAuth";
import { Button, Stack } from "react-bootstrap";
import { Cpu } from "lucide-react";

interface Props {
  onClose: () => void;
}

export const AuthModal = ({ onClose }: Props) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(""); // Pulisce errori precedenti
    
    // --- VALIDAZIONE FRONTEND ---
    if (mode === "register" && !name.trim()) {
      return setError("Il nome è obbligatorio.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return setError("Inserisci un indirizzo email valido.");
    }

    if (mode === "register") {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
      if (!passwordRegex.test(password)) {
        return setError("La password deve avere almeno 8 caratteri, un numero e una maiuscola.");
      }
    } else if (mode === "login" && !password) {
      // Nel login basta controllare che non sia vuota, i controlli complessi li fa in registrazione
      return setError("Inserisci la password.");
    }
    // ----------------------------

    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      onClose(); // Chiude il modal se tutto va bene
    } catch (e: any) {
      setError(e.response?.data?.error || "Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%",
    background: "#2d2d2d",
    border: "1px solid #444",
    color: "#fff",
    borderRadius: "6px",
    padding: "10px 12px",
    fontSize: "13px",
    fontFamily: "var(--font-mono)",
    outline: "none",
    boxSizing: "border-box",
  };

  const handleGoogleLogin = () => {
    localStorage.setItem("oauth_provider", "google");
    
    // Rileva automaticamente se siamo sul sito online o in locale
    const currentOrigin = window.location.origin; // Sarà http://localhost:5173 o il link di Vercel
    
    // Usa le variabili d'ambiente di Vite, oppure una stringa temporanea se preferisci inserirlo a mano
    const clientID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "IL_TUO_GOOGLE_CLIENT_ID_REALE";
    const scope = "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email";

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientID}&redirect_uri=${encodeURIComponent(currentOrigin)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  };

  const handleGithubLogin = () => {
    localStorage.setItem("oauth_provider", "github");
    
    // Rileva automaticamente se siamo sul sito online o in locale
    const currentOrigin = window.location.origin; // Evita di spaccare il redirectURI
    
    const clientID = import.meta.env.VITE_GITHUB_CLIENT_ID || "IL_TUO_GITHUB_CLIENT_ID_REALE";

    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientID}&redirect_uri=${encodeURIComponent(currentOrigin)}`;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#1e1e1e",
          border: "1px solid #333",
          borderRadius: "12px",
          padding: "32px",
          width: "360px",
          boxSizing: "border-box",
        }}
      >
        <div className="text-end">
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#666",
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="currentColor"
              className="bi bi-x-lg"
              viewBox="0 0 16 16"
            >
              <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z" />
            </svg>
          </button>
        </div>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <Cpu size={24} className="text-warning" />{" "}
          <div
            style={{
              color: "#f59e0b",
              fontWeight: 700,
              letterSpacing: "0.12em",
              fontSize: "16px",
            }}
          >
            RIGHI-IDE
          </div>
          <div style={{ color: "#666", fontSize: "12px", marginTop: "4px" }}>
            {mode === "login"
              ? "Accedi al tuo account"
              : "Crea un nuovo account"}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            background: "#111",
            borderRadius: "8px",
            padding: "3px",
            marginBottom: "20px",
          }}
        >
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              style={{
                flex: 1,
                padding: "7px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.06em",
                background: mode === m ? "#f59e0b" : "transparent",
                color: mode === m ? "#000" : "#666",
                fontWeight: mode === m ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              {m === "login" ? "ACCEDI" : "REGISTRATI"}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {mode === "register" && (
            <input
              placeholder="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inp}
            />
          )}
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inp}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inp}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>

        {error && (
          <div
            style={{
              color: "#f87171",
              fontSize: "12px",
              marginTop: "10px",
              textAlign: "center",
            }}
          >
            ✗ {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "18px",
            padding: "11px",
            background: loading ? "#555" : "#f59e0b",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: "13px",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
            transition: "background 0.15s",
          }}
        >
          {loading ? "..." : mode === "login" ? "ACCEDI" : "CREA ACCOUNT"}
        </button>
        <div className="text-center mt-3 mb-2 text-secondary small">
          oppure continua con
        </div>

        <Stack gap={2}>
          <Button
            variant="outline-dark"
            onClick={handleGoogleLogin}
            className="w-100  text-black bg-white"
          >
            Accedi con
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="currentColor"
              className="bi bi-google ms-1 mb-1"
              viewBox="0 0 16 16"
            >
              <path d="M15.545 6.558a9.4 9.4 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.7 7.7 0 0 1 5.352 2.082l-2.284 2.284A4.35 4.35 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.8 4.8 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.7 3.7 0 0 0 1.599-2.431H8v-3.08z" />
            </svg>
          </Button>
          <Button
            variant="outline-dark"
            onClick={handleGithubLogin}
            className="w-100 py-2 text-white border-white"
          >
            Accedi con
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="currentColor"
              className="bi bi-github ms-1 mb-1"
              viewBox="0 0 16 16"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
            </svg>
          </Button>
        </Stack>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            marginTop: "10px",
            padding: "8px",
            background: "none",
            color: "#555",
            border: "none",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          Continua senza account
        </button>
      </div>
    </div>
  );
};
