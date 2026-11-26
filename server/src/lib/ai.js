import { MAX_OPTIONS, MAX_OPTION_LENGTH } from "../utils/pollValidation.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 30000;

// Erreur "propre" : le message peut être montré à l'utilisateur (aucun détail sensible).
export class AIError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "AIError";
    this.status = status;
  }
}

// Extrait et valide le JSON renvoyé par l'IA : { question, options: [...] }
export const parseAIResponse = (content, count) => {
  if (typeof content !== "string" || !content.trim()) {
    throw new AIError("Réponse de l'IA vide ou invalide. Réessayez.");
  }

  let text = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new AIError("Réponse de l'IA mal structurée. Réessayez.");
  }

  let data;
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new AIError("Réponse de l'IA mal structurée. Réessayez.");
  }

  const question = typeof data.question === "string" ? data.question.trim().slice(0, 300) : "";
  if (!question || !Array.isArray(data.options)) {
    throw new AIError("Réponse de l'IA incomplète. Réessayez.");
  }

  // Nettoyage : textes uniquement, trim, longueur max, sans doublons
  const seen = new Set();
  const options = [];
  for (const raw of data.options) {
    const value = typeof raw === "string" ? raw : raw?.text ?? raw?.option ?? "";
    const opt = String(value).trim().slice(0, MAX_OPTION_LENGTH);
    if (opt && !seen.has(opt.toLowerCase())) {
      seen.add(opt.toLowerCase());
      options.push(opt);
    }
  }

  if (options.length < 2) {
    throw new AIError("L'IA n'a pas fourni assez de propositions valides. Réessayez.");
  }

  return { question, options: options.slice(0, Math.min(count, MAX_OPTIONS)) };
};

// Appel à l'API d'IA générative (OpenRouter) : uniquement côté serveur,
// la clé API ne quitte jamais le backend.
export const generatePollFromTheme = async ({ theme, count }) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY manquante dans le .env du serveur");
    throw new AIError("La génération par IA n'est pas disponible pour le moment.", 503);
  }

  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  const messages = [
    {
      role: "system",
      content:
        "Tu génères des sondages. Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, " +
        'au format {"question": "...", "options": ["...", "..."]}. ' +
        "La question doit être pertinente et claire. Les propositions doivent être cohérentes avec la question, " +
        "formulées de manière neutre, courtes (60 caractères max), distinctes entre elles. " +
        "Écris dans la même langue que le thème fourni.",
    },
    {
      role: "user",
      content: `Thème : ${theme}\nNombre de propositions : ${count}`,
    },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5173",
        "X-Title": "OPINOVA",
      },
      body: JSON.stringify({ model, messages, temperature: 0.8, max_tokens: 600 }),
    });
  } catch (error) {
    console.error("AI request failed:", error.name, error.message);
    throw new AIError(
      error.name === "AbortError"
        ? "Le service IA met trop de temps à répondre. Réessayez."
        : "Le service IA est indisponible. Réessayez plus tard.",
      503
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("AI API error:", response.status, body.slice(0, 300));
    if (response.status === 429) {
      throw new AIError("Trop de requêtes vers le service IA. Réessayez dans un instant.", 429);
    }
    throw new AIError("Le service IA est indisponible. Réessayez plus tard.", 503);
  }

  const data = await response.json().catch(() => null);
  return parseAIResponse(data?.choices?.[0]?.message?.content, count);
};





// Générer des idées de thèmes pour aider l'utilisateur à choisir un sujet
export const generateThemeSuggestions = async ({ category = "Tous les domaines" }) => {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error("OPENROUTER_API_KEY manquante dans le .env du serveur");
    throw new AIError("La génération par IA n'est pas disponible pour le moment.", 503);
  }

  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  const messages = [
    {
      role: "system",
      content:
        "Tu aides les utilisateurs à trouver des idées de sujets pour créer des sondages. " +
        "Propose exactement 5 thèmes variés, intéressants, simples et adaptés à un sondage. " +
        "Chaque thème doit être court et précis. " +
        "Réponds UNIQUEMENT avec un JSON valide au format " +
        '{"themes": ["Thème 1", "Thème 2", "Thème 3", "Thème 4", "Thème 5"]}. ' +
        "N'ajoute aucun texte avant ou après le JSON. " +
        "Utilise le français pour les suggestions.",
    },
    {
      role: "user",
      content: `Domaine souhaité : ${category}`,
    },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;

  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5173",
        "X-Title": "OPINOVA",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.9,
        max_tokens: 400,
      }),
    });
  } catch (error) {
    console.error("AI theme suggestions failed:", error.name, error.message);

    throw new AIError(
      error.name === "AbortError"
        ? "Le service IA met trop de temps à répondre. Réessayez."
        : "Le service IA est indisponible. Réessayez plus tard.",
      503
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("AI API error:", response.status, body.slice(0, 300));

    if (response.status === 429) {
      throw new AIError("Trop de requêtes vers le service IA. Réessayez dans un instant.", 429);
    }

    throw new AIError("Le service IA est indisponible. Réessayez plus tard.", 503);
  }

  const data = await response.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new AIError("L'IA n'a pas proposé de thèmes valides. Réessayez.");
  }

  let parsed;

  try {
    const cleaned = content
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end <= start) {
      throw new Error("Invalid JSON");
    }

    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new AIError("La réponse de l'IA est mal structurée. Réessayez.");
  }

  if (!Array.isArray(parsed.themes)) {
    throw new AIError("L'IA n'a pas fourni de liste de thèmes valide.");
  }

  const themes = [
    ...new Set(
      parsed.themes
        .filter((item) => typeof item === "string")
        .map((item) => item.trim().slice(0, 100))
        .filter((item) => item.length >= 3)
    ),
  ].slice(0, 5);

  if (themes.length < 3) {
    throw new AIError("L'IA n'a pas fourni assez de thèmes valides. Réessayez.");
  }

  return { themes };
};

