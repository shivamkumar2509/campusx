import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const REPOS_PER_PAGE = 6;

export default function Profile() {
  const [user, setUser] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    year: 1,
    availability: 0,
    experience_level: "beginner",
    github_username: "",
    linkedin_url: "",
    codeforces_username: "",
  });
  const [saving, setSaving] = useState(false);

  // Add skill modal
  const [addingSkillType, setAddingSkillType] = useState(null); // "technical" | "non-technical"
  const [skillForm, setSkillForm] = useState({
    skill_name: "",
    proficiency: 3,
  });
  const [savingSkill, setSavingSkill] = useState(false);

  // GitHub refresh
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // ===== TOGGLE HIDE/SHOW LANGUAGE =====
  const [togglingLanguage, setTogglingLanguage] = useState(null);
  const [showAllLanguages, setShowAllLanguages] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [userRes, skillsRes] = await Promise.all([
        api.get("/users/me"),
        api.get("/users/me/skills"),
      ]);

      const userData = userRes.data.data;
      setUser(userData);
      setSkills(skillsRes.data.data || []);

      setEditForm({
        name: userData.name || "",
        year: userData.year || 1,
        availability: userData.availability || 0,
        experience_level: userData.experience_level || "beginner",
        github_username: userData.github_username || "",
        linkedin_url: userData.linkedin_url || "",
        codeforces_username: userData.codeforces_username || "",
      });
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
      } else {
        setError(err.response?.data?.message || "Failed to load profile");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // ===== SAVE PROFILE =====
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const { data } = await api.patch("/users/me", editForm);
      setUser(data.data);
      setSuccess("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // ===== ADD SKILL =====
  const handleAddSkill = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!skillForm.skill_name.trim()) {
      setError("Skill name is required");
      return;
    }

    setSavingSkill(true);
    try {
      const { data } = await api.post("/users/me/skills", skillForm);
      setSkills([...skills, data.data]);
      setSuccess("Skill added successfully!");
      setAddingSkillType(null);
      setSkillForm({ skill_name: "", proficiency: 3 });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add skill");
    } finally {
      setSavingSkill(false);
    }
  };

  // ===== DELETE SKILL =====
  const handleDeleteSkill = async (skillId) => {
    if (!confirm("Delete this skill?")) return;
    setError("");
    setSuccess("");

    try {
      await api.delete(`/users/me/skills/${skillId}`);
      setSkills(skills.filter((s) => s._id !== skillId));
      setSuccess("Skill deleted");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete skill");
    }
  };

  // ===== UPDATE PROFICIENCY =====
  const handleUpdateProficiency = async (skillId, newProficiency) => {
    setError("");
    try {
      const { data } = await api.patch(`/users/me/skills/${skillId}`, {
        proficiency: newProficiency,
      });
      setSkills(skills.map((s) => (s._id === skillId ? data.data : s)));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update skill");
    }
  };

  // ===== REFRESH GITHUB =====
  const handleRefreshGithub = async () => {
    setError("");
    setSuccess("");
    setRefreshing(true);

    try {
      const { data } = await api.post("/users/me/github/refresh");
      setUser(data.data);
      setCurrentPage(1); // Reset pagination
      setSuccess("GitHub data refreshed successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to refresh GitHub data");
    } finally {
      setRefreshing(false);
    }
  };

  // ===== PAGINATION HELPERS =====
  const getPaginatedRepos = (repos) => {
    const startIndex = (currentPage - 1) * REPOS_PER_PAGE;
    const endIndex = startIndex + REPOS_PER_PAGE;
    return repos.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalRepos) => {
    return Math.ceil(totalRepos / REPOS_PER_PAGE);
  };

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div
              className="skeleton skeleton-text"
              style={{ width: "120px", height: "28px" }}
            />
            <div
              className="skeleton skeleton-circle"
              style={{ width: "36px", height: "36px" }}
            />
          </div>
        </nav>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex justify-center py-12">
            <LoadingSpinner size="large" message="Loading your profile..." />
          </div>
        </div>
      </div>
    );
  }

  // ===== TOGGLE HIDE/SHOW LANGUAGE =====
  const handleToggleLanguage = async (language) => {
    setError("");
    setSuccess("");
    setTogglingLanguage(language);

    try {
      const { data } = await api.patch("/users/me/hidden-languages", {
        language,
      });
      setUser(data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update language");
    } finally {
      setTogglingLanguage(null);
    }
  };

  if (!user) return null;

  // Split skills
  const technicalSkills = skills.filter((s) => s.is_technical);
  const nonTechnicalSkills = skills.filter((s) => !s.is_technical);

  const githubData = user.github_data || {};
  const totalRepos = githubData.recent_repos?.length || 0;
  const totalPages = getTotalPages(totalRepos);
  const paginatedRepos = githubData.recent_repos
    ? getPaginatedRepos(githubData.recent_repos)
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NAVBAR */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="text-2xl font-bold text-indigo-600">
            CampusX
          </Link>
          <Link
            to="/dashboard"
            className="text-gray-700 hover:text-indigo-600 font-medium"
          >
            ← Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* MESSAGES */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex justify-between">
            <span className="text-red-700 text-sm">{error}</span>
            <button onClick={() => setError("")} className="text-red-500">
              ✕
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex justify-between">
            <span className="text-green-700 text-sm">{success}</span>
            <button onClick={() => setSuccess("")} className="text-green-500">
              ✕
            </button>
          </div>
        )}

        {/* ===== PROFILE CARD ===== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <img
              src={
                user.avatar_url ||
                "https://ui-avatars.com/api/?name=" +
                  encodeURIComponent(user.name) +
                  "&background=6366f1&color=fff&size=200"
              }
              alt="avatar"
              className="w-32 h-32 rounded-full object-cover border-4 border-indigo-100 shadow-lg"
            />

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-600 mt-1">{user.email}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <span className="bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1 rounded-full">
                  Year {user.year}
                </span>
                <span className="bg-purple-50 text-purple-700 text-sm font-medium px-3 py-1 rounded-full">
                  {user.experience_level || "Beginner"}
                </span>
                {user.availability > 0 && (
                  <span className="bg-emerald-50 text-emerald-700 text-sm font-medium px-3 py-1 rounded-full">
                    {user.availability} hrs/week
                  </span>
                )}
              </div>

              {/* Links */}
              <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                {user.github_username && (
                  <a
                    href={
                      user.github_url ||
                      `https://github.com/${user.github_username}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
                  >
                    🐙 @{user.github_username}
                  </a>
                )}
                {user.linkedin_url && (
                  <a
                    href={user.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
                  >
                    💼 LinkedIn
                  </a>
                )}
                {user.codeforces_username && (
                  <a
                    href={`https://codeforces.com/profile/${user.codeforces_username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-yellow-50 text-yellow-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-yellow-100 transition"
                  >
                    ⚡ Codeforces
                  </a>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              {isEditing ? "Cancel" : "✏️ Edit Profile"}
            </button>
          </div>

          {/* EDIT FORM */}
          {isEditing && (
            <form
              onSubmit={handleSaveProfile}
              className="mt-6 pt-6 border-t border-gray-100 space-y-4"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <select
                    value={editForm.year}
                    onChange={(e) =>
                      setEditForm({ ...editForm, year: Number(e.target.value) })
                    }
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {[1, 2, 3, 4].map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Availability (hrs/week)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="80"
                    value={editForm.availability}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        availability: Number(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience
                  </label>
                  <select
                    value={editForm.experience_level}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        experience_level: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GitHub Username
                  </label>
                  <input
                    type="text"
                    value={editForm.github_username}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        github_username: e.target.value,
                      })
                    }
                    placeholder="e.g., tiger_123"
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Save karne pe GitHub data fetch hoga
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={editForm.linkedin_url}
                    onChange={(e) =>
                      setEditForm({ ...editForm, linkedin_url: e.target.value })
                    }
                    placeholder="https://linkedin.com/in/..."
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Codeforces Username
                  </label>
                  <input
                    type="text"
                    value={editForm.codeforces_username}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        codeforces_username: e.target.value,
                      })
                    }
                    placeholder="e.g., shivam_cf"
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ===== GITHUB ACTIVITY ===== */}
        {user.github_username && githubData.public_repos !== undefined && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                🐙 GitHub Activity
              </h2>
              <button
                onClick={handleRefreshGithub}
                disabled={refreshing}
                className="flex items-center gap-2 bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm font-medium disabled:opacity-50"
              >
                {refreshing ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-gray-400/30 border-t-gray-600 rounded-full animate-spin"></span>
                    Refreshing...
                  </>
                ) : (
                  <>🔄 Refresh</>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {githubData.public_repos || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                  Public Repos
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {githubData.followers || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                  Followers
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {githubData.following || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                  Following
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {githubData.top_languages?.length || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                  Languages
                </p>
              </div>
            </div>

            {githubData.all_languages?.length > 0 && (
              <div className="mb-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      Languages ({githubData.all_languages.length})
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Click eye icon to hide from visitors
                    </p>
                  </div>
                  {githubData.all_languages.length > 6 && (
                    <button
                      onClick={() => setShowAllLanguages(!showAllLanguages)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {showAllLanguages
                        ? "Show Less"
                        : `Show All (${githubData.all_languages.length})`}
                    </button>
                  )}
                </div>

                {/* Language Chips */}
                <div className="flex flex-wrap gap-2">
                  {(showAllLanguages
                    ? githubData.all_languages
                    : githubData.all_languages.slice(0, 6)
                  ).map((lang) => {
                    const isHidden = (
                      githubData.hidden_languages || []
                    ).includes(lang);
                    const isToggling = togglingLanguage === lang;

                    return (
                      <div
                        key={lang}
                        className={`group flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium transition border ${
                          isHidden
                            ? "bg-gray-100 text-gray-400 border-gray-200 border-dashed"
                            : "bg-indigo-50 text-indigo-700 border-indigo-100"
                        }`}
                      >
                        <span className={isHidden ? "line-through" : ""}>
                          {lang}
                        </span>
                        <button
                          onClick={() => handleToggleLanguage(lang)}
                          disabled={isToggling}
                          title={
                            isHidden ? "Show to visitors" : "Hide from visitors"
                          }
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition ${
                            isHidden
                              ? "hover:bg-gray-200"
                              : "hover:bg-indigo-100"
                          } disabled:opacity-50`}
                        >
                          {isToggling ? (
                            <span className="inline-block w-3 h-3 border-2 border-gray-400/30 border-t-gray-600 rounded-full animate-spin"></span>
                          ) : isHidden ? (
                            <span className="text-xs">👁️</span>
                          ) : (
                            <span className="text-xs">👁️‍🗨️</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Hidden Languages Info */}
                {(githubData.hidden_languages || []).length > 0 && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                    <span>⚠️</span>
                    <span>
                      {githubData.hidden_languages.length} language
                      {githubData.hidden_languages.length > 1
                        ? "s are"
                        : " is"}{" "}
                      hidden from visitors
                    </span>
                  </div>
                )}
              </div>
            )}

            {githubData.recent_repos?.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                  <p className="text-sm font-semibold text-gray-700">
                    Repositories ({totalRepos})
                  </p>
                  {totalPages > 1 && (
                    <p className="text-xs text-gray-500">
                      Page {currentPage} of {totalPages}
                    </p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {paginatedRepos.map((repo) => (
                    <a
                      key={repo.name}
                      href={repo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="border border-gray-100 rounded-lg p-4 hover:border-indigo-200 hover:shadow-sm transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-semibold text-gray-900 text-sm truncate">
                          {repo.name}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          ⭐ {repo.stars}
                        </span>
                      </div>
                      {repo.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        {repo.language && repo.language !== "Unknown" && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {repo.language}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          🍴 {repo.forks}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    {/* Prev */}
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      ← Prev
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                            currentPage === pageNum
                              ? "bg-indigo-600 text-white"
                              : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      ),
                    )}

                    {/* Next */}
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== SKILLS — TWO COLUMNS ===== */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* TECHNICAL SKILLS */}
          <SkillsColumn
            title="🔧 Technical Skills"
            type="technical"
            skills={technicalSkills}
            onAdd={() => setAddingSkillType("technical")}
            onDelete={handleDeleteSkill}
            onUpdateProficiency={handleUpdateProficiency}
            addingType={addingSkillType}
            skillForm={skillForm}
            setSkillForm={setSkillForm}
            onAddSubmit={handleAddSkill}
            savingSkill={savingSkill}
            onCancelAdd={() => setAddingSkillType(null)}
          />

          {/* NON-TECHNICAL SKILLS */}
          <SkillsColumn
            title="🎨 Non-Technical Skills"
            type="non-technical"
            skills={nonTechnicalSkills}
            onAdd={() => setAddingSkillType("non-technical")}
            onDelete={handleDeleteSkill}
            onUpdateProficiency={handleUpdateProficiency}
            addingType={addingSkillType}
            skillForm={skillForm}
            setSkillForm={setSkillForm}
            onAddSubmit={handleAddSkill}
            savingSkill={savingSkill}
            onCancelAdd={() => setAddingSkillType(null)}
          />
        </div>
      </main>
    </div>
  );
}

// ===== SUB COMPONENT: Skills Column =====
function SkillsColumn({
  title,
  type,
  skills,
  onAdd,
  onDelete,
  onUpdateProficiency,
  addingType,
  skillForm,
  setSkillForm,
  onAddSubmit,
  savingSkill,
  onCancelAdd,
}) {
  // ✅ Sirf tab form dikhao jab is column ka type match kare
  const isAdding = addingType === type;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <button
          onClick={onAdd}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition font-medium text-sm"
        >
          + Add
        </button>
      </div>

      {isAdding && (
        <AddSkillForm
          skillForm={skillForm}
          setSkillForm={setSkillForm}
          onAddSubmit={onAddSubmit}
          savingSkill={savingSkill}
          onCancel={onCancelAdd}
        />
      )}

      {skills.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No skills yet
        </div>
      ) : (
        <div className="space-y-2">
          {skills.map((skill) => (
            <div
              key={skill._id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <span className="font-medium text-gray-900 text-sm truncate">
                {skill.skill_name}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => onUpdateProficiency(skill._id, star)}
                      className={`text-sm transition ${
                        star <= skill.proficiency
                          ? "text-yellow-500"
                          : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => onDelete(skill._id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== SUB COMPONENT: Add Skill Form =====
function AddSkillForm({
  skillForm,
  setSkillForm,
  onAddSubmit,
  savingSkill,
  onCancel,
}) {
  return (
    <form
      onSubmit={onAddSubmit}
      className="bg-indigo-50 rounded-lg p-3 mb-4 space-y-2"
    >
      <input
        type="text"
        placeholder="Skill name"
        value={skillForm.skill_name}
        onChange={(e) =>
          setSkillForm({ ...skillForm, skill_name: e.target.value })
        }
        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        autoFocus
        required
      />
      <select
        value={skillForm.proficiency}
        onChange={(e) =>
          setSkillForm({ ...skillForm, proficiency: Number(e.target.value) })
        }
        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
      >
        {[1, 2, 3, 4, 5].map((p) => (
          <option key={p} value={p}>
            Proficiency: {p}/5
          </option>
        ))}
      </select>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={savingSkill}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {savingSkill ? "Adding..." : "Add"}
        </button>
      </div>
    </form>
  );
}
