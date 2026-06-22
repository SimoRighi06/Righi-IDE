import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();
const app = express();

// Manteniamo l'origine fissa su localhost come richiesto
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey_righi_ide";

// ─── DB CONNECTION ────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => console.log("✓ MongoDB connesso"))
  .catch((err) => console.error("Errore connessione MongoDB:", err));

// ─── MODELS ──────────────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },
  avatar:    { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model("User", UserSchema);

const FileSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name:              { type: String, required: true },
  type:              { type: String, enum: ["file", "folder"], default: "file" },
  language:          { type: String, default: "Python" },
  rigContent:        { type: String, default: "" },
  translatedContent: { type: String, default: "" },
  parentId:          { type: mongoose.Schema.Types.ObjectId, ref: "File", default: null },
  isPublic:          { type: Boolean, default: false },
}, { timestamps: true });
const File = mongoose.model("File", FileSchema);

// ─── MIDDLEWARE DI AUTENTICAZIONE ─────────────────────────────────────────────
interface AuthRequest extends Request {
  user?: { id: string; name: string; email: string };
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Accesso negato. Token mancante." });
    return;
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; name: string; email: string };
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Token non valido o scaduto." });
  }
};

// ─── ROTTE DI AUTENTICAZIONE ──────────────────────────────────────────────────
app.post("/api/auth/register", async (req: Request, res: Response): Promise<any> => {
  const { name, email, password } = req.body;

  // ─── VALIDAZIONE DEI PARAMETRI (EMAIL E PASSWORD) ───
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: "Formato email non valido." });
  }

  // Almeno 8 caratteri, una maiuscola, una minuscola e un numero
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
  if (!password || !passwordRegex.test(password)) {
    return res.status(400).json({ 
      error: "La password deve contenere almeno 8 caratteri, una lettera maiuscola, una minuscola e un numero." 
    });
  }
  // ─────────────────────────────────────────────────────

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email già registrata" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashedPassword });

    const userPayload = { id: newUser._id.toString(), name: newUser.name, email: newUser.email };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ token, user: userPayload });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Credenziali non valide" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Credenziali non valide" });

    const userPayload = { id: user._id.toString(), name: user.name, email: user.email };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user: userPayload });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json(req.user);
});