// ---------------------------------------------------------------------------
// Assistant conversationnel (chat libre avec l'IA)
// ---------------------------------------------------------------------------
const ASSISTANT_SYSTEM_PROMPT =
  "Tu es l'assistant IA d'OPINOVA, une plateforme de sondages et de votes en ligne (slogan : « Your opinion, your impact »). " +
  "Tu aides les utilisateurs à : trouver des idées de sondages, rédiger des questions claires et neutres, " +
  "proposer des options de réponse équilibrées, choisir entre « sondage » (résultats en direct) et « vote » (résultat après clôture), " +
  "comprendre le fonctionnement de la plateforme (groupes et sous-groupes, publication d'un brouillon, clôture automatique, un vote par personne) " +
  "et interpréter des résultats. Tu peux aussi répondre à des questions générales, brièvement. " +
  "Réponds dans la langue de l'utilisateur (français, arabe, darija marocaine écrite en lettres latines, anglais...). " +
  "Sois clair, chaleureux et concis. Quand tu proposes un sondage, donne la question puis la liste des propositions. " +
  "Tu n'as accès à aucune donnée privée de la plateforme : n'invente jamais de statistiques, de comptes ou de résultats.";

export const chatWithAssistant = async ({ messages }) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY manquante dans le .env du serveur");
    throw new AIError("L'assistant IA n'est pas disponible pour le moment.", 503);
  }

  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5173",
        "X-Title": "OPINOVA",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: ASSISTANT_SYSTEM_PROMPT }, ...messages],
        temperature: 0.7,
        max_tokens: 700,
      }),
    });
  } catch (error) {
    console.error("AI chat failed:", error.name, error.message);
    throw new AIError(
      error.name === "AbortError"
        ? "L'assistant met trop de temps à répondre. Réessayez."
        : "L'assistant est indisponible. Réessayez plus tard.",
      503
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("AI chat API error:", response.status, body.slice(0, 300));
    if (response.status === 429) {
      throw new AIError("Trop de requêtes vers l'assistant. Réessayez dans un instant.", 429);
    }
    throw new AIError("L'assistant est indisponible. Réessayez plus tard.", 503);
  }

  const data = await response.json().catch(() => null);
  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) {
    throw new AIError("L'assistant n'a pas pu répondre. Réessayez.");
  }
  return reply.trim();
};


// ---------------------------------------------------------------------------
// Création d'un sondage à partir de la conversation avec l'assistant
// ---------------------------------------------------------------------------
export const generatePollFromConversation = async ({ messages }) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY manquante dans le .env du serveur");
    throw new AIError("L'assistant IA n'est pas disponible pour le moment.", 503);
  }

  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const instruction =
    "À partir de la conversation ci-dessus, construis le sondage dont il est question (le dernier sujet ou la dernière proposition validée par l'utilisateur). " +
    "Si l'assistant a déjà proposé une question et des options, reprends-les telles quelles. " +
    "Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format " +
    '{"question": "...", "options": ["...", "..."], "category": "sondage", "duration_hours": 24}. ' +
    '"category" vaut "sondage" (résultats visibles en direct) ou "vote" (résultats après la clôture). ' +
    '"duration_hours" est un entier entre 1 et 720. ' +
    "2 à 10 options courtes (100 caractères max), distinctes, neutres. Même langue que la conversation. " +
    'Si la conversation ne permet pas de déduire un sondage, réponds {"question": "", "options": []}.';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5173",
        "X-Title": "OPINOVA",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Tu extrais des sondages à partir de conversations." },
          ...messages,
          { role: "user", content: instruction },
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
    });
  } catch (error) {
    console.error("AI poll-from-chat failed:", error.name, error.message);
    throw new AIError(
      error.name === "AbortError"
        ? "Le service IA met trop de temps à répondre. Réessayez."
        : "Le service IA est indisponible. Réessayez plus tard.",
      503
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("AI poll-from-chat API error:", response.status, body.slice(0, 300));
    if (response.status === 429) {
      throw new AIError("Trop de requêtes vers le service IA. Réessayez dans un instant.", 429);
    }
    throw new AIError("Le service IA est indisponible. Réessayez plus tard.", 503);
  }

  const data = await response.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;

  let parsed;
  try {
    parsed = parseAIResponse(content, MAX_OPTIONS);
  } catch {
    throw new AIError("Je n'ai pas trouvé de sondage dans cette discussion. Décrivez d'abord ce que vous voulez demander.", 422);
  }

  // Champs complémentaires (catégorie, durée) : valeurs sûres par défaut
  let extra = {};
  try {
    const text = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    extra = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch {
    extra = {};
  }
  const category = extra.category === "vote" ? "vote" : "sondage";
  const hours = Math.round(Number(extra.duration_hours));
  const duration_hours = Number.isFinite(hours) ? Math.min(720, Math.max(1, hours)) : 24;

  return { ...parsed, category, duration_hours };
};
