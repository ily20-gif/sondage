import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import {
  fetchUserPolls,
  fetchAllPolls,
  deletePoll,
  fetchPollResults,
} from "../../services/admin.service";
import { setPollStatus } from "../../services/poll.service";
import EditPollModal from "./EditPollModal";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../lib/errorHandler";
import PollCard from "./PollCard";
import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  Calendar,
  Filter,
  Search,
  Sparkles,
  Vote,
  ClipboardList,
  Activity,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPoll, setEditingPoll] = useState(null);
  const [scope, setScope] = useState("mine"); // "mine" | "all" (admin seulement)
  const isAdmin = user?.role === "admin";


  const loadPolls = async () => {
    try {
      const data =
        isAdmin && scope === "all"
          ? await fetchAllPolls()
          : await fetchUserPolls();
      const pollsWithResults = await Promise.all(
        data.map(async (poll) => {
          const resultsData = await fetchPollResults(poll.id);
          return {
            ...poll,
            results: resultsData.results,
            totalVotes: resultsData.totalVotes || 0,
            isActive: new Date(poll.end_time) > new Date(),
            categoryColor:
              poll.category === "sondage" ? "bg-blue-500" : "bg-purple-500",
          };
        }),
      );
      setPolls(pollsWithResults);
    } catch (err) {
      console.error("Error loading polls:", err);
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, isAdmin]);

  const handleDelete = async (pollId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce sondage ?"))
      return;
    setDeleting(pollId);
    try {
      await deletePoll(pollId);
      setPolls(polls.filter((poll) => poll.id !== pollId));
      toast.success("Sondage supprimé avec succès");
    } catch (err) {
      console.error("Error deleting poll:", err);
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = (poll) => {
    if ((poll.totalVotes || 0) > 0) {
      toast.error(
        "Impossible de modifier un sondage qui a déjà reçu des votes",
      );
      return;
    }
    setEditingPoll(poll);
  };

 // Le propriétaire (ou un admin) valide et publie son sondage.
  const handleStatus = async (poll, status) => {
    try {
      const res = await setPollStatus(poll.id, status);
      toast.success(res.message);
      await loadPolls();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const filteredPolls = polls.filter((poll) => {
    const matchesSearch = poll.question
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "active" && poll.isActive) ||
      (activeFilter === "closed" && !poll.isActive) ||
      (activeFilter === "draft" && poll.status === "draft") ||
      poll.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalPolls: polls.length,
    activePolls: polls.filter((p) => p.isActive).length,
    totalVotes: polls.reduce((sum, poll) => sum + (poll.totalVotes || 0), 0),
    averageVotes:
      polls.length > 0
        ? Math.round(
            polls.reduce((sum, poll) => sum + (poll.totalVotes || 0), 0) /
              polls.length,
          )
        : 0,
  };

  if (loading) return <LoadingState />;

  const statCards = [
    {
      label: "Total des sondages",
      value: stats.totalPolls,
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Sondages actifs",
      value: stats.activePolls,
      icon: Activity,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Total des votes",
      value: stats.totalVotes,
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Moyenne des votes",
      value: stats.averageVotes,
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  const filters = [
    { id: "all", label: "Tous", count: polls.length },
    { id: "active", label: "Actifs", count: stats.activePolls },
    { id: "closed", label: "Fermés", count: polls.length - stats.activePolls },
    {
      id: "draft",
      label: "Brouillons",
      count: polls.filter((p) => p.status === "draft").length,
    },
    { id: "sondage", label: "Sondages" },
    { id: "vote", label: "Votes" },
  ];

  return (
    <div className="min-h-screen px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#120a2b] via-[#1b1038] to-[#6d4aff] px-6 py-8 text-white shadow-xl sm:px-9 sm:py-10">
          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
          <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100">
                <Sparkles size={14} /> Espace de gestion
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Bonjour
                {user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""} 👋
              </h1>
              <p className="mt-2 max-w-xl text-sm text-blue-100 sm:text-base">
                Retrouvez vos sondages, suivez la participation et consultez vos
                statistiques.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-100">
              <BarChart3 size={18} /> Votre tableau de bord
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                    {value}
                  </p>
                </div>
                <div className={`rounded-xl p-3 ${bg} ${color}`}>
                  <Icon size={22} />
                </div>
              </div>
            </div>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit space-y-5">
            {isAdmin && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 font-semibold text-slate-900">
                  Vue administrateur
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["mine", "Mes sondages"],
                    ["all", "Tous"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setScope(id)}
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition ${scope === id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <Filter size={17} />
                </div>
                <h2 className="font-semibold text-slate-900">
                  Filtrer les sondages
                </h2>
              </div>
              <div className="relative mb-4">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={17}
                />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div className="space-y-1.5">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${activeFilter === filter.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                  >
                    <span>{filter.label}</span>
                    {filter.count !== undefined && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${activeFilter === filter.id ? "bg-white text-blue-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {filter.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
            {filteredPolls.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 font-semibold text-slate-900">
                  Statistiques rapides
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      Maximum de votes
                    </span>
                    <strong className="text-slate-900">
                      {Math.max(...filteredPolls.map((p) => p.totalVotes || 0))}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      Sondages actifs
                    </span>
                    <strong className="text-emerald-600">
                      {filteredPolls.filter((p) => p.isActive).length}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      Moy. d'options
                    </span>
                    <strong className="text-slate-900">
                      {Math.round(
                        filteredPolls.reduce(
                          (sum, p) => sum + p.options.length,
                          0,
                        ) / filteredPolls.length,
                      )}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      Créés aujourd'hui
                    </span>
                    <strong className="text-slate-900">
                      {
                        filteredPolls.filter(
                          (p) =>
                            new Date(p.createdAt).toDateString() ===
                            new Date().toDateString(),
                        ).length
                      }
                    </strong>
                  </div>
                </div>
              </section>
            )}
          </aside>

          <main className="min-w-0">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                  Votre activité
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  {isAdmin && scope === "all"
                    ? "Tous les sondages"
                    : "Vos sondages"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredPolls.length} résultat
                  {filteredPolls.length !== 1 ? "s" : ""} sur {polls.length}{" "}
                  sondage{polls.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 self-start rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-200 sm:self-auto">
                <Clock size={14} /> Mis à jour automatiquement au chargement
              </div>
            </div>
            {filteredPolls.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <EmptyState />
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                {filteredPolls.map((poll) => (
                  <div
                    key={poll.id}
                    className="min-w-0 transition duration-200 hover:-translate-y-1"
                  >
                    <PollCard
                      poll={poll}
                      onDelete={handleDelete}
                      isDeleting={deleting}
                      onEdit={handleEdit}
                      onStatusChange={handleStatus}
                      isAdmin={isAdmin}
                    />
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
      {editingPoll && (
        <EditPollModal
          poll={editingPoll}
          onClose={() => setEditingPoll(null)}
          onSaved={() => {
            setEditingPoll(null);
            loadPolls();
          }}
        />
      )}
    </div>
  );
}
