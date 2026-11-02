import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUserCommunities } from "../../api/community.api";
import Loader from "../common/Loader";
import EmptyState from "../common/EmptyState";
import { Users } from "lucide-react";
import { getInitials } from "../../utils/helpers";

const ProfileCommunitiesTab = ({ userId }) => {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getUserCommunities(userId)
      .then((res) => {
        const data = res.data?.data;
        if (Array.isArray(data)) {
          setCommunities(data);
        } else {
          setCommunities([]);
        }
      })
      .catch(() => setCommunities([]))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Loader />;

  if (!communities.length) {
    return (
      <EmptyState
        title="No communities"
        description="This user hasn't joined any communities yet."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-[fadeIn_0.35s_ease-out]">
      {communities.map((community) => (
        <Link
          key={community._id}
          to="/communities"
          className="bg-white rounded-xl border border-gray-200/80 hover:border-gray-300 shadow-xs hover:shadow-md transition-all p-4 block group"
        >
          {/* Banner / Avatar Placeholder */}
          <div className="h-24 rounded-lg overflow-hidden bg-slate-100 border border-slate-200/80 mb-3 flex items-center justify-center relative">
            {community.banner ? (
              <img
                src={community.banner}
                alt={community.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : community.avatar ? (
              <img
                src={community.avatar}
                alt={community.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                <div className="w-11 h-11 rounded-full bg-white border border-slate-300/80 shadow-2xs flex items-center justify-center text-slate-700 font-bold text-base select-none uppercase tracking-wide">
                  {getInitials(community.name)}
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
            {community.name}
          </h3>
          {community.description ? (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
              {community.description}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-1 italic">No description provided</p>
          )}
          <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-500 font-medium">
            <Users size={13} className="text-gray-400" />
            <span>{community.memberCount ?? 0} members</span>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default ProfileCommunitiesTab;
