import { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchPolls } from "../../services/poll.service";
import { AuthContext } from "../../context/AuthContext";
import CardPoll from "./CardPoll";
import LoadingState from "../admin/LoadingState";
import { Search, Filter, X } from "lucide-react";
import { groupLabel } from "../../lib/groupLabel";

export default function Polls() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  // "all" | "public" | id de groupe (peut venir de /polls?group=ID depuis la page Groupes)
  const [groupFilter, setGroupFilter] = useState(searchParams.get("group") || "all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadPolls = async () => {
      try {
        const data = await fetchPolls();
        setPolls(data);
      } catch {
        setError("Impossible de charger les sondages");
      } finally {
        setLoading(false);
      }
    };
    loadPolls();
  }, []);

  const myPolls = user ? polls.filter((p) => p.created_by === user.id) : [];
  
  // Filter and search logic
  const getFilteredPolls = () => {
    let filtered = activeTab === "my" ? myPolls : polls;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((poll) =>
        poll.question.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((poll) => poll.category === categoryFilter);
    }

    // Group filter
    if (groupFilter === "public") {
      filtered = filtered.filter((poll) => !poll.group_id);
    } else if (groupFilter !== "all") {
      filtered = filtered.filter((poll) => String(poll.group_id) === String(groupFilter));
    }

    // Status filter
    if (statusFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter((poll) => {
        const isActive = new Date(poll.end_time) > now;
        return statusFilter === "active" ? isActive : !isActive;
      });
    }

    return filtered;
  };

  const filteredPolls = getFilteredPolls();
  const allPolls = polls;

  // Get unique categories
  const categories = [...new Set(polls.map((p) => p.category))];

  // Groupes présents dans les sondages visibles par l'utilisateur
  const groupOptions = [
    ...new Map(polls.filter((p) => p.Group).map((p) => [p.Group.id, p.Group])).values(),
  ]
    .map((g) => ({ id: g.id, label: groupLabel(g) }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery || categoryFilter !== "all" || statusFilter !== "all" || groupFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setGroupFilter("all");
  };

  const handlePollClick = (id) => navigate(`/vote/${id}`);

  if (loading) return <LoadingState />;

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-10">

        <header className="page-hero">
          <div>
            <span className="page-hero-kicker">Explorer</span>
            <h1>Sondages &amp; votes</h1>
            <p>Parcourez les consultations en cours, participez et suivez les résultats en direct.</p>
          </div>
          <div className="page-hero-stats">
            <div><strong>{allPolls.length}</strong><span>au total</span></div>
            <div>
              <strong>{allPolls.filter((p) => new Date(p.end_time) > new Date()).length}</strong>
              <span>ouverts</span>
            </div>
          </div>
        </header>

 
        {user && myPolls.length > 0 && (
          <nav className="flex gap-8 border-b border-gray-100">
            <button
              onClick={() => setActiveTab("all")}
              className={`pb-3 text-sm font-medium transition ${
                activeTab === "all"
                  ? "border-b-2 border-blue-600 text-blue-700"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Tous les sondages
            </button>
            <button
              onClick={() => setActiveTab("my")}
              className={`pb-3 text-sm font-medium transition ${
                activeTab === "my"
                  ? "border-b-2 border-blue-600 text-blue-700"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Mes sondages
            </button>
          </nav>
        )}

        {/* Search and Filter Section */}
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher des sondages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              Filtres
              {hasActiveFilters && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                  {[searchQuery, categoryFilter !== "all", statusFilter !== "all", groupFilter !== "all"].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Filter Dropdowns */}
          {showFilters && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">Options de filtre</h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                  >
                    <X className="h-3 w-3" />
                    Tout effacer
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Category Filter */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-700">
                    Catégorie
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="all">Toutes les catégories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Group Filter */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-700">
                    Groupe
                  </label>
                  <select
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="all">Tous les groupes</option>
                    <option value="public">Public (sans groupe)</option>
                    {groupOptions.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-700">
                    Statut
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="active">Actif</option>
                    <option value="closed">Fermé</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                  Recherche : {searchQuery}
                  <button
                    onClick={() => setSearchQuery("")}
                    className="hover:text-gray-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {categoryFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                  Catégorie : {categoryFilter}
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className="hover:text-gray-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                  Statut : {statusFilter}
                  <button
                    onClick={() => setStatusFilter("all")}
                    className="hover:text-gray-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        {hasActiveFilters && (
          <div className="text-sm text-gray-600">
            Affichage de {filteredPolls.length} sur {activeTab === "my" ? myPolls.length : polls.length} sondages
          </div>
        )}

        {/* Poll Display */}
        {activeTab === "my" && user ? (
          filteredPolls.length === 0 ? (
            <div className="rounded-lg border border-gray-100 bg-white p-12 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100" />
              <p className="text-sm text-gray-500">
                {hasActiveFilters ? "Aucun sondage ne correspond à vos filtres." : "Vous n'avez pas encore créé de sondages."}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-100 bg-white">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-6 py-4 text-left">Question</th>
                    <th className="px-6 py-4 text-left">Catégorie</th>
                    <th className="px-6 py-4 text-left">Statut</th>
                    <th className="px-6 py-4 text-left">Date de fin</th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPolls.map((poll) => {
                    const active = new Date(poll.end_time) > new Date();
                    return (
                      <tr key={poll.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {poll.question}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{poll.category}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-md px-2 py-1 text-xs ${
                              active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {active ? "Actif" : "Fermé"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(poll.end_time).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handlePollClick(poll.id)}
                            className="text-sm font-medium text-gray-700 hover:text-gray-900"
                          >
                            Ouvrir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : filteredPolls.length === 0 ? (
          <div className="rounded-lg border border-gray-100 bg-white p-12 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100" />
            <p className="text-sm text-gray-500">
              {hasActiveFilters ? "Aucun sondage ne correspond à vos filtres." : "Aucun sondage disponible pour le moment."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPolls.map((poll) => (
              <CardPoll key={poll.id} poll={poll} onClick={handlePollClick} user={user} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}