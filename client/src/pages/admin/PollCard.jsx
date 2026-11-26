import PollOption from "./PollOption";
import DeleteButton from "./DeleteButton";
import { groupLabel } from "../../lib/groupLabel";

const STATUS = {
  published: {
    label: "Publié",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  draft: {
    label: "Brouillon (non publié)",
    cls: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  closed: {
    label: "Clôturé",
    cls: "bg-slate-100 text-slate-600 ring-slate-200",
  },
};

export default function PollCard({
  poll,
  onDelete,
  isDeleting,
  onEdit,
  onStatusChange,
  isAdmin,
}) {
  const isVote = poll.category === "vote";
  const expired = new Date(poll.end_time) <= new Date();
  const hasVotes = (poll.totalVotes || 0) > 0;
  const status = STATUS[poll.status];

  return (
    <div className="flex h-full min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* En-tête : badges + question */}
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              isVote
                ? "bg-blue-100 text-blue-700"
                : "bg-purple-100 text-purple-700"
            }`}
          >
            {isVote ? "Vote" : "Sondage"}
          </span>
          {poll.Group && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
              🎓 {groupLabel(poll.Group)}
            </span>
          )}
          {status && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.cls}`}
            >
              {status.label}
            </span>
          )}
        </div>
        <h2 className="break-words text-lg font-semibold leading-snug text-slate-900">
          {poll.question}
        </h2>
        {poll.User?.fullName && (
          <p className="mt-1 break-words text-xs text-slate-400">
            Par {poll.User.fullName}
          </p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3">
        {poll.options.map((option, idx) => (
          <PollOption
            key={idx}
            option={option}
            results={poll.results}
            category={poll.category}
            totalVotes={poll.totalVotes}
          />
        ))}
      </div>

      <div className="mt-auto space-y-3">
        <p className="text-xs text-slate-400">
          Se termine : {new Date(poll.end_time).toLocaleString()}
        </p>

        {/* Validation / publication : propriétaire ou admin (vérifié côté serveur) */}
        {onStatusChange && (
          <>
            {poll.status === "draft" && !expired && (
              <button
                type="button"
                onClick={() => onStatusChange(poll, "published")}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Valider et publier
              </button>
            )}

            {poll.status === "published" && !hasVotes && !expired && (
              <button
                type="button"
                onClick={() => onStatusChange(poll, "draft")}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Repasser en brouillon
              </button>
            )}
          </>
        )}

        {/* Actions secondaires */}
        <div className="grid grid-cols-2 gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(poll)}
              disabled={hasVotes || expired}
              title={
                hasVotes
                  ? "Un sondage ayant reçu des votes ne peut pas être modifié"
                  : "Modifier le sondage"
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Modifier
            </button>
          )}
          <DeleteButton
            pollId={poll.id}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        </div>
      </div>
    </div>
  );
}
