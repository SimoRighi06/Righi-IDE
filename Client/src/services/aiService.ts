

/* const API_URL = 'http://localhost:5000/api/translate';

export const translateWithAI = async (
  naturalText: string,
  language: string = 'Python'
): Promise<string> => {
  try {
    const response = await axios.post(API_URL, {
      prompt: naturalText,
      language,
    });
    return response.data.code;
  } catch (error) {
    return `# Errore: assicurati che il server sia acceso (porta 5000)`;
  }
}; */

export const translateWithAI = async (prompt: string, language: string, signal?: AbortSignal) => {
  try {
    const res = await fetch("http://localhost:5000/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, language }),
      signal // <-- Aggiungiamo questo!
    });
    const data = await res.json();
    return data.code;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Traduzione annullata: utente sta ancora digitando.');
      throw error;
    }
    console.error("Errore API:", error);
    return "";
  }
};