// ─── ROTTE FILE CLOUD (CRUD) ──────────────────────────────────────────────────
app.get("/api/files", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const files = await File.find({ userId: req.user!.id }).sort({ updatedAt: -1 });
    res.json(files);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/files/public/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const file = await File.findById(req.params.id);
    if (!file || !file.isPublic) {
      return res.status(403).json({ error: "Questo file non è pubblico o non esiste." });
    }
    res.json(file);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/files", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, type, parentId } = req.body;
  try {
    const newFile = await File.create({
      userId: req.user!.id,
      name,
      type,
      parentId: parentId || null,
      rigContent: type === "file" ? 'CHIEDI "Come ti chiami?" Nome\nSTAMPA "Ciao " + Nome' : "",
      translatedContent: ""
    });
    res.status(201).json(newFile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/files/:id", authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  try {
    const updatedFile = await File.findOneAndUpdate(
      { _id: id, userId: req.user!.id },
      req.body,
      { new: true }
    );
    if (!updatedFile) return res.status(404).json({ error: "File non trovato" });
    res.json(updatedFile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/files/:id", authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;
  try {
    const deletedFile = await File.findOneAndDelete({ _id: id, userId: req.user!.id });
    if (!deletedFile) return res.status(404).json({ error: "File non trovato" });
    
    // Se è una cartella, eliminiamo anche i file figli ricorsivamente
    if (deletedFile.type === "folder") {
      await File.deleteMany({ parentId: id, userId: req.user!.id });
    }
    
    res.json({ message: "Eliminato con successo" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ROTTA AI DI TRADUZIONE (OTTIMIZZATA JSON CON COMMENTI LEGATI AL LINGUAGGIO) ───
const SUPPORTED_LANGUAGES = ["Python", "JavaScript", "TypeScript", "Java", "C#", "C++", "Kotlin", "Swift", "Go", "Rust"];

const buildSystemPrompt = (language: string) => {
  // Configura dinamicamente lo stile del commento in base al linguaggio target
  const commentSyntax = language === "Python" ? "#" : "//";

  return `Sei il motore di Righi-IDE. Traduci lo pseudocodice italiano fornito dall'utente in codice ${language} sintatticamente valido.
REGOLE RIGIDE:
1. Devi rispondere ESCLUSIVAMENTE con un oggetto JSON valido. È vietato qualsiasi testo prima o dopo il JSON.
2. L'oggetto JSON deve avere una singola chiave "code" contenente la stringa del codice tradotto.
3. Qualsiasi commento inserito all'interno del codice tradotto deve TASSATIVAMENTE usare la sintassi dei commenti propria di ${language} (ovvero il simbolo "${commentSyntax}"). Non mischiare mai stili differenti.
4. La prima riga del codice generato deve SEMPRE essere un commento con scritto esattamente: "${commentSyntax} Codice generato da Righi-IDE v2 (${language})".
5. Mappature logiche standard:
   - CHIEDI "testo" Nome -> Input/Lettura dati da tastiera salvata nella variabile Nome.
   - STAMPA "testo" -> Output a schermo.
   - RIPETI N VOLTE / MENTRE -> Cicli for / while.
   - SE / ALTRIMENTI SE / ALTRIMENTI -> Blocchi condizionali.

Esempio di output JSON richiesto:
{
  "code": "${commentSyntax} Codice generato da Righi-IDE v2 (${language})\\nNome = input(\\"Come ti chiami? \\")\\nprint(\\"Ciao \\" + Nome)"
}`;
};

app.post("/api/translate", async (req: Request, res: Response): Promise<any> => {
  const { prompt, language = "Python" } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt mancante" });

  const targetLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : "Python";

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" }, // Forziamo Groq a strutturare l'output come oggetto JSON
        messages: [
          { role: "system", content: buildSystemPrompt(targetLanguage) },
          { role: "user", content: prompt },
        ],
        temperature: 0.1, // Bassa temperatura per traduzioni più deterministiche e precise
      }),
    });

    const data = await r.json();
    if (!data.choices?.[0]?.message?.content) {
      return res.status(500).json({ error: "Risposta dall'API AI non valida" });
    }

    // Parsiamo il JSON testuale ritornato dall'AI ed estraiamo il codice pulito
    const parsedData = JSON.parse(data.choices[0].message.content);
    res.json({ code: parsedData.code, language: targetLanguage });

  } catch (err: any) {
    console.error("Errore durante la traduzione dell'AI:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ROTTA DI ESECUZIONE JDOODLE ──────────────────────────────────────────────
app.post("/api/execute", async (req: Request, res: Response): Promise<any> => {
  const { code, language } = req.body;
  
  const JDOODLE_MAP: Record<string, { language: string; versionIndex: string }> = {
    Java:       { language: "java", versionIndex: "4" }, 
    "C++":      { language: "cpp17", versionIndex: "1" },
    "C#":       { language: "csharp", versionIndex: "4" }, 
    Kotlin:     { language: "kotlin", versionIndex: "3" },
    Swift:      { language: "swift", versionIndex: "4" }, 
    Go:         { language: "go", versionIndex: "4" },
    Rust:       { language: "rust", versionIndex: "4" },
  };

  const target = JDOODLE_MAP[language];
  if (!target) return res.status(400).json({ error: "Linguaggio non supportato per l'esecuzione remota" });

  try {
    const r = await fetch("https://api.jdoodle.com/v1/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        script: code,
        language: target.language,
        versionIndex: target.versionIndex,
        clientId: process.env.JDOODLE_CLIENT_ID,
        clientSecret: process.env.JDOODLE_CLIENT_SECRET,
      }),
    });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ROTTA DI TRADUZIONE INVERSA ──────────────────────────────────────────────
app.post("/api/reverse-translate", async (req: Request, res: Response): Promise<any> => {
  const { code, language } = req.body;
  if (!code) return res.status(400).json({ error: "Codice mancante" });

  const reverseSystemPrompt = `Sei il motore inverso di Righi-IDE.
Prendi in input del codice scritto in ${language} e traducilo nello pseudocodice parlato italiano ".rig".
REGOLE RIGIDE:
1. Rispondi ESCLUSIVAMENTE con un oggetto JSON valido: { "rigCode": "il tuo codice .rig" }.
2. Usa le parole chiave del linguaggio .rig: STAMPA, CHIEDI, SE/ALTRIMENTI/FINE, RIPETI N VOLTE, MENTRE, FUNZIONE.
3. Mantieni la logica pulita e semplice e commenta le parti commentate usando lo stile standard di .rig (i commenti in .rig iniziano con # o //, mantieni uno stile pulito).`;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: reverseSystemPrompt },
          { role: "user", content: code },
        ],
        temperature: 0.1,
      }),
    });

    const data = await r.json();
    const parsedData = JSON.parse(data.choices[0].message.content);
    res.json({ rigCode: parsedData.rigCode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AVVIO SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✓ Server backend avviato sulla porta ${PORT}`));