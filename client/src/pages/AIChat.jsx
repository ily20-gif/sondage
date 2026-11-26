import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Bot, PlusCircle, Send, Sparkles, Trash2, User2 } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { sendAssistantMessage, createPollDraftFromChat } from "../services/ai.service";
import { getErrorMessage } from "../lib/errorHandler";

const SUGGESTIONS = [
  "Donne-moi 5 idées de sondages pour des étudiants",
  "Écris une question neutre pour savoir si les cours du soir sont utiles",
  "Quelle différence entre un sondage et un vote ?",
  "Comment bien choisir la durée d'un sondage ?",
];

const MAX_LENGTH = 2000;

export default function AIChat() {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]); // { role: "user" | "assistant", content }
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const navigate = useNavigate();
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const reply = await sendAssistantMessage(next);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      toast.error(getErrorMessage(err));
      // On redonne le texte à l'utilisateur pour qu'il puisse réessayer
      setMessages(messages);
      setInput(content);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Transforme la discussion en brouillon de sondage, puis ouvre le formulaire prérempli
  const buildPoll = async () => {
    if (building || loading || !messages.length) return;
    setBuilding(true);
    try {
      const draft = await createPollDraftFromChat(messages);
      toast.success("Sondage prêt : relisez-le puis enregistrez.");
      navigate("/polls/create", { state: { draft } });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBuilding(false);
    }
  };

  const clear = () => {
    if (messages.length && window.confirm("Effacer la conversation ?")) setMessages([]);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8">
      <div className="page-hero mb-5 flex items-center justify-between gap-4 p-6 text-white">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
            <Bot size={24} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Assistant IA</h1>
            <p className="text-sm">Idées de sondages, questions bien écrites, aide sur la plateforme.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={clear}
          disabled={!messages.length}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/25 disabled:opacity-40"
        >
          <Trash2 size={15} /> Effacer
        </button>
      </div>

      <div className="flex h-[62vh] min-h-[420px] flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-600">
                <Sparkles size={26} />
              </span>
              <p className="text-lg font-bold text-slate-900">Bonjour {user?.fullName?.split(" ")[0] || ""} 👋</p>
              <p className="mb-5 mt-1 max-w-sm text-sm text-slate-500">Posez votre question, ou essayez l'une de ces idées :</p>
              <div className="flex max-w-xl flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-left text-sm font-medium text-violet-700 hover:bg-violet-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const mine = m.role === "user";
            return (
              <div key={i} className={`flex items-end gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${
                    mine ? "bg-slate-800" : "bg-gradient-to-br from-violet-600 to-pink-500"
                  }`}
                >
                  {mine ? <User2 size={16} /> : <Bot size={16} />}
                </span>
                <div
                  className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    mine ? "rounded-br-md bg-violet-600 text-white" : "rounded-bl-md bg-slate-100 text-slate-800"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-end gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-pink-500 text-white">
                <Bot size={16} />
              </span>
              <div className="flex gap-1 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3.5" aria-label="L'assistant écrit">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-slate-100 p-3">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={buildPoll}
              disabled={building || loading}
              className="mb-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110 disabled:opacity-60"
            >
              <PlusCircle size={16} /> {building ? "Création du sondage…" : "Créer un sondage à partir de cette discussion"}
            </button>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={MAX_LENGTH}
              rows={1}
              placeholder="Écrivez votre message… (Entrée pour envoyer)"
              className="max-h-40 min-h-[46px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              aria-label="Envoyer"
              className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-2xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        L'assistant peut se tromper : vérifiez les informations importantes. Prêt à créer ?{" "}
        <Link to="/polls/create" className="font-semibold text-violet-600 hover:underline">
          Créer un sondage
        </Link>
      </p>
    </div>
  );
}
