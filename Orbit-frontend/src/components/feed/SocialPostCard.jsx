import React, { useState } from 'react';
import { timeAgo } from '../../utils/helpers';
import { MessageSquare, Heart, Share2, Send, Loader2 } from 'lucide-react';
import { toggleTweetLike } from '../../api/like.api';
import { getTweetComments, addTweetComment } from '../../api/tweet.api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SocialPostCard = ({ item }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { raw: post, reason } = item;
    
    // Add local state for instantaneous feedback
    const [isLiked, setIsLiked] = useState(post?.isLiked || false);
    const [likesCount, setLikesCount] = useState(post?.likesCount || 0);

    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    const handleLike = async () => {
        try {
            setIsLiked(!isLiked);
            setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
            await toggleTweetLike(post._id);
        } catch (error) {
            console.error("Failed to toggle like", error);
            // Revert state on failure
            setIsLiked(!isLiked);
            setLikesCount(prev => isLiked ? prev + 1 : prev - 1);
        }
    };

    const handleToggleComments = async () => {
        const willShow = !showComments;
        setShowComments(willShow);

        if (willShow && comments.length === 0) {
            try {
                setCommentsLoading(true);
                const res = await getTweetComments(post._id);
                setComments(res.data?.data?.docs || []);
            } catch (err) {
                console.error("Failed to load comments", err);
            } finally {
                setCommentsLoading(false);
            }
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        try {
            setIsReplying(true);
            const res = await addTweetComment(post._id, replyContent);
            setComments(prev => [res.data.data, ...prev]);
            setReplyContent('');
        } catch (err) {
            console.error("Failed to add comment", err);
        } finally {
            setIsReplying(false);
        }
    };

    if (!post) return null;

    return (
        <div className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow animate-[fadeIn_0.3s_ease-out]">
            {reason && (
                <div className="text-[11px] text-pink-600 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Heart size={12} /> {reason}
                </div>
            )}
            
            <div className="flex gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border">
                    <img 
                        src={post.ownerDetails?.avatar || post.owner?.avatar || `https://ui-avatars.com/api/?name=User`} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                    />
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); navigate(`/friends?q=${post.ownerDetails?.username || post.owner?.username || 'user'}`); }}
                    className="text-left"
                >
                    <h4 className="font-semibold text-gray-900 leading-tight hover:text-blue-600 hover:underline">
                        {post.ownerDetails?.fullName || post.owner?.fullName || "User"}
                    </h4>
                    <p className="text-xs text-gray-500">
                        @{post.ownerDetails?.username || post.owner?.username || "user"} • {timeAgo(post.createdAt)}
                    </p>
                </button>
            </div>

            <div className="text-gray-800 text-sm mb-4 whitespace-pre-wrap">
                {post.content}
            </div>

            {post.image && (
                <div className="mb-4 rounded-xl overflow-hidden border">
                    <img src={post.image} alt="Post attachment" className="w-full max-h-96 object-cover" />
                </div>
            )}

            <div className="flex items-center gap-6 text-gray-500 border-t pt-3">
                <button 
                    onClick={handleLike}
                    className={`flex items-center gap-2 transition ${isLiked ? 'text-pink-600' : 'hover:text-pink-600'}`}
                >
                    <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                    <span className="text-xs">{likesCount > 0 ? likesCount : 'Like'}</span>
                </button>
                <button 
                    onClick={handleToggleComments} 
                    className={`flex items-center gap-2 transition ${showComments ? 'text-blue-600' : 'hover:text-blue-600'}`}
                >
                    <MessageSquare size={18} fill={showComments ? 'currentColor' : 'none'} />
                    <span className="text-xs">Reply</span>
                </button>
                <button onClick={() => alert("Sharing is coming soon!")} className="flex items-center gap-2 hover:text-green-600 transition ml-auto">
                    <Share2 size={18} />
                </button>
            </div>

            {/* Inline Comments Section */}
            {showComments && (
                <div className="mt-4 pt-4 border-t border-gray-100 animate-[fadeIn_0.2s_ease-out]">
                    <form onSubmit={handleAddComment} className="flex gap-3 mb-4">
                        <img 
                            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.fullName || 'User'}`} 
                            alt="Avatar" 
                            className="w-8 h-8 rounded-full border object-cover shrink-0"
                        />
                        <div className="flex-1 relative">
                            <input 
                                type="text"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Write a reply..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-full px-4 py-2 pr-10 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
                            />
                            <button 
                                type="submit" 
                                disabled={!replyContent.trim() || isReplying}
                                className="absolute right-1 top-1 bottom-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition disabled:opacity-50 flex items-center justify-center"
                            >
                                {isReplying ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            </button>
                        </div>
                    </form>

                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                        {commentsLoading ? (
                            <div className="flex justify-center py-4">
                                <Loader2 size={20} className="animate-spin text-gray-400" />
                            </div>
                        ) : comments.length > 0 ? (
                            comments.map(c => (
                                <div key={c._id} className="flex gap-3">
                                    <img 
                                        src={c.owner?.avatar || c.commentor?.avatar || `https://ui-avatars.com/api/?name=User`} 
                                        alt="Avatar" 
                                        className="w-8 h-8 rounded-full border object-cover shrink-0"
                                    />
                                    <div className="flex-1 bg-gray-50 p-3 rounded-2xl rounded-tl-none">
                                        <div className="flex items-center gap-2 mb-1">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); navigate(`/friends?q=${c.owner?.username || c.commentor?.username || 'user'}`); }}
                                                className="font-semibold text-xs text-gray-900 hover:text-blue-600 hover:underline"
                                            >
                                                {c.owner?.fullName || c.commentor?.fullName || "User"}
                                            </button>
                                            <span className="text-[10px] text-gray-400">{timeAgo(c.createdAt)}</span>
                                        </div>
                                        <p className="text-sm text-gray-800">{c.content}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 text-xs text-gray-400">
                                No replies yet. Be the first!
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SocialPostCard;
