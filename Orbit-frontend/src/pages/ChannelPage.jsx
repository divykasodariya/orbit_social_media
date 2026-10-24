import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* APIs */
import { getUserChannelProfile } from "../api/user.api";
import { getUserVideos } from "../api/video.api";
import { getUserTweets } from "../api/tweet.api";
import { getUserPlaylists } from "../api/playlist.api";
import { toggleSubscription } from "../api/subscription.api";

/* Components */
import VideoCard from "../components/video/VideoCard";
import TweetCard from "../components/tweet/TweetCard";
import PlaylistCard from "../components/playlist/PlaylistCard";

/* Icons */
import { Bell } from "lucide-react";

const ChannelPage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [channel, setChannel] = useState(null);

  // ✅ SINGLE SOURCE OF TRUTH (JUST LIKE WATCH PAGE)
  const [isSubscribed, setIsSubscribed] = useState(null);

  const [activeTab, setActiveTab] = useState("videos");
  const [videos, setVideos] = useState([]);
  const [tweets, setTweets] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [subLoading, setSubLoading] = useState(false);

  /* ================= LOAD CHANNEL ================= */
  // useEffect(() => {
  //   const loadChannel = async () => {
  //     try {
  //       const res = await getUserChannelProfile(username);
  //       const data = res.data.data;

  //       setChannel(data);

  //       // 🔥 INIT ONCE — NEVER TOUCH AGAIN
  //       setIsSubscribed(Boolean(data.isSubscribed));
  //     } catch (err) {
  //       console.error("Failed to load channel", err);
  //     }
  //   };

  //   loadChannel();
  // }, [username]);

  useEffect(() => {
  if (!isAuthenticated) return;

  const loadChannel = async () => {
    try {
      const res = await getUserChannelProfile(username);
      const data = res.data.data;

      setChannel(data);
      setIsSubscribed(Boolean(data.isSubscribed)); // ✅ correct now
    } catch (err) {
      console.error("Failed to load channel", err);
    }
  };

  loadChannel();
}, [username, isAuthenticated]);


  /* ================= VIDEOS ================= */
  useEffect(() => {
    if (!channel?._id) return;

    getUserVideos(channel._id)
      .then((res) => setVideos(res?.data?.data?.docs || []))
      .catch(() => setVideos([]));
  }, [channel]);

  /* ================= TWEETS ================= */
  useEffect(() => {
    if (!channel?._id || activeTab !== "tweets") return;

    getUserTweets(channel._id)
      .then((res) => setTweets(res.data.data || []))
      .catch(() => setTweets([]));
  }, [channel, activeTab]);

  /* ================= PLAYLISTS ================= */
  useEffect(() => {
    if (!channel?._id || activeTab !== "playlists") return;

    getUserPlaylists(channel._id)
      .then((res) => setPlaylists(res.data.data || []))
      .catch(() => setPlaylists([]));
  }, [channel, activeTab]);

  if (!channel || isSubscribed === null) {
    return (
      <div className="p-6 text-gray-600">
        Loading channel...
      </div>
    );
  }

  const isOwnChannel = user?._id === channel._id;

  /* ================= SUBSCRIBE (IDENTICAL TO WATCH PAGE) ================= */
  const handleSubscribe = async () => {
    if (!isAuthenticated) return navigate("/login");
    if (subLoading) return;

    try {
      setSubLoading(true);

      const res = await toggleSubscription(channel._id);
      const subscribed = res.data.data.isSubscribed;

      // ✅ ONLY UPDATE LOCAL STATE
      setIsSubscribed(subscribed);
    } catch (err) {
      console.error("Subscribe toggle failed", err);
    } finally {
      setSubLoading(false);
    }
  };

  return (
    <div className="animate-[fadeIn_0.35s_ease-out]">
      {/* HEADER */}
      <div className="mb-6">
        {channel.coverImage && (
          <img
            src={channel.coverImage}
            className="w-full h-48 object-cover rounded-xl"
            alt="cover"
          />
        )}

        <div className="flex items-center gap-4 mt-4">
          <img
            src={channel.avatar}
            className="w-24 h-24 rounded-full"
            alt="avatar"
          />

          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {channel.fullName}
            </h1>
            <p className="text-gray-600">@{channel.username}</p>
            <p className="text-sm text-gray-500">
              {channel.subscribersCount} subscribers
            </p>
          </div>

          {!isOwnChannel && (
            <button
              disabled={subLoading}
              onClick={handleSubscribe}
              className={`px-5 py-2 rounded-full flex items-center gap-2
              transition-all active:scale-[0.98] ${
                isSubscribed
                  ? "bg-gray-200 text-gray-800"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <Bell size={16} />
              {isSubscribed ? "Subscribed" : "Subscribe"}
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-6 border-b mb-6">
        {["videos", "tweets", "playlists"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 font-semibold ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {activeTab === "videos" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((v) => (
            <VideoCard key={v._id} video={v} />
          ))}
        </div>
      )}

      {activeTab === "tweets" && (
        <div className="max-w-2xl space-y-4">
          {tweets.map((t) => (
            <TweetCard key={t._id} tweet={t} />
          ))}
        </div>
      )}

      {activeTab === "playlists" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((p) => (
            <PlaylistCard
              key={p._id}
              playlist={p}
              videoCount={p.videos?.length || 0}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ChannelPage;
