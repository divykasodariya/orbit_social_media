import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { getVideoById, getAllVideos, getVideoRecommendations } from "../api/video.api";
import {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment,
} from "../api/comment.api";
import {
  toggleVideoLike,
  toggleCommentLike,
} from "../api/like.api";
import { toggleSubscription } from "../api/subscription.api";
import {
  getUserPlaylists,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
} from "../api/playlist.api";

import CommentItem from "../components/comment/CommentItem";
import VideoCard from "../components/video/VideoCard";

import { ThumbsUp, Bell, Bookmark, X } from "lucide-react";
import { formatViews, formatDate } from "../utils/helpers";

const WatchPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [newComment, setNewComment] = useState("");

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const [showFullDesc, setShowFullDesc] = useState(false);

  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [playlistVideoMap, setPlaylistVideoMap] = useState({});

  /* ================= LOAD VIDEO ================= */
  useEffect(() => {
    const loadData = async () => {
      try {
        const videoRes = await getVideoById(videoId);
        const v = videoRes?.data?.data;
        if (!v) return;

        setVideo(v);
        setIsLiked(Boolean(v.isLiked));
        setLikesCount(v.likesCount || 0);
        setIsSubscribed(Boolean(v.owner?.isSubscribed));

        const commentsRes = await getVideoComments(videoId);
        setComments(commentsRes?.data?.data?.docs || []);

        // --- Recommendation Sidebar ---
        // Try the NLP + Graph hybrid engine first; fall back to popularity sort
        try {
          const recRes = await getVideoRecommendations(videoId, 10);
          const recs = recRes?.data?.data;
          if (Array.isArray(recs) && recs.length > 0) {
            setRelatedVideos(recs);
          } else {
            throw new Error("Empty recommendations");
          }
        } catch {
          // Fallback: pull all videos and exclude current
          const allVideosRes = await getAllVideos();
          const docs = allVideosRes?.data?.data?.docs || [];
          setRelatedVideos(docs.filter((x) => x._id !== videoId).slice(0, 10));
        }
      } catch (err) {
        console.error("WatchPage load failed", err);
      }
    };

    loadData();
  }, [videoId]);

  /* ================= COMMENT LIKE ================= */
  const handleCommentLike = async (commentId) => {
    if (!isAuthenticated) return navigate("/login");

    const res = await toggleCommentLike(commentId);
    const { isLiked, likesCount } = res.data.data;

    setComments((prev) =>
      prev.map((c) =>
        c._id === commentId
          ? { ...c, isLiked, likesCount }
          : c
      )
    );
  };

  /* ================= VIDEO LIKE ================= */
  const handleLike = async () => {
    if (!isAuthenticated) return navigate("/login");

    const res = await toggleVideoLike(video._id);
    setIsLiked(Boolean(res.data.data.isLiked));
    setLikesCount(res.data.data.likesCount);
  };

  /* ================= SUBSCRIBE ================= */
  // const handleSubscribe = async () => {
  //   if (!isAuthenticated) return navigate("/login");

  //   const res = await toggleSubscription(video.owner._id);
  //   setIsSubscribed(Boolean(res.data.data.isSubscribed));
  // };

