import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { GraduationCap, Plus, Trash2, Users } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import {
  fetchGroups,
  createGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  fetchRequests,
  approveRequest,
  rejectRequest,
  fetchMembers,
  removeMember,
} from "../services/group.service";
import { getErrorMessage } from "../lib/errorHandler";
import LoadingState from "./admin/LoadingState";
import { groupLabel } from "../lib/groupLabel";

// Formulaire d'ajout (admin) : groupe si parentId est null, sous-groupe sinon
function AddGroupForm({ parentId, placeholder, onCreated }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await createGroup({ name: name.trim(), parent_id: parentId });
      setName("");
      toast.success("Groupe ajouté");
      onCreated();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        maxLength={80}
        className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Plus size={15} /> Ajouter
      </button>
    </form>
  );
}

function GroupRow({ group, isAdmin, busyId, onToggle, onDelete, onChanged }) {
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      setMembers(await fetchMembers(group.id));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleMembers = () => {
    if (!showMembers) loadMembers();
    setShowMembers(!showMembers);
  };

  const handleRemove = async (member) => {
    if (!window.confirm(`Retirer ${member.fullName} de « ${group.name} » ?`)) return;
    try {
      await removeMember(group.id, member.id);
      toast.success("Membre retiré");
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const label = group.isMember
    ? "Quitter"
    : group.isPending
      ? "Annuler la demande"
      : isAdmin
        ? "Rejoindre"
        : "Demander à rejoindre";
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="break-words font-medium text-slate-900">{group.name}</p>
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <Users size={13} /> {group.memberCount} membre{group.memberCount !== 1 ? "s" : ""}
          {isAdmin && group.pendingCount > 0 && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
              {group.pendingCount} en attente
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to={`/polls?group=${group.id}`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
        >
          Sondages
        </Link>
        <button
          type="button"
          disabled={busyId === group.id}
          onClick={() => onToggle(group)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-50 ${
            group.isMember
              ? "border border-slate-300 text-slate-700 hover:bg-slate-50"
              : group.isPending
                ? "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {label}
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={toggleMembers}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {showMembers ? "Masquer" : "Membres"}
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={() => onDelete(group)}
            aria-label={`Supprimer ${group.name}`}
            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>

    {isAdmin && showMembers && (
      <div className="border-t border-slate-100 px-4 py-3">
        {loadingMembers ? (
          <p className="text-sm text-slate-400">Chargement...</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun membre dans ce groupe.</p>
        ) : (
          <ul className="space-y-1">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 break-words">
                  <span className="font-medium text-slate-800">{m.fullName}</span>{" "}
                  <span className="break-all text-xs text-slate-400">{m.email}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(m)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )}
    </div>
  );
}

export default function Groups() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === "admin";

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [requests, setRequests] = useState([]);

  const load = async () => {
    try {
      setGroups(await fetchGroups());
      if (user?.role === "admin") setRequests(await fetchRequests());
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Arbre : groupes de niveau 1 avec leurs sous-groupes
  const tree = useMemo(() => {
    const top = groups.filter((g) => g.parent_id == null);
    return top.map((g) => ({ ...g, children: groups.filter((c) => c.parent_id === g.id) }));
  }, [groups]);

  const handleToggle = async (group) => {
    setBusyId(group.id);
    try {
      const data =
        group.isMember || group.isPending ? await leaveGroup(group.id) : await joinGroup(group.id);
      toast.success(data.message);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleRequest = async (request, accept) => {
    try {
      const data = accept ? await approveRequest(request.id) : await rejectRequest(request.id);
      toast.success(data.message);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (group) => {
    const extra = group.parent_id == null && groups.some((g) => g.parent_id === group.id)
      ? " et tous ses sous-groupes"
      : "";
    if (!window.confirm(`Supprimer « ${group.name} »${extra} ?`)) return;
    try {
      await deleteGroup(group.id);
      toast.success("Groupe supprimé");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="page-hero">
          <div>
            <span className="page-hero-kicker">Communautés</span>
            <h1>Groupes</h1>
            <p>
              Demandez à rejoindre votre filière (un administrateur valide) pour participer aux sondages et votes qui lui sont réservés.
              Les membres d'un sous-groupe voient aussi les sondages de leur groupe (ex. DAIA → DUT).
            </p>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {isAdmin && requests.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
            <h2 className="mb-3 font-semibold text-amber-900">
              Demandes d'adhésion ({requests.length})
            </h2>
            <div className="space-y-2">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium text-slate-900">
                      {r.user?.fullName || "Utilisateur supprimé"}
                    </p>
                    <p className="break-all text-xs text-slate-500">
                      {r.user?.email} · veut rejoindre{" "}
                      <strong>{groupLabel(r.group)}</strong>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Déjà membre de :{" "}
                      {r.currentGroups?.length ? (
                        r.currentGroups.map((g) => (
                          <span
                            key={g.id}
                            className="mr-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700"
                          >
                            {groupLabel(g)}
                          </span>
                        ))
                      ) : (
                        <span className="italic text-slate-400">aucun groupe</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRequest(r, true)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Accepter
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequest(r, false)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tree.length === 0 && !error && (
          <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Aucun groupe pour le moment.
          </p>
        )}

        {tree.map((group) => (
          <section
            key={group.id}
            className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2 text-slate-900">
              <GraduationCap size={20} className="text-blue-600" />
              <h2 className="text-lg font-semibold">{group.name}</h2>
            </div>

            <GroupRow
              group={group}
              isAdmin={isAdmin}
              busyId={busyId}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onChanged={load}
            />

            {group.children.length > 0 && (
              <div className="mt-4 space-y-2 border-l-2 border-blue-100 pl-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Sous-groupes
                </p>
                {group.children.map((child) => (
                  <GroupRow
                    key={child.id}
                    group={child}
                    isAdmin={isAdmin}
                    busyId={busyId}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
              onChanged={load}
                  />
                ))}
              </div>
            )}

            {isAdmin && (
              <AddGroupForm
                parentId={group.id}
                placeholder={`Nouveau sous-groupe de ${group.name}`}
                onCreated={load}
              />
            )}
          </section>
        ))}

        {isAdmin && (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Nouveau groupe</h2>
            <p className="text-sm text-slate-500">Ex. DUT, Bachelor, Master…</p>
            <AddGroupForm parentId={null} placeholder="Nom du groupe" onCreated={load} />
          </section>
        )}
      </div>
    </div>
  );
}
