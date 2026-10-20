import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import PageShell from "../components/common/PageShell";
import { ErrorState, LoadingBlock } from "../components/common/StateViews";

export default function UserProfile() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/users/${userId}`);
        setUser(data.data);
      } catch (err) {
        setError(err.response?.data?.message || "User not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const avatar =
    user?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user?.name || "U",
    )}&background=6366f1&color=fff&size=200`;

  return (
    <PageShell>
      {loading && (
        <div className="bg-white border rounded-xl p-8">
          <LoadingBlock lines={5} />
        </div>
      )}
      {!loading && error && <ErrorState message={error} />}

      {!loading && !error && user && (
        <>
          <Link
            to="/dashboard"
            className="text-sm text-indigo-600 hover:underline"
          >
            ← Back
          </Link>

          <section className="mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
            <div className="flex items-center gap-6 flex-wrap">
              <img
                src={avatar}
                alt={user.name}
                className="w-24 h-24 rounded-2xl ring-4 ring-white/30 object-cover"
              />
              <div>
                <h1 className="text-3xl font-bold">{user.name}</h1>
                <p className="text-indigo-100 mt-1">
                  Year {user.year}
                  {user.experience_level && ` · ${user.experience_level}`}
                </p>
                {user.github_verified_at && (
                  <span className="mt-2 inline-block bg-white/20 text-xs px-3 py-1 rounded-full">
                    ✓ Verified student
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Club Roles */}
          {user.clubs && user.clubs.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xl font-bold mb-3">Club Roles</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {user.clubs.map((c) => (
                  <Link
                    key={c._id}
                    to={`/clubs/${c._id}`}
                    className="bg-white border rounded-xl p-4 hover:shadow-md transition flex justify-between items-center"
                  >
                    <span className="font-semibold">
                      {c.display_name || c.name}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded font-semibold ${
                        c.role === "secretary"
                          ? "bg-purple-100 text-purple-700"
                          : c.role === "core_member"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {c.role === "core_member"
                        ? "Joint Secretary"
                        : c.role.charAt(0).toUpperCase() + c.role.slice(1)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Skills */}
          <section className="mt-6">
            <h2 className="text-xl font-bold mb-3">Skills</h2>
            <div className="bg-white border rounded-xl p-6">
              {user.skills.length === 0 ? (
                <p className="text-gray-500 text-sm">No skills listed yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((s) => (
                    <span
                      key={s._id}
                      className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-sm"
                    >
                      {s.skill_name}
                      <span className="bg-indigo-200 text-indigo-800 text-xs px-1.5 rounded font-bold">
                        {s.proficiency}/5
                      </span>
                      {s.verified && <span className="text-green-600">✓</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* GitHub */}
          {user.github_username && (
            <section className="mt-6">
              <h2 className="text-xl font-bold mb-3">GitHub</h2>
              <div className="bg-white border rounded-xl p-6">
                <a
                  href={
                    user.github_url ||
                    `https://github.com/${user.github_username}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline font-medium"
                >
                  @{user.github_username} ↗
                </a>
                {user.github_data && (
                  <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">
                        {user.github_data.public_repos || 0}
                      </p>
                      <p className="text-xs text-gray-500">Repos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {user.github_data.followers || 0}
                      </p>
                      <p className="text-xs text-gray-500">Followers</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {user.github_data.all_languages?.length || 0}
                      </p>
                      <p className="text-xs text-gray-500">Languages</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </PageShell>
  );
}
