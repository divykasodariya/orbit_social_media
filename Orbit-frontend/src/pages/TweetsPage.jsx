import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getAllTweets,
  createTweet,
  deleteTweet,
  updateTweet,
} from "../api/tweet.api";
import TweetCard from "../components/tweet/TweetCard";
import { toggleTweetLike } from "../api/like.api";

const TweetsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [tweets, setTweets] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  /* ================= LOAD TWEETS (AUTH GUARDED) ================= */
  const loadTweets = async () => {
    try {
      const res = await getAllTweets();
      setTweets(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error("Failed to load tweets", err);
      setTweets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 🔒 HARD GUARD
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    loadTweets();
  }, [isAuthenticated]);

  /* ================= LIKE ================= */
  const handleTweetLike = async (tweetId) => {
    const res = await toggleTweetLike(tweetId);
    const { isLiked, likesCount } = res.data.data;

    setTweets((prev) =>
      prev.map((t) =>
        t._id === tweetId ? { ...t, isLiked, likesCount } : t
      )
    );
  };

  /* ================= CREATE ================= */
  const handlePost = async () => {
    if (!content.trim()) return;

    try {
      await createTweet({ content });
      setContent("");
      await loadTweets();
    } catch (err) {
      console.error("Tweet creation failed", err);
    }
  };

  /* ================= UPDATE ================= */
  const handleUpdateTweet = async (tweetId, content) => {
    await updateTweet(tweetId, { content });

    setTweets((prev) =>
      prev.map((t) =>
        t._id === tweetId ? { ...t, content } : t
      )
    );
  };

  /* ================= DELETE ================= */
  const handleDeleteTweet = async (tweetId) => {
    try {
      await deleteTweet(tweetId);
      setTweets((prev) => prev.filter((t) => t._id !== tweetId));
    } catch (err) {
      console.error("Tweet deletion failed", err);
    }
  };

  /* ================= NOT AUTHENTICATED ================= */
  if (!isAuthenticated) {
    return (
      <div className="text-center mt-16 text-gray-600 animate-[fadeIn_0.3s_ease-out]">
        Login to view tweets
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className="max-w-2xl mx-auto animate-[fadeIn_0.35s_ease-out]">
      <h1
        className="text-2xl font-bold mb-4
        animate-[slideUp_0.35s_ease-out]"
      >
        Tweets
      </h1>

      {/* POST BOX */}
      <div
        className="mb-6 bg-white border rounded-xl p-4
        animate-[cardIn_0.35s_ease-out]"
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full border rounded p-3 resize-none"
          placeholder="What's happening?"
        />
        <button
          onClick={handlePost}
          className="mt-2 px-4 py-2 bg-blue-600 text-white
          rounded transition hover:bg-blue-700 active:scale-[0.98]"
        >
          Post
        </button>
      </div>

      {/* FEED */}
      {loading ? (
        <p className="text-gray-500 animate-[fadeIn_0.3s_ease-out]">
          Loading tweets...
        </p>
      ) : tweets.length === 0 ? (
        <p className="text-gray-500 animate-[fadeIn_0.3s_ease-out]">
          No tweets yet
        </p>
      ) : (
        <div className="space-y-4">
          {tweets.map((tweet, i) => (
            <div
              key={tweet._id}
              style={{ animationDelay: `${i * 0.04}s` }}
              className="animate-[cardIn_0.4s_ease-out]"
            >
              <TweetCard
                tweet={tweet}
                canModify={user?._id === tweet.owner._id}
                onLike={() => handleTweetLike(tweet._id)}
                onUpdate={handleUpdateTweet}
                onDelete={handleDeleteTweet}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TweetsPage;
