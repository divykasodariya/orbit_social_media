import { useEffect, useState, useRef, useCallback } from "react";
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
import CoWatchPanel from "../components/cowatch/CoWatchPanel";
import { useCoWatch } from "../hooks/useCoWatch";

import { ThumbsUp, Bell, Bookmark, X, Subtitles } from "lucide-react";
import { formatViews, formatDate } from "../utils/helpers";
import ContentAdvisoryBanner from "../components/video/ContentAdvisoryBanner";
import AiVideoHub from "../components/video/AiVideoHub";

const WatchPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Ref to the <video> element so useCoWatch can sync play/pause/seek
  const playerRef = useRef(null);

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

  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [subtitleBlobUrl, setSubtitleBlobUrl] = useState(null);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);

  // Generate WebVTT blob url for subtitles when caption_vtt is available
  useEffect(() => {
    if (video?.caption_vtt) {
      const blob = new Blob([video.caption_vtt], { type: "text/vtt" });
      const url = URL.createObjectURL(blob);
      setSubtitleBlobUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setSubtitleBlobUrl(null);
    }
  }, [video?.caption_vtt]);

  // Direct video seek handler for Chapters, Transcript & Copilot citations
  const handleSeek = (timestamp) => {
    if (playerRef.current) {
      playerRef.current.currentTime = timestamp;
      playerRef.current.play().catch(() => {});
    }
  };

  // Global Co-Watch context
  const coWatch = useCoWatch();

  // Flag to suppress sendSync when the context itself is driving playback
  // (prevents an echo loop: context.play → onPlay → sendSync → sync → play → ...)
  const suppressSyncRef = useRef(false);

  // Callback ref — registers the player the instant the <video> element mounts
  const setPlayerRef = useCallback((el) => {
    playerRef.current = el;
    if (el) coWatch.registerPlayer(el, suppressSyncRef);
    else coWatch.unregisterPlayer();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When host switches/loads video, broadcast to all room members
  useEffect(() => {
    if (video?._id && coWatch.isHost && coWatch.roomCode) {
      if (coWatch.currentVideoId !== video._id) {
        coWatch.changeVideo(video._id, video.title);
      }
    }
  }, [video?._id, video?.title, coWatch.isHost, coWatch.roomCode, coWatch.currentVideoId, coWatch.changeVideo]);

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
      <div className="max-w-[1720px] mx-auto w-full animate-[fadeIn_0.35s_ease-out]">
        <div className="flex flex-col lg:flex-row gap-5 xl:gap-6 items-stretch">
          {/* ── LEFT: MAIN VIDEO & CONTENT COLUMN ── */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            {/* Video Player Container */}
            <div className="bg-black aspect-video rounded-2xl overflow-hidden shadow-sm w-full relative group animate-[cardIn_0.4s_ease-out]">
              <video
                ref={setPlayerRef}
                src={video.videoFile}
                controls
                autoPlay
                className="w-full h-full object-contain"
                onTimeUpdate={(e) => setCurrentPlaybackTime(e.target.currentTime)}
                onPlay={(e) => {
                  if (suppressSyncRef.current) return;
                  coWatch.sendSync('play', e.target.currentTime);
                }}
                onPause={(e) => {
                  if (suppressSyncRef.current) return;
                  coWatch.sendSync('pause', e.target.currentTime);
                }}
                onSeeked={(e) => {
                  if (suppressSyncRef.current) return;
                  coWatch.sendSync('seek', e.target.currentTime);
                }}
              >
                {subtitleBlobUrl && captionsEnabled && (
                  <track
                    kind="subtitles"
                    label="English (Auto-generated)"
                    src={subtitleBlobUrl}
                    srcLang="en"
                    default
                  />
                )}
              </video>
            </div>

            {/* AI Content Advisory Notice (if flagged) */}
            <ContentAdvisoryBanner advisory={video.aiAdvisory} />

            {/* Video Title */}
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight leading-snug">
              {video.title}
            </h1>

            {/* Channel Info & Video Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-3 border-b border-gray-200/80">
              {/* Left: Channel Avatar, Name, and Subscribe Button */}
              <div className="flex items-center gap-3">
                <Link to={`/channel/${channel.username}`} className="flex-shrink-0">
                  <img
                    src={channel.avatar}
                    alt={channel.fullName}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-gray-100 hover:ring-blue-400 transition-all duration-200"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/44?text=?";
                    }}
                  />
                </Link>

                <div className="min-w-0">
                  <Link
                    to={`/channel/${channel.username}`}
                    className="font-bold text-sm sm:text-base text-gray-900 hover:text-blue-600 transition block truncate leading-tight"
                  >
                    {channel.fullName}
                  </Link>
                  <span className="text-xs text-gray-500 block truncate">
                    @{channel.username}
                  </span>
                </div>

                <button
                  disabled={isOwnVideo}
                  onClick={!isOwnVideo ? handleSubscribe : undefined}
                  className={`ml-2 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
                    isOwnVideo
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : isSubscribed
                      ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                  }`}
                >
                  <Bell size={16} />
                  <span>{isOwnVideo ? "Your channel" : isSubscribed ? "Subscribed" : "Subscribe"}</span>
                </button>
              </div>

              {/* Right: Actions (Like, Save to playlist, Captions) */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
                    isLiked
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  <ThumbsUp size={16} />
                  <span>{likesCount}</span>
                </button>

                {isAuthenticated && (
                  <button
                    onClick={() => {
                      setShowPlaylistModal(true);
                      loadPlaylists();
                    }}
                    className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-gray-100 text-gray-800 hover:bg-gray-200 transition-all active:scale-95"
                  >
                    <Bookmark size={16} />
                    <span>Save</span>
                  </button>
                )}

                {video.caption_vtt && (
                  <button
                    onClick={() => setCaptionsEnabled((p) => !p)}
                    title={captionsEnabled ? "Disable subtitles" : "Enable subtitles"}
                    className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                      captionsEnabled
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    <Subtitles size={16} />
                    <span>CC</span>
                  </button>
                )}
              </div>
            </div>

            {/* Video Description Card */}
            <div className="bg-gray-100/80 hover:bg-gray-100 p-4 rounded-2xl transition-colors animate-[cardIn_0.35s_ease-out]">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-1.5">
                <span>{formatViews(video.views)} views</span>
                <span>•</span>
                <span>{formatDate(video.createdAt)}</span>
              </div>

              <p className={`text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line ${!showFullDesc ? "line-clamp-3" : ""}`}>
                {video.description}
              </p>

              {video.description && video.description.length > 140 && (
                <button
                  onClick={() => setShowFullDesc((p) => !p)}
                  className="mt-2 text-xs sm:text-sm font-bold text-gray-900 hover:text-blue-600 transition"
                >
                  {showFullDesc ? "Show less" : "...more"}
                </button>
              )}
            </div>

            {/* AI Video Hub: TL;DR Summary, Key Points, Chapters, Interactive Transcript, & Copilot */}
            <AiVideoHub
              video={video}
              currentTime={currentPlaybackTime}
              onSeek={handleSeek}
              isOwner={isOwnVideo}
            />

            {/* Comments Section */}
            <div className="pt-2">
              <h2 className="font-bold text-base sm:text-lg text-gray-900 mb-4">
                {comments.length} Comments
              </h2>

              {isAuthenticated && (
                <div className="mb-6 flex gap-3 items-center">
                  <img
                    src={user?.avatar || "https://via.placeholder.com/40"}
                    alt="avatar"
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-1 ring-gray-200"
                  />
                  <div className="flex-1 flex gap-2">
                    <input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="Add a comment..."
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                      Comment
                    </button>
                  </div>
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
                      canModify={user?._id === comment.commentor?._id}
                      onUpdate={handleUpdateComment}
                      onDelete={handleDeleteComment}
                      onLike={() => handleCommentLike(comment._id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: STICKY RECOMMENDATIONS COLUMN ── */}
          <aside className="w-full lg:w-[340px] xl:w-[380px] 2xl:w-[420px] lg:flex-shrink-0 lg:self-stretch">
            <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto space-y-3.5 pr-1 custom-scrollbar">
              {/* Co-Watch Panel (visible in right sidebar ONLY when active in a room) */}
              {isAuthenticated && coWatch.status === "in-room" && (
                <CoWatchPanel coWatch={coWatch} videoTitle={video?.title} />
              )}

              {/* Sidebar Header */}
              <div className="flex items-center justify-between pb-1">
                <h2 className="font-bold text-sm sm:text-base text-gray-900">
                  Up Next
                </h2>
                <span className="text-xs text-gray-500 font-medium">
                  {relatedVideos.length} recommendations
                </span>
              </div>

              {relatedVideos.length === 0 ? (
                // Skeleton placeholders while loading
                [...Array(6)].map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-36 sm:w-40 xl:w-44 aspect-video bg-gray-200 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3.5 bg-gray-200 rounded w-full" />
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
                      <p className="text-[11px] text-blue-600 font-semibold mb-1 pl-1 flex items-center gap-1">
                        <span>✦</span>
                        <span className="truncate">{v._recommendationReason}</span>
                      </p>
                    )}
                    <VideoCard video={v} layout="list" />
                  </div>
                ))
              )}
            </div>
          </aside>
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
