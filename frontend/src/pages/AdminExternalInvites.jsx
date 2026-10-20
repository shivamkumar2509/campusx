import { useEffect, useState } from "react";
import {
  fetchExternalInvites,
  approveExternalInvite,
  rejectExternalInvite,
} from "../api/admin";
import PageShell from "../components/common/PageShell";
import { LoadingBlock, EmptyState } from "../components/common/StateViews";

export default function AdminExternalInvites() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchExternalInvites();
      setInvites(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (id, action) => {
    try {
      if (action === "approve") await approveExternalInvite(id);
      else await rejectExternalInvite(id);
      load();
    } catch (err) {
      alert("Failed to process");
    }
  };

  return (
    <PageShell>
      <h1 className="text-3xl font-bold mb-6">External Invitations</h1>
      <p className="text-gray-600 mb-6">
        Approve external students to let them join teams.
      </p>

      {loading && <LoadingBlock lines={4} />}
      {!loading && invites.length === 0 && (
        <EmptyState title="No pending external invites" />
      )}

      {!loading && invites.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Name / Email</th>
                <th className="px-4 py-3">Invited To Team</th>
                <th className="px-4 py-3">Invited By</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invites.map((i) => (
                <tr key={i._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold">
                      {i.registered_user_id?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {i.registered_user_id?.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-medium">{i.team_id?.name}</td>
                  <td className="px-4 py-3">{i.invited_by?.name}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleAction(i._id, "approve")}
                      className="bg-green-600 text-white px-3 py-1 rounded text-xs"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(i._id, "reject")}
                      className="bg-red-600 text-white px-3 py-1 rounded text-xs"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
