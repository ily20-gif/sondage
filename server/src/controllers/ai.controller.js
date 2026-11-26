import { generatePollFromTheme, generateThemeSuggestions, chatWithAssistant, generatePollFromConversation, AIError } from "../lib/ai.js";
import { MAX_OPTIONS, MIN_OPTIONS } from "../utils/pollValidation.js";

// Limite simple en mémoire : 8 générations par minute et par utilisateur
const WINDOW_MS = 60 * 1000;
const MAX_CALLS = 8;
const calls = new Map();

const rateLimited = (userId) => {
  const now = Date.now();
  const recent = (calls.get(userId) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_CALLS) {
    calls.set(userId, recent);
    return true;
  }
  recent.push(now);
  calls.set(userId, recent);
  return false;
};

// POST /api/poll/generate  { theme, count }
// Renvoie une proposition { question, options } à vérifier / modifier par l'utilisateur.
// Rien n'est enregistré ici : le sondage est créé (en brouillon) après validation.
export const generatePoll = async (req, res) => {
  try {
    const theme = typeof req.body.theme === "string" ? req.body.theme.trim() : "";
    if (theme.length < 3 || theme.length > 200) {
      return res.status(400).json({ message: "Le thème doit contenir entre 3 et 200 caractères" });
    }

    const count = req.body.count === undefined ? 4 : Number(req.body.count);
    if (!Number.isInteger(count) || count < MIN_OPTIONS || count > MAX_OPTIONS) {
      return res.status(400).json({
        message: `Le nombre de propositions doit être entre ${MIN_OPTIONS} et ${MAX_OPTIONS}`,
      });
    }

    if (rateLimited(req.user.id)) {
      return res.status(429).json({ message: "Trop de générations. Patientez une minute." });
    }

    const generated = await generatePollFromTheme({ theme, count });
    return res.json({ ...generated, creation_mode: "ai" });
  } catch (error) {
    if (error instanceof AIError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Generate poll error:", error);
    return res.status(500).json({ message: "Erreur interne lors de la génération" });
  }
};

// POST /api/poll/suggest-themes
// Propose des thèmes à l'utilisateur
export const suggestThemes = async (req, res) => {
  try {
    const category =
      typeof req.body.category === "string"
        ? req.body.category.trim()
        : "Tous les domaines";

    if (category.length > 100) {
      return res.status(400).json({
        message: "La catégorie ne doit pas dépasser 100 caractères.",
      });
    }

    // Même limite que la génération des sondages
    if (rateLimited(req.user.id)) {
      return res.status(429).json({
        message: "Trop de générations. Patientez une minute.",
      });
    }

    const result = await generateThemeSuggestions({ category });

    return res.json(result);
  } catch (error) {
    if (error instanceof AIError) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    console.error("Suggest themes error:", error);

    return res.status(500).json({
      message: "Erreur interne lors de la suggestion des thèmes.",
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/ai/chat  { messages: [{ role: "user" | "assistant", content }] }
// Conversation libre avec l'assistant. L'historique est conservé côté client :
// le serveur ne stocke rien et ne garde que les derniers messages valides.
// ---------------------------------------------------------------------------
const CHAT_WINDOW_MS = 60 * 1000;
const CHAT_MAX_CALLS = 15;
const MAX_HISTORY = 20;
const MAX_MESSAGE_LENGTH = 2000;
const chatCalls = new Map();

const chatRateLimited = (userId) => {
  const now = Date.now();
  const recent = (chatCalls.get(userId) || []).filter((t) => now - t < CHAT_WINDOW_MS);
  if (recent.length >= CHAT_MAX_CALLS) {
    chatCalls.set(userId, recent);
    return true;
  }
  recent.push(now);
  chatCalls.set(userId, recent);
  return false;
};

export const chatAssistant = async (req, res) => {
  try {
    const raw = Array.isArray(req.body.messages) ? req.body.messages : [];

    // Seuls les rôles user/assistant venant du client sont acceptés (jamais « system »)
    const messages = raw
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim()
      )
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_LENGTH) }))
      .slice(-MAX_HISTORY);

    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return res.status(400).json({ message: "Écrivez un message pour l'assistant" });
    }

    if (chatRateLimited(req.user.id)) {
      return res.status(429).json({ message: "Trop de messages. Patientez une minute." });
    }

    const reply = await chatWithAssistant({ messages });
    return res.json({ reply });
  } catch (error) {
    if (error instanceof AIError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Chat assistant error:", error);
    return res.status(500).json({ message: "Erreur interne de l'assistant" });
  }
};


// POST /api/ai/poll-from-chat  { messages }
// Extrait un sondage (question, options, catégorie, durée) de la conversation.
// Rien n'est enregistré : le client préremplit le formulaire de création pour relecture.
export const pollFromChat = async (req, res) => {
  try {
    const raw = Array.isArray(req.body.messages) ? req.body.messages : [];
    const messages = raw
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim()
      )
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_LENGTH) }))
      .slice(-MAX_HISTORY);

    if (!messages.length) {
      return res.status(400).json({ message: "Discutez d'abord avec l'assistant de votre sondage" });
    }
    if (chatRateLimited(req.user.id)) {
      return res.status(429).json({ message: "Trop de requêtes. Patientez une minute." });
    }

    const poll = await generatePollFromConversation({ messages });
    return res.json({ ...poll, creation_mode: "ai" });
  } catch (error) {
    if (error instanceof AIError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Poll from chat error:", error);
    return res.status(500).json({ message: "Erreur interne lors de la création du sondage" });
  }
};
