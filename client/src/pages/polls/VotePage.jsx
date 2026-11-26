import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchPollById, submitVote } from "../../services/poll.service";
import { useSocket } from "../../context/SocketContext";
import { AuthContext } from "../../context/AuthContext";
import { getErrorMessage } from "../../lib/errorHandler";
import Chat from "./Chat";
import LoadingState from "../admin/LoadingState";
import { groupLabel } from "../../lib/groupLabel";

// Barre de résultat : proposition, nombre de votes, pourcentage
function ResultRow({ option, count, percent, isUserChoice, isWinner }) {
  return (
    <div
      className={`rounded-xl border p-4 transition ${
        isWinner
          ? "border-amber-300 bg-amber-50"
          : isUserChoice
            ? "border-blue-300 bg-blue-50"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <span className="min-w-0 break-words font-medium text-slate-800">
          {isWinner && "🏆 "}
          {isUserChoice && "✓ "}
          {option}
        </span>
        <span className="shrink-0 text-sm text-slate-500">
          <strong className="text-slate-900">{percent}%</strong> · {count} vote
          {count !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isWinner ? "bg-amber-500" : "bg-blue-600"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function VotePage() {
  const { id } = useParams();
  const socket = useSocket();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPoll = async () => {
      try {
        setPoll(await fetchPollById(id));
      } catch (err) {
        // 403 : sondage réservé à un groupe dont l'utilisateur ne fait pas partie
        setError(err?.response?.data?.message || "Échec du chargement du sondage");
      } finally {
        setLoading(false);
      }
    };
    loadPoll();
  }, [id]);

  const hasVoted = poll?.userVote !== null && poll?.userVote !== undefined;
  const isOwner = !!(poll && user && Number(poll.created_by) === Number(user.id));

  // Rejoindre la room du sondage (le serveur vérifie l'autorisation)
  useEffect(() => {
    if (!socket || !poll || !(hasVoted || isOwner)) return;
    socket.emit("join-poll", id);
    return () => {
      socket.emit("leave-poll", id);
    };
  }, [socket, poll?.id, hasVoted, isOwner, id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!socket) return;

    // Résultats en temps réel, sans rechargement de la page
    const handlePollUpdated = (data) => {
      if (Number(data.pollId) !== Number(id)) return;
      setPoll((prev) =>
        prev
          ? {
              ...prev,
              votesCount: data.votesCount,
              counts: data.counts,
              totalVotes: data.totalVotes,
            }
          : prev,
      );
    };

    // Clôture automatique : on recharge pour afficher les résultats définitifs
    const handlePollClosed = async (data) => {
      if (Number(data.pollId) !== Number(id)) return;
      try {
        setPoll(await fetchPollById(id));
      } catch {
        setPoll((prev) => (prev ? { ...prev, isClosed: true, status: "closed" } : prev));
      }
    };

    socket.on("poll-updated", handlePollUpdated);
    socket.on("poll-closed", handlePollClosed);
    return () => {
      socket.off("poll-updated", handlePollUpdated);
      socket.off("poll-closed", handlePollClosed);
    };
  }, [socket, id]);

  const handleVote = async () => {
    if (!selectedOption || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitVote(id, selectedOption);
      setPoll(await fetchPollById(id));
      setSelectedOption(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;

  if (!poll) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md space-y-4 px-4 text-center">
          <p className="text-lg text-slate-500">{error || "Sondage introuvable"}</p>
          <button
            type="button"
            onClick={() => navigate("/groups")}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Voir les groupes
          </button>
        </div>
      </div>
    );
  }

  const isClosed = poll.isClosed || new Date(poll.end_time) <= new Date();
  const isVoteCategory = poll.category === "vote";
  const canVote = !isClosed && !hasVoted && !isOwner && poll.status === "published";

  // Règles de visibilité : sondage = résultats en direct pour les participants,
  // vote = résultats uniquement après la clôture. Les sondages clôturés sont ouverts à tous.
  const showResults = isVoteCategory ? isClosed : isClosed || hasVoted || isOwner;

  const total = poll.totalVotes || 0;
  const countOf = (opt) => poll.counts?.[opt] ?? 0;
  const percentOf = (opt) => Number(poll.votesCount?.[opt] ?? 0);

  const canSeeChat = !isVoteCategory && !isClosed && (hasVoted || isOwner);

  return (
    <div className="min-h-[calc(100vh-80px)] px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* En-tête */}
          <div className="bg-gradient-to-br from-[#1b1038] to-[#6d4aff] p-6 text-white">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white/15 px-3 py-1">
                {isVoteCategory ? "Vote" : "Sondage"}
              </span>
              <span
                className={`rounded-full px-3 py-1 ${
                  isClosed ? "bg-red-500/90" : "bg-emerald-500/90"
                }`}
              >
                {isClosed ? "Clôturé" : "Ouvert"}
              </span>
              {poll.Group && (
                <span className="rounded-full bg-white/15 px-3 py-1">
                  🎓 {groupLabel(poll.Group)}
                </span>
              )}
              {isOwner && (
                <span className="rounded-full bg-amber-400 px-3 py-1 text-amber-950">
                  Votre sondage
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold leading-snug sm:text-3xl">{poll.question}</h1>
            <p className="mt-2 text-sm text-blue-100">
              Par {poll.User?.fullName || "Anonyme"} · Clôture le{" "}
              {new Date(poll.end_time).toLocaleString()}
            </p>
          </div>

          <div className="space-y-4 p-6">
            {/* Gagnant d'un vote clôturé */}
            {isVoteCategory && isClosed && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
                <div className="text-4xl">🏆</div>
                <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-amber-700">
                  {poll.winner?.length > 1 ? "Égalité" : "Gagnant"}
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {poll.winner?.length ? poll.winner.join(" · ") : "Aucun vote"}
                </p>
              </div>
            )}

            {/* Résultats (nombre de votes + pourcentage) */}
            {showResults && (
              <>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span className="font-semibold text-slate-800">Résultats</span>
                  <span>
                    {total} vote{total !== 1 ? "s" : ""} au total
                  </span>
                </div>
                <div className="space-y-3">
                  {poll.options.map((opt) => (
                    <ResultRow
                      key={opt}
                      option={opt}
                      count={countOf(opt)}
                      percent={percentOf(opt)}
                      isUserChoice={opt === poll.userVote}
                      isWinner={isVoteCategory && isClosed && poll.winner?.includes(opt)}
                    />
                  ))}
                </div>
                {!isClosed && !isVoteCategory && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    Mise à jour des résultats en direct
                  </div>
                )}
              </>
            )}

            {/* Formulaire de vote */}
            {canVote && (
              <>
                <p className="text-sm text-slate-500">
                  Choisissez une proposition puis confirmez. Vous ne pourrez voter qu'une seule fois.
                </p>
                <div className="space-y-3">
                  {poll.options.map((opt) => (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => setSelectedOption(opt)}
                      className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                        selectedOption === opt
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-blue-300"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          selectedOption === opt ? "border-blue-600" : "border-slate-300"
                        }`}
                      >
                        {selectedOption === opt && (
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                        )}
                      </span>
                      <span className="font-medium text-slate-800">{opt}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleVote}
                  disabled={!selectedOption || submitting}
                  className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Envoi..." : "Confirmer mon vote"}
                </button>
              </>
            )}

            {/* Messages d'état */}
            {isOwner && isVoteCategory && !isClosed && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-semibold">👑 Vous êtes le créateur de ce vote</p>
                <p className="mt-1">
                  Vous ne pouvez pas voter sur votre propre vote. Les résultats seront visibles après la
                  clôture.
                </p>
                <ul className="mt-3 space-y-2">
                  {poll.options.map((opt) => (
                    <li key={opt} className="rounded-lg bg-white px-3 py-2 text-slate-700">
                      {opt}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isOwner && !isVoteCategory && !isClosed && (
              <p className="text-sm text-slate-500">
                Vous ne pouvez pas voter sur votre propre sondage, mais vous suivez les résultats en direct.
              </p>
            )}

            {hasVoted && isVoteCategory && !isClosed && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Votre vote a bien été enregistré pour « {poll.userVote} ». Résultats après la clôture.
              </div>
            )}

            {!isVoteCategory && !isClosed && (hasVoted || isOwner) && (
              <button
                type="button"
                onClick={() => navigate(`/poll/${id}/live`)}
                className="rounded-xl bg-[#1b1038] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#120a2b]"
              >
                🎥 Rejoindre la discussion vidéo en direct
              </button>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>

        {!isVoteCategory && !isClosed && (
          <div className="w-full lg:w-96">
            {canSeeChat ? (
              <Chat pollId={id} />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="mb-3 text-5xl">💬</div>
                <p className="font-semibold text-slate-900">Chat en direct</p>
                <p className="text-sm text-slate-500">Votez pour rejoindre la discussion</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
