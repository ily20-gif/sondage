import { useState } from "react";
import toast from "react-hot-toast";
import { updatePoll } from "../../services/poll.service";
import { getErrorMessage } from "../../lib/errorHandler";

// ISO -> valeur pour <input type="datetime-local"> (heure locale)
const toLocalInput = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function EditPollModal({ poll, onClose, onSaved }) {
  const [question, setQuestion] = useState(poll.question);
  const [options, setOptions] = useState(poll.options);
  const [category, setCategory] = useState(poll.category);
  const [endTime, setEndTime] = useState(toLocalInput(poll.end_time));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const setOption = (i, v) => setOptions(options.map((o, idx) => (idx === i ? v : o)));

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    const clean = options.map((o) => o.trim());
    if (!question.trim() || clean.some((o) => !o)) {
      setError("Veuillez remplir la question et toutes les options");
      return;
    }
    if (new Set(clean.map((o) => o.toLowerCase())).size !== clean.length) {
      setError("Toutes les options doivent être uniques");
      return;
    }
    setSaving(true);
    try {
      await updatePoll(poll.id, {
        question: question.trim(),
        options: clean,
        category,
        end_time: new Date(endTime).toISOString(),
      });
      toast.success("Sondage modifié");
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const input =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSave}
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-xl font-semibold text-slate-900">Modifier le sondage</h2>

        {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Question</label>
          <input className={input} value={question} onChange={(e) => setQuestion(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Options</label>
          {options.map((opt, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input className={input} value={opt} onChange={(e) => setOption(i, e.target.value)} />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                  className="px-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {options.length < 10 && (
            <button
              type="button"
              onClick={() => setOptions([...options, ""])}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              + Ajouter une option
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Catégorie</label>
            <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="sondage">Sondage</option>
              <option value="vote">Vote</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date de clôture</label>
            <input
              type="datetime-local"
              className={input}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
