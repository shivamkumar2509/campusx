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
      const newSkill = data.data;

      setSkills((prev) => {
        const exists = prev.some((s) => s._id === newSkill._id);
        return exists
          ? prev.map((s) => (s._id === newSkill._id ? newSkill : s))
          : [...prev, newSkill];
      });

      setSuccess(
        data.message === "Skill updated"
          ? "Skill updated successfully!"
          : "Skill added successfully!",
      );
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
      setCurrentPage(1);
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
      <div className="pf-root min-h-screen">
        <TopBar />
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="flex justify-center">
            <LoadingSpinner size="large" message="Loading your profile..." />
          </div>
        </div>
        <ProfileStyles />
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

  const avatarSrc =
    user.avatar_url ||
    "https://ui-avatars.com/api/?name=" +
      encodeURIComponent(user.name || "U") +
      "&background=ffffff&color=2347e6&size=200&bold=true";

  const levelLabel = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  };

  return (
    <div className="pf-root min-h-screen">
      <TopBar />

      <main className="max-w-6xl mx-auto px-5 py-8">
        {/* ===== MESSAGES ===== */}
        <div aria-live="polite">
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 pf-pop"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                !
              </span>
              <p className="flex-1 text-sm text-red-800">{error}</p>
              <button
                onClick={() => setError("")}
                aria-label="Dismiss error"
                className="pf-focus w-7 h-7 rounded-md text-red-700 hover:bg-red-100 text-sm"
              >
                ✕
              </button>
            </div>
          )}
          {success && (
            <div
              role="status"
              className="mb-5 flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 pf-pop"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                ✓
              </span>
              <p className="flex-1 text-sm text-emerald-800">{success}</p>
              <button
                onClick={() => setSuccess("")}
                aria-label="Dismiss message"
                className="pf-focus w-7 h-7 rounded-md text-emerald-700 hover:bg-emerald-100 text-sm"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-8 items-start">
          {/* ===== IDENTITY RAIL ===== */}
          <aside className="pf-rail rounded-3xl overflow-hidden lg:sticky lg:top-24 shadow-2xl">
            {/* Cover gradient banner */}
            <div className="relative h-24 bg-gradient-to-br from-white/25 via-white/10 to-transparent">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                  backgroundSize: "16px 16px",
                }}
              />
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[color:var(--brand)] to-transparent" />
            </div>

            <div className="px-7 pb-7 -mt-14 relative">
              {/* Avatar */}
              <div className="relative inline-block">
                <div className="absolute -inset-1 bg-white/30 rounded-2xl blur-md" />
                <img
                  src={avatarSrc}
                  alt={`${user.name || "User"} avatar`}
                  className="relative w-24 h-24 rounded-2xl object-cover bg-white ring-4 ring-[color:var(--brand)] shadow-xl"
                />
                {user.github_verified_at && (
                  <span
                    title="GitHub verified"
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-lg ring-2 ring-[color:var(--brand)]"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="#16a34a"
                    >
                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                    </svg>
                  </span>
                )}
              </div>

              {/* Name + email */}
              <h1 className="pf-display text-2xl font-bold leading-tight mt-5 break-words">
                {user.name}
              </h1>
              <p className="text-sm text-white/70 mt-1 break-all">
                {user.email}
              </p>

              {/* Verified badge */}
              {user.github_verified_at && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/90 bg-white/15 backdrop-blur px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Verified student
                </p>
              )}

              {/* Divider */}
              <div className="my-6 h-px bg-white/15" />

              {/* Info list */}
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <dt className="text-white/60 text-xs uppercase tracking-wider font-semibold">
                    Year
                  </dt>
                  <dd className="font-bold">Year {user.year}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-white/60 text-xs uppercase tracking-wider font-semibold">
                    Experience
                  </dt>
                  <dd className="font-bold">
                    {levelLabel[user.experience_level] || "Beginner"}
                  </dd>
                </div>
                {user.availability > 0 && (
                  <div className="flex justify-between items-center">
                    <dt className="text-white/60 text-xs uppercase tracking-wider font-semibold">
                      Availability
                    </dt>
                    <dd className="font-bold">{user.availability} hrs/wk</dd>
                  </div>
                )}
              </dl>

              {/* Links */}
              {(user.github_username ||
                user.linkedin_url ||
                user.codeforces_username) && (
                <>
                  <div className="my-6 h-px bg-white/15" />
                  <ul className="space-y-2">
                    {user.github_username && (
                      <li>
                        <a
                          href={
                            user.github_url ||
                            `https://github.com/${user.github_username}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="pf-focus-light group flex items-center gap-3 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2.5 text-sm font-semibold transition-all hover:translate-x-0.5"
                        >
                          <span className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-base">
                            🐙
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[10px] text-white/60 uppercase tracking-wider font-bold">
                              GitHub
                            </span>
                            <span className="block truncate text-xs text-white/90">
                              @{user.github_username}
                            </span>
                          </span>
                          <span className="text-white/40 group-hover:text-white/90 transition-colors">
                            ↗
                          </span>
                        </a>
                      </li>
                    )}
                    {user.linkedin_url && (
                      <li>
                        <a
                          href={user.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          className="pf-focus-light group flex items-center gap-3 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2.5 text-sm font-semibold transition-all hover:translate-x-0.5"
                        >
                          <span className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-base">
                            💼
                          </span>
                          <span className="flex-1">
                            <span className="block text-[10px] text-white/60 uppercase tracking-wider font-bold">
                              LinkedIn
                            </span>
                            <span className="block text-xs text-white/90">
                              View profile
                            </span>
                          </span>
                          <span className="text-white/40 group-hover:text-white/90 transition-colors">
                            ↗
                          </span>
                        </a>
                      </li>
                    )}
                    {user.codeforces_username && (
                      <li>
                        <a
                          href={`https://codeforces.com/profile/${user.codeforces_username}`}
                          target="_blank"
                          rel="noreferrer"
                          className="pf-focus-light group flex items-center gap-3 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2.5 text-sm font-semibold transition-all hover:translate-x-0.5"
                        >
                          <span className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-base">
                            ⚡
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[10px] text-white/60 uppercase tracking-wider font-bold">
                              Codeforces
                            </span>
                            <span className="block truncate text-xs text-white/90">
                              {user.codeforces_username}
                            </span>
                          </span>
                          <span className="text-white/40 group-hover:text-white/90 transition-colors">
                            ↗
                          </span>
                        </a>
                      </li>
                    )}
                  </ul>
                </>
              )}

              {/* Edit button */}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="pf-focus-light mt-6 w-full rounded-xl bg-white text-[color:var(--brand)] font-bold text-sm py-3 hover:bg-white/90 transition-all hover:shadow-lg hover:shadow-black/20"
              >
                {isEditing ? "Cancel editing" : "✏️ Edit profile"}
              </button>
            </div>
          </aside>

          {/* ===== MAIN COLUMN ===== */}
          <div className="space-y-10 min-w-0">
            {/* ===== EDIT FORM ===== */}
            {isEditing && (
              <section className="rounded-2xl border-2 border-[color:var(--brand)] bg-white p-6 sm:p-7 pf-pop">
                <h2 className="pf-display text-xl font-bold mb-5">
                  Edit profile
                </h2>
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <Field label="Full name" id="pf-name">
                      <input
                        id="pf-name"
                        type="text"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        className="input-base"
                      />
                    </Field>

                    <Field label="Academic year" id="pf-year">
                      <select
                        id="pf-year"
                        value={editForm.year}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            year: Number(e.target.value),
                          })
                        }
                        className="input-base"
                      >
                        {[1, 2, 3, 4].map((y) => (
                          <option key={y} value={y}>
                            Year {y}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Availability (hrs/week)" id="pf-avail">
                      <input
                        id="pf-avail"
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
                        className="input-base"
                      />
                    </Field>

                    <Field label="Experience level" id="pf-exp">
                      <select
                        id="pf-exp"
                        value={editForm.experience_level}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            experience_level: e.target.value,
                          })
                        }
                        className="input-base"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </Field>

                    <Field label="GitHub username" id="pf-gh">
                      <input
                        id="pf-gh"
                        type="text"
                        value={editForm.github_username}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            github_username: e.target.value,
                          })
                        }
                        placeholder="e.g., tiger_123"
                        className="input-base"
                      />
                    </Field>

                    <Field label="LinkedIn URL" id="pf-li">
                      <input
                        id="pf-li"
                        type="url"
                        value={editForm.linkedin_url}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            linkedin_url: e.target.value,
                          })
                        }
                        placeholder="https://linkedin.com/in/..."
                        className="input-base"
                      />
                    </Field>

                    <div className="md:col-span-2">
                      <Field label="Codeforces username" id="pf-cf">
                        <input
                          id="pf-cf"
                          type="text"
                          value={editForm.codeforces_username}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              codeforces_username: e.target.value,
                            })
                          }
                          placeholder="e.g., shivam_cf"
                          className="input-base"
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="pf-focus px-5 py-2.5 rounded-lg border border-[color:var(--line)] text-sm font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="pf-focus inline-flex items-center gap-2 bg-[color:var(--brand)] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-[color:var(--brand-dark)] disabled:opacity-60 transition-colors"
                    >
                      {saving && (
                        <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      )}
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* ===== GITHUB ACTIVITY ===== */}
            {user.github_username && githubData.public_repos !== undefined && (
              <section>
                <div className="flex justify-between items-end flex-wrap gap-3 pb-3 border-b-2 border-[color:var(--ink)]">
                  <div>
                    <h2 className="pf-display text-2xl font-bold">
                      GitHub activity
                    </h2>
                    <p className="text-sm text-[color:var(--muted)] mt-0.5">
                      Synced from your GitHub profile
                    </p>
                  </div>
                  <button
                    onClick={handleRefreshGithub}
                    disabled={refreshing}
                    className="pf-focus inline-flex items-center gap-2 border border-[color:var(--line)] bg-white px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm font-semibold disabled:opacity-60"
                  >
                    {refreshing ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      "Refresh data"
                    )}
                  </button>
                </div>

                {/* Stats */}
                <dl className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[color:var(--line)] border-b border-[color:var(--line)]">
                  <StatCard
                    value={githubData.public_repos || 0}
                    label="Public repos"
                  />
                  <StatCard
                    value={githubData.followers || 0}
                    label="Followers"
                  />
                  <StatCard
                    value={githubData.following || 0}
                    label="Following"
                  />
                  <StatCard
                    value={githubData.top_languages?.length || 0}
                    label="Languages"
                  />
                </dl>

                {/* Languages */}
                {githubData.all_languages?.length > 0 && (
                  <div className="mt-7">
                    <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                      <div>
                        <h3 className="text-base font-bold">
                          Languages{" "}
                          <span className="text-[color:var(--muted)] font-medium">
                            ({githubData.all_languages.length})
                          </span>
                        </h3>
                        <p className="text-xs text-[color:var(--muted)] mt-0.5">
                          Use the eye button to hide a language from visitors
                        </p>
                      </div>
                      {githubData.all_languages.length > 6 && (
                        <button
                          onClick={() => setShowAllLanguages(!showAllLanguages)}
                          className="pf-focus text-sm text-[color:var(--brand)] hover:underline font-semibold px-2 py-1 rounded-md"
                        >
                          {showAllLanguages
                            ? "Show less"
                            : `Show all (${githubData.all_languages.length})`}
                        </button>
                      )}
                    </div>

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
                            className={`flex items-center gap-1 pl-3.5 pr-1.5 py-1.5 rounded-md text-sm font-semibold border transition-colors ${
                              isHidden
                                ? "bg-transparent text-slate-400 border-dashed border-slate-300"
                                : "bg-white text-[color:var(--ink)] border-[color:var(--line)]"
                            }`}
                          >
                            <span className={isHidden ? "line-through" : ""}>
                              {lang}
                            </span>
                            <button
                              onClick={() => handleToggleLanguage(lang)}
                              disabled={isToggling}
                              aria-label={
                                isHidden
                                  ? `Show ${lang} to visitors`
                                  : `Hide ${lang} from visitors`
                              }
                              title={
                                isHidden
                                  ? "Show to visitors"
                                  : "Hide from visitors"
                              }
                              className="pf-focus w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 disabled:opacity-50"
                            >
                              {isToggling ? (
                                <span className="inline-block w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
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

                    {(githubData.hidden_languages || []).length > 0 && (
                      <p className="mt-4 text-sm text-amber-900 bg-amber-50 border-l-4 border-amber-500 rounded-r-md px-4 py-2.5">
                        <strong className="font-bold">
                          {githubData.hidden_languages.length} language
                          {githubData.hidden_languages.length > 1
                            ? "s are"
                            : " is"}
                        </strong>{" "}
                        hidden from visitors
                      </p>
                    )}
                  </div>
                )}

                {/* Repos */}
                {githubData.recent_repos?.length > 0 && (
                  <div className="mt-8">
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                      <h3 className="text-base font-bold">
                        Repositories{" "}
                        <span className="text-[color:var(--muted)] font-medium">
                          ({totalRepos})
                        </span>
                      </h3>
                      {totalPages > 1 && (
                        <p className="text-sm text-[color:var(--muted)] font-medium">
                          Page {currentPage} of {totalPages}
                        </p>
                      )}
                    </div>

                    <ul className="border-t border-[color:var(--line)]">
                      {paginatedRepos.map((repo) => (
                        <li
                          key={repo.name}
                          className="border-b border-[color:var(--line)]"
                        >
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="pf-focus group flex items-start justify-between gap-4 py-4 px-2 -mx-2 rounded-md hover:bg-white transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-[color:var(--ink)] group-hover:text-[color:var(--brand)] truncate transition-colors">
                                {repo.name}
                              </p>
                              {repo.description && (
                                <p className="text-sm text-[color:var(--muted)] line-clamp-2 mt-1 max-w-prose">
                                  {repo.description}
                                </p>
                              )}
                              {repo.language && repo.language !== "Unknown" && (
                                <span className="inline-block mt-2 text-xs font-semibold text-[color:var(--brand)] bg-[color:var(--brand-soft)] px-2 py-0.5 rounded">
                                  {repo.language}
                                </span>
                              )}
                            </div>
                            <div className="flex-shrink-0 text-right text-sm text-[color:var(--muted)] space-y-0.5">
                              <p>
                                <span className="font-bold text-[color:var(--ink)]">
                                  {repo.stars}
                                </span>{" "}
                                stars
                              </p>
                              <p>
                                <span className="font-bold text-[color:var(--ink)]">
                                  {repo.forks}
                                </span>{" "}
                                forks
                              </p>
                            </div>
                          </a>
                        </li>
                      ))}
                    </ul>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <nav
                        aria-label="Repository pages"
                        className="flex justify-center items-center gap-1.5 mt-6 flex-wrap"
                      >
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1}
                          className="pf-focus px-3.5 py-2 rounded-lg text-sm font-semibold border border-[color:var(--line)] bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          ← Prev
                        </button>

                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1,
                        ).map((pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            aria-current={
                              currentPage === pageNum ? "page" : undefined
                            }
                            className={`pf-focus w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                              currentPage === pageNum
                                ? "bg-[color:var(--ink)] text-white"
                                : "border border-[color:var(--line)] bg-white hover:bg-slate-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}

                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                          className="pf-focus px-3.5 py-2 rounded-lg text-sm font-semibold border border-[color:var(--line)] bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Next →
                        </button>
                      </nav>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* ===== SKILLS ===== */}
            <section>
              <div className="pb-3 border-b-2 border-[color:var(--ink)]">
                <h2 className="pf-display text-2xl font-bold">Skills</h2>
                <p className="text-sm text-[color:var(--muted)] mt-0.5">
                  Click a bar to set your proficiency
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-x-10 gap-y-8 mt-6">
                <SkillsColumn
                  title="Technical"
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
                <SkillsColumn
                  title="Non-technical"
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
            </section>
          </div>
        </div>
      </main>

      <ProfileStyles />
    </div>
  );
}

/* ===== Top bar ===== */
function TopBar() {
  return (
    <nav className="sticky top-0 z-40 bg-[color:var(--paper)]/90 backdrop-blur border-b border-[color:var(--line)]">
      <div className="max-w-6xl mx-auto px-5 h-16 flex justify-between items-center">
        <Link
          to="/dashboard"
          className="pf-focus pf-display text-xl font-extrabold tracking-tight text-[color:var(--ink)] rounded"
        >
          Campus<span className="text-[color:var(--brand)]">X</span>
        </Link>
        <Link
          to="/dashboard"
          className="pf-focus text-sm font-semibold text-[color:var(--ink)] hover:text-[color:var(--brand)] transition-colors px-3 py-2 rounded-lg"
        >
          ← Back to dashboard
        </Link>
      </div>
    </nav>
  );
}

/* ===== Global styles ===== */
function ProfileStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Figtree:wght@400;500;600;700&display=swap');

      .pf-root {
        --ink: #0f1a2e;
        --muted: #5b6678;
        --paper: #f5f7fa;
        --line: #dde2ea;
        --brand: #2347e6;
        --brand-dark: #1a37b8;
        --brand-soft: #e8edff;
        background: var(--paper);
        color: var(--ink);
        font-family: 'Figtree', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
      }
      .pf-display {
        font-family: 'Sora', 'Figtree', ui-sans-serif, system-ui, sans-serif;
        letter-spacing: -0.02em;
      }
      .pf-rail {
        background: var(--brand);
        color: #fff;
      }
      .pf-focus:focus-visible {
        outline: 3px solid var(--brand);
        outline-offset: 2px;
      }
      .pf-focus-light:focus-visible {
        outline: 3px solid #fff;
        outline-offset: 2px;
      }
      .input-base {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 0.6rem;
        padding: 0.65rem 0.9rem;
        font-size: 0.9rem;
        color: var(--ink);
        background: #fff;
        outline: none;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .input-base:hover {
        border-color: #b9c2d0;
      }
      .input-base:focus {
        border-color: var(--brand);
        box-shadow: 0 0 0 3px rgba(35, 71, 230, 0.18);
      }
      .input-base::placeholder {
        color: #94a0b3;
      }
      .pf-pop {
        animation: pfPop 0.2s ease-out;
      }
      @keyframes pfPop {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      @media (prefers-reduced-motion: reduce) {
        .pf-pop { animation: none; }
      }
    `}</style>
  );
}

/* ===== Helper: Field ===== */
function Field({ label, hint, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold mb-1.5">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-[color:var(--muted)] mt-1.5">{hint}</p>
      )}
    </div>
  );
}

/* ===== Helper: StatCard ===== */
function StatCard({ value, label }) {
  return (
    <div className="py-5 px-4 first:pl-0">
      <dd className="pf-display text-3xl font-bold leading-none">{value}</dd>
      <dt className="text-sm text-[color:var(--muted)] mt-2">{label}</dt>
    </div>
  );
}

/* ===== SUB COMPONENT: Skills Column ===== */
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
  const isAdding = addingType === type;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">
          {title}{" "}
          <span className="text-[color:var(--muted)] font-medium text-base">
            ({skills.length})
          </span>
        </h3>
        <button
          onClick={onAdd}
          className="pf-focus inline-flex items-center gap-1.5 bg-[color:var(--ink)] text-white px-3.5 py-2 rounded-lg hover:bg-black transition-colors font-semibold text-sm"
        >
          <span aria-hidden="true" className="leading-none">
            +
          </span>
          Add skill
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
        <div className="rounded-xl border-2 border-dashed border-[color:var(--line)] px-5 py-8 text-center">
          <p className="text-sm font-semibold">
            No {title.toLowerCase()} skills yet
          </p>
          <p className="text-sm text-[color:var(--muted)] mt-1">
            Use "Add skill" to list your first one.
          </p>
        </div>
      ) : (
        <ul className="border-t border-[color:var(--line)]">
          {skills.map((skill) => (
            <li
              key={skill._id}
              className="group flex items-center justify-between gap-3 py-3 border-b border-[color:var(--line)]"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-semibold text-sm truncate">
                  {skill.skill_name}
                </span>

                {skill.source === "github" && (
                  <span
                    title="Auto-detected from your GitHub repositories"
                    className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[color:var(--brand)] bg-[color:var(--brand-soft)] px-1.5 py-0.5 rounded"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                    GH
                  </span>
                )}

                {skill.source === "codeforces" && (
                  <span
                    title="Verified from Codeforces"
                    className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded"
                  >
                    CF
                  </span>
                )}

                {skill.verified && skill.source === "manual" && (
                  <span
                    title="Verified skill"
                    className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded"
                  >
                    ✓
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div
                  className="flex gap-1"
                  role="group"
                  aria-label={`Proficiency for ${skill.skill_name}`}
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => onUpdateProficiency(skill._id, level)}
                      aria-label={`Set proficiency to ${level} of 5`}
                      aria-pressed={level <= skill.proficiency}
                      title={`${level}/5`}
                      className={`pf-focus h-4 w-3.5 sm:w-5 rounded-sm transition-colors ${
                        level <= skill.proficiency
                          ? "bg-[color:var(--brand)]"
                          : "bg-slate-200 hover:bg-[color:var(--brand-soft)]"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => onDelete(skill._id)}
                  className="pf-focus w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center text-xs font-bold md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                  title="Delete skill"
                  aria-label={`Delete ${skill.skill_name}`}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ===== SUB COMPONENT: Add Skill Form ===== */
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
      className="bg-white rounded-xl p-4 mb-4 space-y-3 border border-[color:var(--brand)] pf-pop"
    >
      <input
        type="text"
        placeholder="Skill name (e.g., React, Public Speaking)"
        aria-label="Skill name"
        value={skillForm.skill_name}
        onChange={(e) =>
          setSkillForm({ ...skillForm, skill_name: e.target.value })
        }
        className="input-base"
        autoFocus
        required
      />
      <select
        aria-label="Proficiency"
        value={skillForm.proficiency}
        onChange={(e) =>
          setSkillForm({ ...skillForm, proficiency: Number(e.target.value) })
        }
        className="input-base"
      >
        {[1, 2, 3, 4, 5].map((p) => (
          <option key={p} value={p}>
            Proficiency: {p}/5
          </option>
        ))}
      </select>
      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="pf-focus px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={savingSkill}
          className="pf-focus bg-[color:var(--brand)] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[color:var(--brand-dark)] disabled:opacity-60 transition-colors"
        >
          {savingSkill ? "Adding..." : "Add skill"}
        </button>
      </div>
    </form>
  );
}
