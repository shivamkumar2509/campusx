import { fetchClubs } from "../api/clubs";
import useApiData from "../hooks/useApiData";
import PageShell from "../components/common/PageShell";
import ClubCard from "../components/clubs/ClubCard";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "../components/common/StateViews";

export default function Clubs() {
  const { data, loading, error, reload } = useApiData(
    () => fetchClubs({ limit: 100 }),
    []
  );
  const clubs = (data && data.data) || [];

  return (
    <PageShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Clubs</h1>
        <p className="mt-1 text-gray-600">
          Discover campus clubs, meet their members and join recruitments.
        </p>
      </div>

      {loading && <LoadingCards count={5} />}

      {!loading && error && <ErrorState message={error.message} onRetry={reload} />}

      {!loading && !error && clubs.length === 0 && (
        <EmptyState
          icon="🎭"
          title="No clubs found"
          message="Clubs will show up here once they are created."
        />
      )}

      {!loading && !error && clubs.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map((club) => (
            <ClubCard key={club._id} club={club} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
