import { avatarUrl } from "../../utils/clubHelpers";

const GROUPS = [
  { role: "secretary", title: "Secretary" },
  { role: "core_member", title: "Core Members" },
  { role: "member", title: "Members" },
];

function MemberCard({ member }) {
  const name = member.name || "Unknown member";
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3">
      <img
        src={avatarUrl(name)}
        alt={name}
        className="w-11 h-11 rounded-full object-cover"
      />
      <div className="min-w-0">
        <p className="font-medium text-gray-900 truncate">{name}</p>
        {member.year ? (
          <p className="text-xs text-gray-500">Year {member.year}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function MemberList({ members }) {
  return (
    <div className="space-y-6">
      {GROUPS.map((group) => {
        const list = members.filter((m) => m.role === group.role);
        if (list.length === 0) return null;
        return (
          <div key={group.role}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
              {group.title}
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((m) => (
                <MemberCard key={m._id} member={m} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
