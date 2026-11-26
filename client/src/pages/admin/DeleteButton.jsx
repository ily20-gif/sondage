export default function DeleteButton({ pollId, onDelete, isDeleting }) {
  return (
    <button
      type="button"
      onClick={() => onDelete(pollId)}
      disabled={isDeleting === pollId}
      className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isDeleting === pollId ? "Suppression..." : "Supprimer"}
    </button>
  );
}
