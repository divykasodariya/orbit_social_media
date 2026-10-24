import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getChannelStats,
  getChannelVideos,
} from "../api/dashboard.api";
import VideoCard from "../components/video/VideoCard";
import {
  Video,
  Eye,
  ThumbsUp,
  Users,
  TrendingUp,
} from "lucide-react";

const DashboardPage = () => {
  const { isAuthenticated, user } = useAuth();

  const [stats, setStats] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadDashboard = async () => {
      try {
        const statsRes = await getChannelStats();
        const videosRes = await getChannelVideos();

        setStats(statsRes.data.data);
        setVideos(videosRes.data.data || []);
      } catch (err) {
        console.error("Dashboard load failed", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="text-center mt-16 text-gray-600 animate-[fadeIn_0.3s_ease-out]">
        Login to access your dashboard
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center mt-10 text-gray-600 animate-[fadeIn_0.3s_ease-out]">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="animate-[fadeIn_0.35s_ease-out]">
      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-2 animate-[slideUp_0.35s_ease-out]">
        Channel Dashboard
      </h1>
      <p
        className="text-gray-600 mb-8 animate-[slideUp_0.4s_ease-out]"
      >
        Welcome back, {user?.fullName}
      </p>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard
          icon={Video}
          label="Total Videos"
          value={stats.totalVideos}
          delay="0s"
        />
        <StatCard
          icon={Eye}
          label="Total Views"
          value={stats.totalViews}
          delay="0.05s"
        />
        <StatCard
          icon={ThumbsUp}
          label="Total Likes"
          value={stats.totalLikes}
          delay="0.1s"
        />
        <StatCard
          icon={Users}
          label="Subscribers"
          value={stats.totalSubscribers}
          delay="0.15s"
        />
      </div>

      {/* QUICK ACTIONS */}
      <div
        className="bg-white border rounded-xl p-6 mb-10
        animate-[cardIn_0.4s_ease-out]"
      >
        <h2 className="text-xl font-semibold mb-4">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActionCard
            to="/upload"
            color="blue"
            icon={Video}
            title="Upload Video"
            desc="Share new content"
          />

          <ActionCard
            to="/studio/videos"
            color="green"
            icon={TrendingUp}
            title="Manage Videos"
            desc="Edit & publish videos"
          />

          <ActionCard
            to={`/channel/${user?.username}`}
            color="purple"
            icon={Users}
            title="View Channel"
            desc="Public channel page"
          />
        </div>
      </div>

      {/* RECENT VIDEOS */}
      <h2
        className="text-xl font-semibold mb-4
        animate-[slideUp_0.3s_ease-out]"
      >
        Recent Videos
      </h2>

      {videos.length === 0 ? (
        <p className="text-gray-500 animate-[fadeIn_0.3s_ease-out]">
          No videos uploaded yet
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.slice(0, 6).map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, delay }) => (
  <div
    className="bg-white border rounded-xl p-6
    transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md
    animate-[cardIn_0.4s_ease-out]"
    style={{ animationDelay: delay }}
  >
    <div className="flex items-center gap-4">
      <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  </div>
);

const ActionCard = ({ to, icon: Icon, title, desc, color }) => {
  const colors = {
    blue: "hover:border-blue-500 hover:bg-blue-50",
    green: "hover:border-green-500 hover:bg-green-50",
    purple: "hover:border-purple-500 hover:bg-purple-50",
  };

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 p-4 border-2 rounded-lg
      transition-all duration-200
      hover:-translate-y-0.5 ${colors[color]}`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center
        bg-${color}-100`}
      >
        <Icon className={`text-${color}-600`} />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-gray-600">{desc}</p>
      </div>
    </Link>
  );
};

export default DashboardPage;
