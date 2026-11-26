import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users,
  Vote as VoteIcon,
  GraduationCap,
  ClipboardList,
  ShieldCheck,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import {
  fetchAdminStats,
  fetchAdminUsers,
  setUserRole,
  deleteUser,
  fetchAdminVotes,
  deleteVote,
} from "../../services/admin.service";
import {
  fetchGroups,
  createGroup,
  deleteGroup,
  fetchRequests,
  approveRequest,
  rejectRequest,
  fetchMembers,
  removeMember,
} from "../../services/group.service";
import { getErrorMessage } from "../../lib/errorHandler";
import { groupLabel } from "../../lib/groupLabel";

const TABS = [
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "votes", label: "Votes", icon: VoteIcon },
  { id: "groups", label: "Groupes", icon: GraduationCap },
];

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

// Évite une requête à chaque frappe
function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative w-full sm:w-80">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm"
      />
    </div>
  );
}

function Pager({ page, pages, total, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <span>{total} résultat{total !== 1 ? "s" : ""}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
          aria-label="Page précédente"
        >
          <ChevronLeft size={16} />
        </button>
        <span>
          {page} / {pages}
        </span>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
          aria-label="Page suivante"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function Empty({ children }) {
  return <p className="px-4 py-10 text-center text-sm text-slate-500">{children}</p>;
}

/* ------------------------------ Utilisateurs ------------------------------ */
function UsersTab({ me, onChanged }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ users: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const debounced = useDebounced(search);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchAdminUsers({ search: debounced, role, page }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debounced, role, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [debounced, role]);

  const changeRole = async (u, next) => {
    if (!window.confirm(`Passer ${u.fullName} en « ${next} » ?`)) return;
    try {
      const res = await setUserRole(u.id, next);
      toast.success(res.message);
      load();
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Supprimer définitivement ${u.fullName} ? Ses sondages, votes et messages seront aussi supprimés.`)) return;
    try {
      await deleteUser(u.id);
      toast.success("Utilisateur supprimé");
      load();
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={search} onChange={setSearch} placeholder="Nom ou email…" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="">Tous les rôles</option>
          <option value="user">Utilisateurs</option>
          <option value="admin">Administrateurs</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Sondages</th>
              <th className="px-4 py-3">Votes</th>
              <th className="px-4 py-3">Inscrit le</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.users.map((u) => {
              const isMe = Number(u.id) === Number(me.id);
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.image ? (
                        <img src={u.image} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <span className="poll-avatar">{u.fullName?.charAt(0)?.toUpperCase() || "U"}</span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {u.fullName} {isMe && <span className="text-xs font-medium text-violet-600">(vous)</span>}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {u.email}
                          {u.authProvider !== "local" && " · Google"}
                          {!u.isEmailVerified && u.authProvider === "local" && " · non vérifié"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={isMe}
                      onChange={(e) => changeRole(u, e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm disabled:opacity-60"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{u.pollsCount}</td>
                  <td className="px-4 py-3 text-slate-700">{u.votesCount}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={isMe}
                      onClick={() => remove(u)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-30"
                    >
                      <Trash2 size={15} /> Supprimer
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && data.users.length === 0 && <Empty>Aucun utilisateur trouvé.</Empty>}
        {loading && <Empty>Chargement…</Empty>}
      </div>
      <Pager page={page} pages={data.pages} total={data.total} onChange={setPage} />
    </div>
  );
}

/* --------------------------------- Votes ---------------------------------- */
function VotesTab({ onChanged }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ votes: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const debounced = useDebounced(search);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchAdminVotes({ search: debounced, page }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debounced, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [debounced]);

  const remove = async (v) => {
    if (!window.confirm(`Supprimer le vote de ${v.user?.fullName || "cet utilisateur"} ? Il pourra voter à nouveau si le sondage est encore ouvert.`)) return;
    try {
      await deleteVote(v.id);
      toast.success("Vote supprimé");
      load();
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4">
        <SearchBox value={search} onChange={setSearch} placeholder="Utilisateur, email ou question…" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Votant</th>
              <th className="px-4 py-3">Sondage</th>
              <th className="px-4 py-3">Choix</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.votes.map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{v.user?.fullName || "Compte supprimé"}</p>
                  <p className="text-xs text-slate-500">{v.user?.email}</p>
                </td>
                <td className="max-w-[320px] px-4 py-3">
                  {v.poll ? (
                    <Link to={`/vote/${v.poll.id}`} className="line-clamp-2 font-medium text-violet-700 hover:underline">
                      {v.poll.question}
                    </Link>
                  ) : (
                    "—"
                  )}
                  {v.poll && <p className="text-xs capitalize text-slate-500">{v.poll.category} · {v.poll.status}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">{v.option || "—"}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(v.voted_at)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => remove(v)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={15} /> Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && data.votes.length === 0 && <Empty>Aucun vote trouvé.</Empty>}
        {loading && <Empty>Chargement…</Empty>}
      </div>
      <Pager page={page} pages={data.pages} total={data.total} onChange={setPage} />
    </div>
  );
}

/* --------------------------------- Groupes -------------------------------- */
function AddGroup({ groups, onCreated }) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const parents = groups.filter((g) => !g.parent_id);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await createGroup({ name: name.trim(), parent_id: parentId ? Number(parentId) : null });
      setName("");
      toast.success(parentId ? "Sous-groupe ajouté" : "Groupe ajouté");
      onCreated();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        placeholder="Nom du groupe ou du sous-groupe"
        className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
      />
      <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
        <option value="">Groupe principal</option>
        {parents.map((p) => (
          <option key={p.id} value={p.id}>
            Sous-groupe de {p.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="inline-flex items-center justify-center gap-1 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
      >
        <Plus size={16} /> Ajouter
      </button>
    </form>
  );
}

function GroupRow({ group, indent, onChanged }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!open) {
      setLoading(true);
      try {
        setMembers(await fetchMembers(group.id));
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    setOpen(!open);
  };

  const kick = async (m) => {
    if (!window.confirm(`Retirer ${m.fullName} de « ${group.name} » ?`)) return;
    try {
      await removeMember(group.id, m.id);
      setMembers((prev) => prev.filter((x) => x.id !== m.id));
      toast.success("Membre retiré");
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async () => {
    if (!window.confirm(`Supprimer « ${group.name} » ${group.parent_id ? "" : "et ses sous-groupes "}?`)) return;
    try {
      await deleteGroup(group.id);
      toast.success("Groupe supprimé");
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className={`border-b border-slate-100 last:border-0 ${indent ? "bg-slate-50/60 pl-6 sm:pl-10" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{group.name}</p>
          <p className="text-xs text-slate-500">
            {group.memberCount} membre{group.memberCount !== 1 ? "s" : ""}
            {group.pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">{group.pendingCount} en attente</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={toggle} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-50">
            Membres {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button type="button" onClick={remove} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {open && (
        <div className="px-4 pb-3">
          {loading && <p className="text-sm text-slate-500">Chargement…</p>}
          {!loading && members.length === 0 && <p className="text-sm text-slate-500">Aucun membre validé.</p>}
          <ul className="grid gap-1.5">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-100">
                <span className="min-w-0 truncate">
                  <strong className="font-semibold text-slate-800">{m.fullName}</strong>{" "}
                  <span className="text-slate-500">{m.email}</span>
                </span>
                <button type="button" onClick={() => kick(m)} className="shrink-0 text-xs font-semibold text-red-600 hover:underline">
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GroupsTab({ onChanged }) {
  const [groups, setGroups] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [g, r] = await Promise.all([fetchGroups(), fetchRequests()]);
      setGroups(g);
      setRequests(r);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changed = () => {
    load();
    onChanged();
  };

  const tree = useMemo(() => {
    const parents = groups.filter((g) => !g.parent_id);
    return parents.map((p) => ({ ...p, children: groups.filter((g) => g.parent_id === p.id) }));
  }, [groups]);

  const decide = async (req, approve) => {
    try {
      if (approve) await approveRequest(req.id);
      else await rejectRequest(req.id);
      toast.success(approve ? "Demande acceptée" : "Demande refusée");
      changed();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Empty>Chargement…</Empty>;

  return (
    <div className="grid gap-5">
      {requests.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <h3 className="mb-3 text-sm font-bold text-amber-900">Demandes d'adhésion ({requests.length})</h3>
          <ul className="grid gap-2">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm shadow-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {r.user?.fullName} <span className="font-normal text-slate-500">· {r.user?.email}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    veut rejoindre <strong>{groupLabel(r.group)}</strong>
                    {r.currentGroups.length > 0 && <> · déjà dans : {r.currentGroups.map(groupLabel).join(", ")}</>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => decide(r, true)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700">
                    <Check size={15} /> Accepter
                  </button>
                  <button type="button" onClick={() => decide(r, false)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">
                    <X size={15} /> Refuser
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AddGroup groups={groups} onCreated={changed} />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {tree.length === 0 && <Empty>Aucun groupe pour l'instant.</Empty>}
        {tree.map((p) => (
          <div key={p.id}>
            <GroupRow group={p} onChanged={changed} />
            {p.children.map((c) => (
              <GroupRow key={c.id} group={c} indent onChanged={changed} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */
export default function AdminPanel() {
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState("users");
  const [stats, setStats] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setStats(await fetchAdminStats());
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const cards = [
    { label: "Utilisateurs", value: stats?.users, sub: stats ? `${stats.admins} admin${stats.admins > 1 ? "s" : ""}` : "", icon: Users },
    { label: "Sondages", value: stats?.polls, sub: "", icon: ClipboardList },
    { label: "Votes", value: stats?.votes, sub: "", icon: VoteIcon },
    { label: "Groupes", value: stats?.groups, sub: stats?.pendingRequests ? `${stats.pendingRequests} demande(s)` : "", icon: GraduationCap },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="page-hero mb-6 p-7 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-violet-200">
              <ShieldCheck size={16} /> Espace administrateur
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight">Administration</h1>
            <p className="mt-1 text-sm">Gérez les utilisateurs, les votes et les groupes de la plateforme.</p>
          </div>
          <Link to="/polls/dashboard" className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25">
            Gérer les sondages →
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
              <Icon size={18} className="text-violet-600" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{value ?? "–"}</p>
            {sub && <p className="text-xs text-slate-500">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === id ? "bg-violet-600 text-white shadow" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-violet-50"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersTab me={user} onChanged={loadStats} />}
      {tab === "votes" && <VotesTab onChanged={loadStats} />}
      {tab === "groups" && <GroupsTab onChanged={loadStats} />}
    </div>
  );
}
