import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createPoll,
  generatePollWithAI,
  suggestThemesWithAI,
} from "../../services/poll.service";
import { getErrorMessage } from "../../lib/errorHandler";
import toast from "react-hot-toast";
import { AuthContext } from "../../context/AuthContext";
import { fetchGroups } from "../../services/group.service";

export default function CreatePoll() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  // Brouillon venant de l'assistant IA (page /assistant) : l'utilisateur relit avant d'enregistrer
  const draft = location.state?.draft;
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState(""); // "" = sondage public
  const [question, setQuestion] = useState(draft?.question || "");
  const [options, setOptions] = useState(
    Array.isArray(draft?.options) && draft.options.length >= 2 ? draft.options : ["", ""]
  );
  const [category, setCategory] = useState(draft?.category === "vote" ? "vote" : "sondage");
  const [endTime, setEndTime] = useState(() => {
    if (!draft?.duration_hours) return "";
    // format attendu par <input type="datetime-local"> (heure locale)
    const d = new Date(Date.now() + draft.duration_hours * 3600 * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [message, setMessage] = useState("");

  // Suggestions de thèmes par IA
  const [suggestionCategory, setSuggestionCategory] =
    useState("Tous les domaines");
  const [suggestedThemes, setSuggestedThemes] = useState([]);
  const [suggestingThemes, setSuggestingThemes] = useState(false);

  // Génération par IA
  const [theme, setTheme] = useState("");
  const [aiCount, setAiCount] = useState(4);
  const [generating, setGenerating] = useState(false);
  const [aiUsed, setAiUsed] = useState(!!draft); // le brouillon vient de l'IA (même modifié)

  useEffect(() => {
    fetchGroups()
      .then(setGroups)
      .catch(() => {}); // sans groupes, le sondage reste simplement public
  }, []);

  // Groupes dans lesquels l'utilisateur peut publier (admin : tous), triés « DUT, DUT › DAIA, ... »
  const groupChoices = useMemo(() => {
    const allowed = groups.filter((g) => user?.role === "admin" || g.hasAccess);
    const byId = new Map(groups.map((g) => [g.id, g]));
    return allowed
      .map((g) => ({
        id: g.id,
        label: g.parent_id ? `${byId.get(g.parent_id)?.name || ""} › ${g.name}` : g.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [groups, user]);

  const handleSuggestThemes = async () => {
    setSuggestingThemes(true);
    setSuggestedThemes([]);
    setMessage("");

    try {
      const data = await suggestThemesWithAI({
        category: suggestionCategory,
      });

      setSuggestedThemes(data.themes || []);

      if (!data.themes?.length) {
        setMessage("Aucun thème proposé. Réessayez.");
      } else {
        toast.success("Voici des idées de thèmes pour votre sondage !");
      }
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setSuggestingThemes(false);
    }
  };

  const handleGenerate = async () => {
    if (theme.trim().length < 3) {
      setMessage("Saisissez un thème (3 caractères minimum)");
      return;
    }
    setGenerating(true);
    setMessage("");
    try {
      const data = await generatePollWithAI({
        theme: theme.trim(),
        count: aiCount,
      });
      setQuestion(data.question);
      setOptions(data.options);
      setAiUsed(true);
      toast.success("Proposition générée : vérifiez, modifiez ou régénérez.");
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const addOption = () => options.length < 10 && setOptions([...options, ""]);
  const removeOption = (index) =>
    options.length > 2 && setOptions(options.filter((_, i) => i !== index));

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedOptions = options.map((opt) => opt.trim());

    if (!question.trim() || trimmedOptions.some((opt) => !opt)) {
      setMessage("Veuillez remplir tous les champs et options");
      return;
    }
    if (trimmedOptions.some((opt) => opt.length > 100)) {
      setMessage("Une option ne doit pas dépasser 100 caractères");
      return;
    }

    const uniqueOptions = new Set(trimmedOptions);
    if (uniqueOptions.size !== trimmedOptions.length) {
      setMessage("Toutes les options doivent être uniques");
      return;
    }

    try {
      await createPoll({
        question,
        options: trimmedOptions,
        category,
        // datetime-local est sans fuseau : on envoie un ISO UTC pour éviter tout décalage
        end_time: new Date(endTime).toISOString(),
        creation_mode: aiUsed ? "ai" : "manual",
        group_id: groupId || null,
      });
      setQuestion("");
      setOptions(["", ""]);
      setCategory("sondage");
      setEndTime("");
      setGroupId("");
      setMessage("");
      setAiUsed(false);
      toast.success(
        "Brouillon créé. Validez-le et publiez-le depuis votre tableau de bord.",
      );
      navigate("/polls/dashboard");
    } catch (err) {
      console.error(err);
      setMessage(getErrorMessage(err));
    }
  };

  return (
    <div className="px-4 py-8 sm:px-6">
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="page-hero">
        <div>
          <span className="page-hero-kicker">Nouveau</span>
          <h1>Créer un sondage</h1>
          <p>Rédigez-le vous-même ou laissez l'IA proposer une question et des réponses.</p>
        </div>
      </header>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60 sm:p-8">

      {message && (
        <div className="mb-6 p-3 rounded bg-red-50 text-red-700 text-center font-medium">
          {message}
        </div>
      )}

      {/* Génération intelligente par IA */}
      {/* Génération intelligente par IA */}
      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
        <h3 className="mb-1 font-semibold text-blue-900">
          ✨ Créer un sondage avec l'IA
        </h3>

        <p className="mb-4 text-sm text-blue-800/80">
          Vous avez déjà un thème ? Saisissez-le directement. Vous ne savez pas
          quoi choisir ? L'IA peut vous proposer des idées.
        </p>

        {/* Suggestion de thèmes */}
        <div className="mb-4 rounded-lg border border-blue-100 bg-white p-3">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            💡 Je cherche une idée de thème
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={suggestionCategory}
              onChange={(e) => setSuggestionCategory(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="Tous les domaines">Tous les domaines</option>
              <option value="Éducation">Éducation</option>
              <option value="Technologie">Technologie</option>
              <option value="Sport">Sport</option>
              <option value="Santé">Santé</option>
              <option value="Environnement">Environnement</option>
              <option value="Vie quotidienne">Vie quotidienne</option>
              <option value="Culture et loisirs">Culture et loisirs</option>
            </select>

            <button
              type="button"
              onClick={handleSuggestThemes}
              disabled={suggestingThemes}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {suggestingThemes
                ? "Recherche d'idées..."
                : "✨ Suggérer des thèmes"}
            </button>
          </div>

          {/* Résultats des suggestions */}
          {suggestedThemes.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Choisissez un thème :
              </p>

              <div className="flex flex-wrap gap-2">
                {suggestedThemes.map((suggestedTheme, index) => (
                  <button
                    key={`${suggestedTheme}-${index}`}
                    type="button"
                    onClick={() => {
                      setTheme(suggestedTheme);
                      toast.success("Thème sélectionné !");
                    }}
                    className={`rounded-full border px-3 py-2 text-sm transition ${
                      theme === suggestedTheme
                        ? "border-blue-600 bg-blue-100 text-blue-800"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-400 hover:bg-blue-50"
                    }`}
                  >
                    {suggestedTheme}
                  </button>
                ))}
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Cliquez sur un thème pour le sélectionner.
              </p>
            </div>
          )}
        </div>

        {/* Génération du sondage */}
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Votre thème
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Ex : le télétravail, l'intelligence artificielle..."
            maxLength={200}
            className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <select
            value={aiCount}
            onChange={(e) => setAiCount(Number(e.target.value))}
            className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm"
            aria-label="Nombre de propositions"
          >
            {[2, 3, 4, 5, 6, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n} réponses
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? "Génération..." : aiUsed ? "Régénérer" : "Générer"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-gray-700 font-medium mb-1">
            Question
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Entrez votre question de sondage"
            required
            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Options
          </label>
          {options.map((opt, index) => (
            <div key={index} className="mb-2 flex gap-2">
              <input
                type="text"
                value={opt}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                required
                placeholder={`Option ${index + 1}`}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="px-3 text-red-500 hover:bg-red-50 rounded-lg"
                  aria-label="Supprimer l'option"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            className="text-blue-600 font-medium hover:underline mt-1"
          >
            + Ajouter une option
          </button>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Type
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["sondage", "📊 Sondage", "Les participants voient les résultats en direct après leur vote."],
              ["vote", "🗳️ Vote", "Résultats et gagnant révélés uniquement après la clôture."],
            ].map(([value, title, desc]) => (
              <button
                type="button"
                key={value}
                onClick={() => setCategory(value)}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  category === value
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <span className="block font-semibold text-slate-900">{title}</span>
                <span className="mt-1 block text-sm text-slate-500">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">
            Destinataires
          </label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          >
            <option value="">🌍 Public — tout le monde peut participer</option>
            {groupChoices.map((g) => (
              <option key={g.id} value={g.id}>
                🎓 {g.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            {groupId
              ? "Seuls les membres de ce groupe pourront voir le sondage, voter et participer."
              : groupChoices.length === 0
                ? "Rejoignez un groupe depuis la page Groupes pour pouvoir cibler une filière."
                : "Choisissez un groupe pour réserver le sondage à ses membres."}
          </p>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">
            Date de fin
          </label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
        >
          Enregistrer le brouillon
        </button>
      </form>
      </div>
    </div>
    </div>
  );
}
