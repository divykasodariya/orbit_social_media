import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getExploreFeed, getExploreHighlights } from '../api/explore.api';
import VideoFeedCard from '../components/feed/VideoFeedCard';
import SocialPostCard from '../components/feed/SocialPostCard';
import ThreadFeedCard from '../components/feed/ThreadFeedCard';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Users, Compass, Loader2 } from 'lucide-react';
import { sendFriendRequest } from '../api/friend.api';

const ExplorePage = () => {
    const navigate = useNavigate();

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Highlights
    const [communities, setCommunities] = useState([]);
    const [creators, setCreators] = useState([]);
    const [highlightsLoading, setHighlightsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    // Feed
    const [feedItems, setFeedItems] = useState([]);
    const [feedLoading, setFeedLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef();

    useEffect(() => {
        // Fetch Highlights
        getExploreHighlights()
            .then(res => {
                setCommunities(res.data?.data?.communities || []);
                setCreators(res.data?.data?.creators || []);
            })
            .catch(err => console.error("Failed to load highlights", err))
            .finally(() => setHighlightsLoading(false));
    }, []);

    const fetchFeed = async (currentPage) => {
        try {
            if (currentPage === 1) setFeedLoading(true);
            else setLoadingMore(true);

            const res = await getExploreFeed(currentPage, 15);
            const { items, nextCursor } = res.data.data;

            if (currentPage === 1) {
                setFeedItems(items);
            } else {
                setFeedItems(prev => [...prev, ...items]);
            }

            if (!nextCursor) setHasMore(false);

        } catch (err) {
            console.error("Explore feed error:", err);
        } finally {
            setFeedLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchFeed(page);
    }, [page]);

    const lastElementRef = useCallback(node => {
        if (feedLoading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        });
        
        if (node) observer.current.observe(node);
    }, [feedLoading, loadingMore, hasMore]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    };

    const handleAddFriend = async (userId) => {
        setActionLoading(userId);
        try {
            await sendFriendRequest(userId);
            // Optimistically remove or indicate sent
            setCreators(prev => prev.filter(c => c._id !== userId));
        } catch (err) {
            alert(err.response?.data?.message || "Failed to send request");
        } finally {
            setActionLoading(null);
        }
    };

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

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 animate-[fadeIn_0.3s_ease-out]">
            
            {/* 1. Global Search Hub */}
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-4 flex items-center justify-center gap-3">
                    <Compass className="text-slate-700" size={36} />
                    Explore Orbit
                </h1>
                <p className="text-gray-500 mb-6 font-medium max-w-lg mx-auto">
                    Search for anything or discover trending communities, rising creators, and viral content across the platform.
                </p>
                <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400 group-focus-within:text-slate-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users, communities, or videos..."
                        className="w-full pl-12 pr-6 py-4 bg-white border-2 border-transparent shadow-sm rounded-full text-base focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-500/10 transition-all hover:shadow-md"
                    />
                    <button 
                        type="submit"
                        className="absolute right-2 top-2 bottom-2 px-6 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-full transition-colors"
                    >
                        Search
                    </button>
                </form>
            </div>

            {/* 2. Highlights (Communities & Creators) */}
            {highlightsLoading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
            ) : (
                <div className="space-y-10 mb-10">
                    
                    {/* Trending Communities */}
                    {communities.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <TrendingUp className="text-slate-700" size={20} />
                                    Trending Communities
                                </h2>
                                <button onClick={() => navigate('/communities')} className="text-sm font-semibold text-slate-600 hover:underline">View All</button>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar">
                                {communities.map(community => (
                                    <div 
                                        key={community._id}
                                        onClick={() => navigate('/communities')}
                                        className="min-w-[240px] flex-1 bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition cursor-pointer snap-start"
                                    >
                                        <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl text-white font-bold flex items-center justify-center text-lg mb-3 shadow-sm">
                                            {community.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <h3 className="font-bold text-gray-900 line-clamp-1">{community.name}</h3>
                                        <p className="text-xs font-medium text-gray-500 mt-1">t/{community.slug}</p>
                                        <p className="text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                                            {community.description || "A trending community on Orbit."}
                                        </p>
                                        <p className="text-xs font-bold text-slate-600 mt-4 bg-slate-100 inline-block px-2 py-1 rounded-md">
                                            {community.memberCount || 0} Members
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Creators on the Rise */}
                    {creators.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Users className="text-slate-700" size={20} />
                                    Creators on the Rise
                                </h2>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar">
                                {creators.map(creator => (
                                    <div 
                                        key={creator._id}
                                        className="min-w-[200px] flex-1 bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition text-center snap-start"
                                    >
                                        <img 
                                            src={creator.avatar || `https://ui-avatars.com/api/?name=${creator.fullName}&size=64&background=e5e7eb&color=374151`}
                                            alt={creator.fullName}
                                            className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-slate-100 mb-3"
                                        />
                                        <h3 className="font-bold text-gray-900 line-clamp-1">{creator.fullName}</h3>
                                        <p className="text-xs font-medium text-gray-500 mt-0.5">@{creator.username}</p>
                                        
                                        <button 
                                            onClick={() => handleAddFriend(creator._id)}
                                            disabled={actionLoading === creator._id}
                                            className="mt-4 w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-full transition flex items-center justify-center"
                                        >
                                            {actionLoading === creator._id ? <Loader2 size={16} className="animate-spin" /> : "Add Friend"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 3. Global Trending Feed */}
            <div className="border-t border-gray-200 pt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="text-slate-700" size={24} />
                    Global Trending Feed
                </h2>

                {feedLoading && page === 1 ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                    </div>
                ) : feedItems.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                        <p className="text-gray-500">Nothing trending right now.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
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
                    <div className="text-center py-8 text-gray-500 text-sm font-medium">
                        You've reached the end of the trending feed. Check back later for more!
                    </div>
                )}
            </div>
            
        </div>
    );
};

export default ExplorePage;
