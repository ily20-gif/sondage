import React from "react";
import { groupLabel } from "../../lib/groupLabel";

export default function CardPoll({ poll, onClick, user }) {
  const isActive = new Date(poll.end_time) > new Date();
  const isOwner = user && Number(poll.created_by) === Number(user.id);
  const isSondage = poll.category === "sondage";

  const formatTimeRemaining = (endTime) => {
    const diff = new Date(endTime) - new Date();
    if (diff <= 0) return "Clôturé";
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days}j ${hours}h restantes`;
    if (hours > 0) return `${hours}h restantes`;
    return "Moins d'1h";
  };

  return (
    <article
      onClick={() => onClick(poll.id)}
      className={`poll-card group ${!isActive ? "poll-card-closed" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`poll-card-icon ${isSondage ? "poll-card-icon-a" : "poll-card-icon-b"}`}>
          {isSondage ? "📊" : "🗳️"}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`poll-pill ${isActive ? "poll-pill-live" : "poll-pill-off"}`}>
            {isActive && <i />} {formatTimeRemaining(poll.end_time)}
          </span>
          {isOwner && <span className="poll-pill poll-pill-owner">Votre sondage</span>}
        </div>
      </div>

      <p className="poll-card-kind">
        {isSondage ? "Sondage" : "Vote"}
        {poll.Group && <span> · 🎓 {groupLabel(poll.Group)}</span>}
      </p>
      <h3 className="poll-card-title">{poll.question}</h3>

      <div className="poll-card-options">
        {poll.options.slice(0, 3).map((opt, i) => (
          <span key={i}>{opt}</span>
        ))}
        {poll.options.length > 3 && <span className="poll-more">+{poll.options.length - 3}</span>}
      </div>

      <div className="poll-card-footer">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="poll-avatar">{poll.User?.fullName?.charAt(0)?.toUpperCase() || "U"}</span>
          <span className="truncate text-sm text-slate-500">{poll.User?.fullName || "Anonyme"}</span>
        </div>
        <span className="poll-cta">{isActive ? "Participer" : "Résultats"} →</span>
      </div>
    </article>
  );
}