const handleSubscribe = async () => {
  if (!isAuthenticated) return navigate("/login");

  const res = await toggleSubscription(video.owner._id);

  const isSubscribed = res.data.data.isSubscribed;

  // ✅ SINGLE SOURCE OF TRUTH
  setIsSubscribed(isSubscribed);

  setVideo((prev) => ({
    ...prev,
    owner: {
      ...prev.owner,
      isSubscribed,
    },
  }));
};


  /* ================= PLAYLIST ================= */
  const loadPlaylists = async () => {
    if (!user?._id) return;

    const res = await getUserPlaylists(user._id);
    const list = res.data.data || [];

    const map = {};
    list.forEach((pl) => {
      map[pl._id] = pl.videos?.includes(videoId);
    });

    setPlaylists(list);
    setPlaylistVideoMap(map);
  };

  const handlePlaylistToggle = async (playlistId) => {
    const alreadyAdded = playlistVideoMap[playlistId];

    if (alreadyAdded) {
      await removeVideoFromPlaylist(videoId, playlistId);
    } else {
      await addVideoToPlaylist(videoId, playlistId);
    }

    setPlaylistVideoMap((prev) => ({
      ...prev,
      [playlistId]: !alreadyAdded,
    }));
  };

  /* ================= COMMENTS ================= */
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    await addComment(videoId, { content: newComment });
    setNewComment("");

    const res = await getVideoComments(videoId);
    setComments(res?.data?.data?.docs || []);
  };

  const handleUpdateComment = async (commentId, content) => {
    await updateComment(commentId, { updateContent: content });

    setComments((prev) =>
      prev.map((c) =>
        c._id === commentId ? { ...c, content } : c
      )
    );
  };

  const handleDeleteComment = async (commentId) => {
    await deleteComment(commentId);
    setComments((prev) =>
      prev.filter((c) => c._id !== commentId)
    );
  };

  if (!video) {
    return (
      <div className="p-6 text-gray-600 animate-[fadeIn_0.3s_ease-out]">
        Loading...
      </div>
    );
  }

  if (!video || !video.owner) {
  return <div className="p-6">Loading...</div>;
}

  const channel = video.owner;
  const isOwnVideo = user?._id === channel._id;

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 animate-[fadeIn_0.35s_ease-out]">
        {/* LEFT */}
        <div className="flex-1">
          <div
            className="bg-black aspect-video rounded-xl mb-4
            overflow-hidden animate-[cardIn_0.4s_ease-out]"
          >
            <video
              src={video.videoFile}
              controls
              autoPlay
              className="w-full h-full"
            />
          </div>

          <h1 className="text-xl font-bold mb-1">
            {video.title}
          </h1>

          <Link
            to={`/channel/${channel.username}`}
            className="text-sm text-gray-600 hover:text-gray-900 transition"
          >
            {channel.fullName}
          </Link>

          <p className="text-sm text-gray-600 mb-4">
            {formatViews(video.views)} views •{" "}
            {formatDate(video.createdAt)}
          </p>

          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <Link to={`/channel/${channel.username}`}>
              <img
                src={channel.avatar}
                alt={channel.fullName}
                className="w-10 h-10 rounded-full
                transition-transform hover:scale-105"
              />
            </Link>

            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-full
              transition-all active:scale-[0.97] ${
                isLiked
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <ThumbsUp size={18} />
              {likesCount}
            </button>

            {isAuthenticated && (
              <button
                onClick={() => {
                  setShowPlaylistModal(true);
                  loadPlaylists();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-full
                bg-gray-100 transition hover:bg-gray-200"
              >
                <Bookmark size={18} />
                Save
              </button>
            )}

            <button
              disabled={isOwnVideo}
              onClick={!isOwnVideo ? handleSubscribe : undefined}
              className={`flex items-center gap-2 px-4 py-2 rounded-full
              transition-all active:scale-[0.97] ${
                isOwnVideo
                  ? "bg-gray-100 text-gray-400"
                  : isSubscribed
                  ? "bg-gray-200"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <Bell size={16} />
              {isOwnVideo
                ? "Your channel"
                : isSubscribed
                ? "Subscribed"
                : "Subscribe"}
            </button>
          </div>

          <div
            className="bg-gray-100 p-4 rounded-xl mb-6
            animate-[cardIn_0.35s_ease-out]"
          >
            <p className={!showFullDesc ? "line-clamp-3" : ""}>
              {video.description}
            </p>

            {video.description.length > 150 && (
              <button
                onClick={() => setShowFullDesc((p) => !p)}
                className="mt-2 text-sm text-blue-600"
              >
                {showFullDesc ? "Show less" : "Show more"}
              </button>
            )}
          </div>

          <h2 className="font-semibold mb-4">
            {comments.length} Comments
          </h2>

          {isAuthenticated && (
            <div className="mb-4 flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 border rounded px-3 py-2"
                placeholder="Add a comment..."
              />
              <button
                onClick={handleAddComment}
                className="px-4 py-2 bg-blue-600 text-white
                rounded transition hover:bg-blue-700"
              >
                Comment
              </button>
            </div>
          )}

          <div className="space-y-4">
            {comments.map((comment, i) => (
              <div
                key={comment._id}
                style={{ animationDelay: `${i * 0.03}s` }}
                className="animate-[cardIn_0.3s_ease-out]"
              >
                <CommentItem
                  comment={comment}
                  canModify={
                    user?._id === comment.commentor._id
                  }
                  onUpdate={handleUpdateComment}
                  onDelete={handleDeleteComment}
                  onLike={() =>
                    handleCommentLike(comment._id)
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="block lg:hidden border-t my-6" />

        <div className="lg:w-96 space-y-4">
          {relatedVideos.length === 0 ? (
            // Skeleton placeholders while loading
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-40 h-24 bg-gray-200 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : (
            relatedVideos.map((v, i) => (
              <div
                key={v._id}
                style={{ animationDelay: `${i * 0.04}s` }}
                className="animate-[cardIn_0.35s_ease-out]"
              >
                {v._recommendationReason && (
                  <p className="text-xs text-blue-500 font-medium mb-1 pl-1">
                    ✦ {v._recommendationReason}
                  </p>
                )}
                <VideoCard video={v} layout="list" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* PLAYLIST MODAL */}
      {showPlaylistModal && (
        <div className="fixed inset-0 bg-black/50 z-50
          flex items-center justify-center
          animate-[fadeIn_0.2s_ease-out]">
          <div
            className="bg-white w-full max-w-md rounded-xl p-6 relative
            animate-[cardIn_0.3s_ease-out]"
          >
            <button
              onClick={() => setShowPlaylistModal(false)}
              className="absolute top-4 right-4
              text-gray-500 hover:text-gray-800 transition"
            >
              <X />
            </button>

            <h2 className="text-lg font-semibold mb-4">
              Save to playlist
            </h2>

            {playlists.length === 0 ? (
              <p className="text-gray-500">
                No playlists found
              </p>
            ) : (
              <div className="space-y-2">
                {playlists.map((pl) => (
                  <button
                    key={pl._id}
                    onClick={() =>
                      handlePlaylistToggle(pl._id)
                    }
                    className="w-full flex justify-between
                    items-center px-4 py-2 border rounded
                    transition hover:bg-gray-50"
                  >
                    <span>{pl.name}</span>
                    {playlistVideoMap[pl._id] && (
                      <span className="text-blue-600 text-sm">
                        Added
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default WatchPage;
