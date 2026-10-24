import React, { useState, useRef, useEffect } from 'react';
import { timeAgo } from '../../utils/helpers';
import { ArrowBigUp, ArrowBigDown, MessageCircle, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { voteThread, removeThreadVote, getThreadComments, addThreadComment } from '../../api/thread.api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/* ── Single comment row (recursive for nested replies later) ── */
const CommentRow = ({ comment }) => {
    const owner = comment.owner || {};
    const navigate = useNavigate();
    
    return (
        <div className="flex gap-3 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex flex-col items-center">
                <img
                    src={owner.avatar || `https://ui-avatars.com/api/?name=${owner.fullName || 'U'}&size=32&background=e5e7eb&color=374151`}
                    alt="avatar"
                    className="w-7 h-7 rounded-full border object-cover shrink-0"
                />
                {/* Thread line */}
                <div className="w-px flex-1 bg-gray-200 mt-1" />
            </div>
            <div className="flex-1 pb-4 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/friends?q=${owner.username}`); }}
                        className="text-xs font-bold text-gray-900 hover:text-blue-600 hover:underline"
                    >
                        u/{owner.username || 'user'}
                    </button>
                    <span className="text-[10px] text-gray-400">{timeAgo(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed break-words">{comment.content}</p>
            </div>
        </div>
    );
};

/* ── Main ThreadFeedCard ── */
const ThreadFeedCard = ({ item }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { raw: thread, reason } = item;

    const [score, setScore] = useState(thread?.score || 0);
    const [userVote, setUserVote] = useState(thread?.userVote || 0);
    const [commentCount, setCommentCount] = useState(thread?.commentCount || 0);

    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const inputRef = useRef(null);

    // Focus input when comments expand
    useEffect(() => {
        if (showComments && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [showComments]);

    const handleVote = async (e, value) => {
        e.stopPropagation();
        if (userVote === value) {
            setScore(prev => prev - value);
            setUserVote(0);
            try { await removeThreadVote(thread._id); } catch { /* optimistic */ }
            return;
        }
        const scoreDiff = userVote !== 0 ? value * 2 : value;
        setScore(prev => prev + scoreDiff);
        setUserVote(value);
        try { await voteThread(thread._id, value); } catch { /* optimistic */ }
    };

    const handleToggleComments = async (e) => {
        e.stopPropagation();
        const opening = !showComments;
        setShowComments(opening);

        if (opening && comments.length === 0) {
            setCommentsLoading(true);
            try {
                const res = await getThreadComments(thread._id);
                setComments(res.data?.data?.docs || res.data?.data || []);
            } catch (err) {
                console.error('Failed to load thread comments', err);
            } finally {
                setCommentsLoading(false);
            }
        }
    };

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        setIsPosting(true);
        try {
            const res = await addThreadComment(thread._id, replyText.trim());
            const newComment = res.data?.data;
            if (newComment) {
                // Optimistically inject current user if owner isn't populated yet
                if (!newComment.owner?.username) newComment.owner = user;
                setComments(prev => [...prev, newComment]);
                setCommentCount(prev => prev + 1);
            }
            setReplyText('');
        } catch (err) {
            console.error('Failed to post comment', err);
        } finally {
            setIsPosting(false);
        }
    };

    if (!thread) return null;

    const author = thread.authorId || {};

    return (
        <div className="bg-white border rounded-xl overflow-hidden hover:border-gray-300 transition-colors shadow-sm animate-[fadeIn_0.3s_ease-out]">
            <div className="flex">
                {/* ── Vote column ── */}
                <div className="w-12 bg-gray-50 flex flex-col items-center py-3 gap-1 border-r shrink-0">
                    <button
                        className={`p-1 rounded transition ${userVote === 1 ? 'text-orange-600 bg-orange-100' : 'hover:text-orange-600 hover:bg-gray-200 text-gray-400'}`}
                        onClick={(e) => handleVote(e, 1)}
                    >
                        <ArrowBigUp size={22} fill={userVote === 1 ? 'currentColor' : 'none'} />
                    </button>
                    <span className={`text-sm font-bold ${userVote === 1 ? 'text-orange-600' : userVote === -1 ? 'text-blue-600' : 'text-gray-700'}`}>
                        {score}
                    </span>
                    <button
                        className={`p-1 rounded transition ${userVote === -1 ? 'text-blue-600 bg-blue-100' : 'hover:text-blue-600 hover:bg-gray-200 text-gray-400'}`}
                        onClick={(e) => handleVote(e, -1)}
                    >
                        <ArrowBigDown size={22} fill={userVote === -1 ? 'currentColor' : 'none'} />
                    </button>
                </div>

                {/* ── Main content ── */}
                <div className="flex-1 min-w-0">
                    <div className="p-4">
                        {/* Meta */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 flex-wrap">
                            {thread.communityId && (
                                <>
                                    <span className="font-bold text-gray-900">
                                        t/{thread.communityId.slug}
                                    </span>
                                    <span>·</span>
                                </>
                            )}
                            <img
                                src={author.avatar || `https://ui-avatars.com/api/?name=${author.fullName || 'U'}&size=20&background=e5e7eb&color=374151`}
                                alt="avatar"
                                className="w-5 h-5 rounded-full border object-cover"
                            />
                            <button 
                                onClick={(e) => { e.stopPropagation(); navigate(`/friends?q=${author.username}`); }}
                                className="font-semibold text-gray-700 hover:text-blue-600 hover:underline"
                            >
                                u/{author.username || 'user'}
                            </button>
                            <span>·</span>
                            <span>{timeAgo(thread.createdAt)}</span>
                            {thread.flair && (
                                <>
                                    <span>·</span>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-full uppercase">
                                        {thread.flair}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-gray-900 leading-snug mb-1">
                            {thread.title}
                        </h3>

                        {/* Body preview */}
                        {thread.body && (
                            <p className={`text-sm text-gray-600 leading-relaxed ${showComments ? '' : 'line-clamp-3'}`}>
                                {thread.body}
                            </p>
                        )}
                    </div>

                    {/* ── Action bar ── */}
                    <div className="px-4 pb-3 flex items-center gap-1">
                        <button
                            onClick={handleToggleComments}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition
                                ${showComments
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                        >
                            <MessageCircle size={15} fill={showComments ? 'currentColor' : 'none'} />
                            {commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}
                            {showComments
                                ? <ChevronUp size={13} />
                                : <ChevronDown size={13} />}
                        </button>
                    </div>

                    {/* ── Inline comments (Reddit-style expansion) ── */}
                    {showComments && (
                        <div className="border-t bg-gray-50 animate-[fadeIn_0.2s_ease-out]">
                            {/* Reply input */}
                            {user && (
                                <form onSubmit={handlePostComment} className="flex gap-3 p-4 border-b bg-white">
                                    <img
                                        src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.fullName || 'U'}&size=32&background=3b82f6&color=fff`}
                                        alt="avatar"
                                        className="w-8 h-8 rounded-full border object-cover shrink-0 mt-0.5"
                                    />
                                    <div className="flex-1 relative">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            placeholder="What are your thoughts?"
                                            className="w-full border border-gray-200 rounded-full px-4 py-2 pr-11 text-sm bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!replyText.trim() || isPosting}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition disabled:opacity-40 flex items-center justify-center"
                                        >
                                            {isPosting
                                                ? <Loader2 size={13} className="animate-spin" />
                                                : <Send size={13} />}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Comment list */}
                            <div className="px-4 pt-4 pb-2 space-y-1">
                                {commentsLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 size={22} className="animate-spin text-gray-300" />
                                    </div>
                                ) : comments.length > 0 ? (
                                    comments.map(c => (
                                        <CommentRow key={c._id} comment={c} />
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        No comments yet. Start the conversation!
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ThreadFeedCard;
