import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getUnifiedFeed } from '../api/feed.api';
import VideoFeedCard from '../components/feed/VideoFeedCard';
import SocialPostCard from '../components/feed/SocialPostCard';
import ThreadFeedCard from '../components/feed/ThreadFeedCard';
import CreatePostBox from '../components/feed/CreatePostBox';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';

const HomePage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [feedItems, setFeedItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    
    const [cursor, setCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    const observer = useRef();

    const fetchFeed = async (currentCursor = "") => {
        try {
            if (!currentCursor) setLoading(true);
            else setLoadingMore(true);

            const res = await getUnifiedFeed(currentCursor, 15);
            const { items, nextCursor } = res.data.data;

            if (currentCursor) {
                setFeedItems(prev => [...prev, ...items]);
            } else {
                setFeedItems(items);
            }

            setCursor(nextCursor);
            if (!nextCursor) setHasMore(false);

        } catch (err) {
            console.error("Feed error:", err);
            setError("Failed to load your personalized feed.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchFeed();
        }
    }, [isAuthenticated]);

    const lastElementRef = useCallback(node => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                fetchFeed(cursor);
            }
        });
        
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore, cursor]);

    // Handle newly created posts instantly appearing at top
    const handlePostCreated = (newPost) => {
        setFeedItems(prev => [newPost, ...prev]);
    };

    // Renders the appropriate card based on normalized feed type
    const renderFeedItem = (item) => {
        switch (item.type) {
            case 'VIDEO':
                return <VideoFeedCard item={item} />;
            case 'POST':
                return <SocialPostCard item={item} />;
            case 'THREAD':
                return <ThreadFeedCard item={item} />;
            default:
                return null;
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-[fadeIn_0.3s_ease-out]">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                    <Lock size={32} />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Orbit</h1>
                <p className="text-gray-600 mb-8 max-w-md text-center">
                    Sign in to access your personalized feed combining videos, community threads, and updates from your friends.
                </p>
                <button 
                    onClick={() => navigate('/login')}
                    className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition transform hover:scale-105 active:scale-95"
                >
                    Sign In
                </button>
                
                {/* Visual sneak peek gradient */}
                <div className="mt-12 w-full max-w-4xl h-64 bg-gradient-to-t from-transparent to-gray-50 rounded-t-3xl border-t border-x border-gray-200 overflow-hidden relative">
                     <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 text-red-600 bg-red-50 rounded-xl">
                {error}
                <br/>
                <button onClick={() => fetchFeed()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-6 px-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Unified Feed</h1>
            
            <CreatePostBox onPostCreated={handlePostCreated} />

            {feedItems.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Your feed is empty</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                        Follow creators, join communities, and add friends to see content here.
                    </p>
                    <div className="flex gap-4 justify-center mt-6">
                        <button onClick={() => navigate('/videos')} className="text-blue-600 font-medium hover:underline">Browse Videos</button>
                        <button onClick={() => navigate('/communities')} className="text-indigo-600 font-medium hover:underline">Find Communities</button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {feedItems.map((item, index) => {
                        const isLastElement = index === feedItems.length - 1;
                        return (
                            <div 
                                key={`${item.type}-${item.contentId}`}
                                ref={isLastElement ? lastElementRef : null}
                            >
                                {renderFeedItem(item)}
                            </div>
                        );
                    })}
                </div>
            )}

            {loadingMore && (
                <div className="flex justify-center py-6">
                    <Loader2 className="animate-spin text-gray-400" size={30} />
                </div>
            )}
            
            {!hasMore && feedItems.length > 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                    You've reached the end of your feed.
                </div>
            )}
        </div>
    );
};

export default HomePage;
