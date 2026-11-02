import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUserTweets, updateTweet, deleteTweet } from "../../api/tweet.api";
import { getUserThreads } from "../../api/thread.api";
import { toggleTweetLike } from "../../api/like.api";
import TweetCard from "../tweet/TweetCard";
import Loader from "../common/Loader";
import EmptyState from "../common/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { MessageSquare, ArrowBigUp, Users } from "lucide-react";
import { timeAgo, getInitials } from "../../utils/helpers";

const ProfilePostsTab = ({ userId, isOwnProfile = false }) => {
  const { user } = useAuth();

  const [subFilter, setSubFilter] = useState("all"); // "all" | "tweets" | "community"
  const [tweets, setTweets] = useState([]);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    Promise.allSettled([
      getUserTweets(userId),
      getUserThreads(userId),
    ])
      .then(([tweetsResult, threadsResult]) => {
        if (tweetsResult.status === "fulfilled") {
          const tData = tweetsResult.value.data?.data;
          setTweets(Array.isArray(tData) ? tData : tData?.docs || []);
        } else {
          setTweets([]);
        }

        if (threadsResult.status === "fulfilled") {
          const thData = threadsResult.value.data?.data;
          setThreads(Array.isArray(thData) ? thData : thData?.docs || []);
        } else {
          setThreads([]);
        }
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleLikeTweet = async (tweet) => {
    try {
      await toggleTweetLike(tweet._id);
      setTweets((prev) =>
        prev.map((t) =>
          t._id === tweet._id
            ? {
                ...t,
                isLiked: !t.isLiked,
                likesCount: t.isLiked
                  ? (t.likesCount ?? 1) - 1
                  : (t.likesCount ?? 0) + 1,
              }
            : t
        )
      );
    } catch (err) {
      console.error("Like failed", err);
    }
  };

  const handleUpdateTweet = async (tweetId, content) => {
    try {
      await updateTweet(tweetId, { content });
      setTweets((prev) =>
        prev.map((t) => (t._id === tweetId ? { ...t, content } : t))
      );
    } catch (err) {
      console.error("Update tweet failed", err);
    }
  };

  const handleDeleteTweet = async (tweetId) => {
    try {
      await deleteTweet(tweetId);
      setTweets((prev) => prev.filter((t) => t._id !== tweetId));
    } catch (err) {
      console.error("Delete tweet failed", err);
    }
  };

  if (loading) return <Loader />;

  // Normalize items for "all" feed
  const normalizedTweets = tweets.map((t) => ({
    type: "tweet",
    id: t._id,
    createdAt: new Date(t.createdAt).getTime(),
    raw: t,
  }));

  const normalizedThreads = threads.map((th) => ({
    type: "thread",
    id: th._id,
    createdAt: new Date(th.createdAt).getTime(),
    raw: th,
  }));

  const combinedPosts = [...normalizedTweets, ...normalizedThreads].sort(
    (a, b) => b.createdAt - a.createdAt
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-[fadeIn_0.35s_ease-out]">
      {/* Sub-filter tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setSubFilter("all")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            subFilter === "all"
              ? "bg-white text-gray-900 shadow-2xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          All Posts ({combinedPosts.length})
        </button>

        <button
          onClick={() => setSubFilter("tweets")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            subFilter === "tweets"
              ? "bg-white text-gray-900 shadow-2xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Tweets ({tweets.length})
        </button>

        <button
          onClick={() => setSubFilter("community")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            subFilter === "community"
              ? "bg-white text-gray-900 shadow-2xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Community Posts ({threads.length})
        </button>
      </div>

      {/* RENDER LIST */}
      {subFilter === "all" && combinedPosts.length === 0 && (
        <EmptyState
          title="No posts yet"
          description={
            isOwnProfile
              ? "You haven't shared any tweets or community posts yet."
              : "This user hasn't shared any posts yet."
          }
        />
      )}

      {subFilter === "tweets" && tweets.length === 0 && (
        <EmptyState
          title="No tweets yet"
          description={
            isOwnProfile
              ? "You haven't posted any tweets outside of communities yet."
              : "This user hasn't posted any tweets yet."
          }
        />
      )}

      {subFilter === "community" && threads.length === 0 && (
        <EmptyState
          title="No community posts"
          description={
            isOwnProfile
              ? "You haven't published any posts inside communities yet."
              : "This user hasn't posted in any communities yet."
          }
        />
      )}

      {/* ALL POSTS VIEW */}
      {subFilter === "all" &&
        combinedPosts.map((item) =>
          item.type === "tweet" ? (
            <div key={item.id} className="relative">
              <div className="mb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Tweet
              </div>
              <TweetCard
                tweet={item.raw}
                onLike={() => handleLikeTweet(item.raw)}
                canModify={isOwnProfile || user?._id === item.raw.owner?._id}
                onUpdate={handleUpdateTweet}
                onDelete={handleDeleteTweet}
              />
            </div>
          ) : (
            <CommunityThreadItem key={item.id} thread={item.raw} />
          )
        )}

      {/* TWEETS ONLY VIEW */}
      {subFilter === "tweets" &&
        tweets.map((tweet) => (
          <TweetCard
            key={tweet._id}
            tweet={tweet}
            onLike={() => handleLikeTweet(tweet)}
            canModify={isOwnProfile || user?._id === tweet.owner?._id}
            onUpdate={handleUpdateTweet}
            onDelete={handleDeleteTweet}
          />
        ))}

      {/* COMMUNITY POSTS ONLY VIEW */}
      {subFilter === "community" &&
        threads.map((thread) => (
          <CommunityThreadItem key={thread._id} thread={thread} />
        ))}
    </div>
  );
};

/* ── Community Thread Item Card ── */
const CommunityThreadItem = ({ thread }) => {
  const community = thread.communityId || {};
  const author = thread.authorId || {};

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200/80 transition-all duration-200 hover:shadow-sm animate-[cardIn_0.35s_ease-out]">
      {/* Community attribution header */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
        <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 uppercase">
          {getInitials(community.name || "C")}
        </div>
        <Link
          to="/communities"
          className="text-xs font-semibold text-gray-700 hover:text-blue-600 transition truncate"
        >
          c/{community.name || "community"}
        </Link>
        <span className="text-gray-300">•</span>
        <span className="text-xs text-gray-400">{timeAgo(thread.createdAt)}</span>
      </div>

      {/* Thread Content */}
      <h3 className="font-semibold text-base text-gray-900 leading-snug">
        {thread.title}
      </h3>

      {thread.body && (
        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap leading-relaxed line-clamp-4">
          {thread.body}
        </p>
      )}

      {thread.media && (
        <div className="mt-3 rounded-lg overflow-hidden border border-gray-100 max-h-80 bg-gray-50">
          <img
            src={thread.media}
            alt={thread.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Thread Footer (Score & Comments) */}
      <div className="flex items-center gap-4 mt-3 pt-2 text-xs text-gray-500 font-medium">
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1">
          <ArrowBigUp size={16} className="text-gray-500" />
          <span>{thread.score ?? 0}</span>
        </div>

        <div className="flex items-center gap-1.5 text-gray-500">
          <MessageSquare size={14} />
          <span>{thread.commentCount ?? 0} comments</span>
        </div>
      </div>
    </div>
  );
};

export default ProfilePostsTab;
