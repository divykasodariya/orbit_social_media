import React, { useState } from 'react';
import { createThread } from '../../api/thread.api';
import { useAuth } from '../../context/AuthContext';
import { Send, Loader2, PenLine } from 'lucide-react';

const CreateThreadBox = ({ communityId, onThreadCreated }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setError(null);

        try {
            setIsSubmitting(true);
            // backend expects `body`, not `content`
            const res = await createThread(communityId, { title, body });
            setTitle('');
            setBody('');
            if (onThreadCreated && res.data?.data) {
                onThreadCreated({
                    type: 'THREAD',
                    contentId: res.data.data._id,
                    raw: { ...res.data.data, authorId: user },
                    reason: 'Just posted'
                });
            }
        } catch (err) {
            console.error("Failed to create thread", err);
            setError(err.response?.data?.message || 'Failed to post. Try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white border rounded-xl shadow-sm mb-4">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b">
                <img
                    src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.fullName || 'U'}&background=3b82f6&color=fff`}
                    alt="avatar"
                    className="w-9 h-9 rounded-full border object-cover shrink-0"
                />
                <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                    <PenLine size={15} className="text-blue-500" />
                    Create a post
                </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
                {error && (
                    <div className="p-2 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">{error}</div>
                )}
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title *"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
                />
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Text (optional)"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-colors resize-none h-28"
                />
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={!title.trim() || isSubmitting}
                        className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Post
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateThreadBox;
