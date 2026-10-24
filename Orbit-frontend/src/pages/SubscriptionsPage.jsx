import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getSubscribedChannels,
  toggleSubscription,
} from "../api/subscription.api";
import { Bell } from "lucide-react";

const SubscriptionsPage = () => {
  const { isAuthenticated } = useAuth();

  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadSubscriptions = async () => {
      try {
        const res = await getSubscribedChannels();
        setChannels(Array.isArray(res.data.data) ? res.data.data : []);
      } catch (err) {
        console.error("Failed to load subscriptions", err);
      } finally {
        setLoading(false);
      }
    };

    loadSubscriptions();
  }, [isAuthenticated]);

  // const handleUnsubscribe = async (channelId) => {
  //   if (actionLoading) return;

  //   try {
  //     setActionLoading(channelId);
  //     const res = await toggleSubscription(channelId);

  //     if (res.data.data.isSubscribed === false) {
  //       setChannels((prev) =>
  //         prev.filter((c) => c._id !== channelId)
  //       );
  //     }
  //   } catch (err) {
  //     console.error("Unsubscribe failed", err);
  //   } finally {
  //     setActionLoading(null);
  //   }
  // };

  const handleUnsubscribe = async (channelId) => {
  if (actionLoading) return;

  try {
    setActionLoading(channelId);

    const res = await toggleSubscription(channelId);

    // ✅ THIS IS THE CORRECT PLACE
    if (res.data.data.isSubscribed === false) {
      setChannels((prev) =>
        prev.filter((c) => c._id !== channelId)
      );
    }
  } catch (err) {
    console.error("Unsubscribe failed", err);
  } finally {
    setActionLoading(null);
  }
};


  if (!isAuthenticated) {
    return (
      <div className="text-center mt-16 text-gray-600 animate-[fadeIn_0.3s_ease-out]">
        Login to see your subscriptions
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center mt-16 text-gray-600 animate-[fadeIn_0.3s_ease-out]">
        Loading subscriptions...
      </div>
    );
  }

  return (
    <div className="animate-[fadeIn_0.35s_ease-out]">
      <h1 className="text-3xl font-bold mb-6">
        Subscriptions
      </h1>

      {channels.length === 0 ? (
        <p className="text-gray-500 animate-[fadeIn_0.3s_ease-out]">
          No subscriptions yet
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel, i) => (
            <div
              key={channel._id}
              style={{ animationDelay: `${i * 0.05}s` }}
              className="bg-white border rounded-xl p-6
              transition-all duration-300
              hover:-translate-y-1 hover:shadow-md
              animate-[cardIn_0.4s_ease-out]"
            >
              <Link to={`/channel/${channel.username}`}>
                <img
                  src={channel.avatar}
                  alt={channel.fullName}
                  className="w-20 h-20 rounded-full mx-auto mb-3
                  transition-transform duration-300 hover:scale-105"
                />
                <h3 className="text-lg font-semibold text-center">
                  {channel.fullName}
                </h3>
                <p className="text-sm text-gray-500 text-center">
                  @{channel.username}
                </p>
              </Link>

              <button
                disabled={actionLoading === channel._id}
                onClick={() => handleUnsubscribe(channel._id)}
                className={`mt-4 w-full flex items-center justify-center
                gap-2 py-2 rounded-full transition-all duration-200
                active:scale-[0.98] ${
                  actionLoading === channel._id
                    ? "bg-gray-300 text-gray-600"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                <Bell size={16} />
                Subscribed
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubscriptionsPage;
