import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Users, TrendingUp, Video, Loader2, UserPlus, UserCheck } from 'lucide-react';
import { searchUsers } from '../api/user.api';
import { searchCommunities, joinCommunity } from '../api/community.api';
import { getAllVideos } from '../api/video.api';
import { sendFriendRequest, getFriends, getFriendRequests } from '../api/friend.api';
import VideoFeedCard from '../components/feed/VideoFeedCard';
import { useAuth } from '../context/AuthContext';

const SearchPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    
    const [searchInput, setSearchInput] = useState(query);
    const [activeTab, setActiveTab] = useState('ALL'); // ALL, USERS, COMMUNITIES, VIDEOS

    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    const [users, setUsers] = useState([]);
    const [communities, setCommunities] = useState([]);
    const [videos, setVideos] = useState([]);

    // We also need to know if a user is already a friend to show the correct button
    const [friendsSet, setFriendsSet] = useState(new Set());
    const [sentRequestsSet, setSentRequestsSet] = useState(new Set());

    useEffect(() => {
        // Fetch friends info once to enrich user search results
        if (user) {
            Promise.all([
                getFriends().catch(() => ({ data: { data: [] } })),
                getFriendRequests().catch(() => ({ data: { data: [] } }))
            ]).then(([friendsRes, requestsRes]) => {
                const fSet = new Set((friendsRes.data?.data || []).map(f => f._id.toString()));
                setFriendsSet(fSet);
                // In a real app we'd track sent requests properly, for now just empty set 
                // or whatever we have available if getFriendRequests returns sent requests too
            });
        }
    }, [user]);

    useEffect(() => {
        if (!query.trim()) return;
        
        const fetchResults = async () => {
            setLoading(true);
            setSearchInput(query);
            try {
                const [usersRes, commsRes, videosRes] = await Promise.all([
                    searchUsers(query).catch(() => ({ data: { data: [] } })),
                    searchCommunities(query).catch(() => ({ data: { data: [] } })),
                    getAllVideos(query).catch(() => ({ data: { data: { docs: [] } } }))
                ]);
                
                setUsers(usersRes.data?.data || []);
                setCommunities(commsRes.data?.data?.docs || commsRes.data?.data || []);
                // Videos API often paginates in docs
                setVideos(videosRes.data?.data?.docs || videosRes.data?.data || []);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchInput.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
        }
    };

    const handleAddFriend = async (userId) => {
        setActionLoading(userId);
        try {
            await sendFriendRequest(userId);
            setSentRequestsSet(prev => new Set([...prev, userId]));
        } catch (err) {
            alert(err.response?.data?.message || "Failed to send request");
        } finally {
            setActionLoading(null);
        }
    };

    const handleJoinCommunity = async (communityId) => {
        setActionLoading(communityId);
        try {
            await joinCommunity(communityId);
            // Optimistically update
            setCommunities(prev => prev.map(c => 
                c._id === communityId ? { ...c, memberCount: (c.memberCount || 0) + 1, isMember: true } : c
            ));
        } catch (err) {
            alert(err.response?.data?.message || "Failed to join community");
        } finally {
            setActionLoading(null);
        }
    };

    const isFriend = (id) => friendsSet.has(id.toString());
    const hasSentRequest = (id) => sentRequestsSet.has(id.toString());

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 animate-[fadeIn_0.3s_ease-out]">
            
            {/* Search Header */}
            <div className="mb-8">
                <form onSubmit={handleSearchSubmit} className="relative group max-w-2xl mx-auto">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400 group-focus-within:text-slate-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search for people, communities, and videos..."
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

            {/* Tabs */}
            <div className="flex border-b mb-6 overflow-x-auto no-scrollbar">
                {['ALL', 'USERS', 'COMMUNITIES', 'VIDEOS'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${
                            activeTab === tab 
                            ? 'border-slate-800 text-slate-900' 
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        {tab === 'ALL' && 'All Results'}
                        {tab === 'USERS' && `People (${users.length})`}
                        {tab === 'COMMUNITIES' && `Communities (${communities.length})`}
                        {tab === 'VIDEOS' && `Videos (${videos.length})`}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-slate-500" size={40} />
                </div>
            ) : !query ? (
                <div className="text-center py-20 text-gray-500">
                    Enter a search term above to get started.
                </div>
            ) : (
                <div className="space-y-10">
                    
                    {/* Users Section */}
                    {(activeTab === 'ALL' || activeTab === 'USERS') && (users.length > 0 || activeTab === 'USERS') && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Users size={20} className="text-slate-600" /> People
                            </h2>
                            {users.length === 0 ? (
                                <p className="text-sm text-gray-500">No users found.</p>
                            ) : (
                                <div className="grid gap-3">
                                    {users.map(u => (
                                        <div key={u._id} className="bg-white border rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-4">
                                                <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.fullName}&background=e5e7eb&color=374151`} alt={u.fullName} className="w-12 h-12 rounded-full border object-cover" />
                                                <div>
                                                    <h3 className="font-bold text-gray-900">{u.fullName}</h3>
                                                    <p className="text-sm font-medium text-gray-500">@{u.username}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {user?._id === u._id ? (
                                                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">You</span>
                                                ) : isFriend(u._id) ? (
                                                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full flex items-center gap-1">
                                                        <UserCheck size={13} /> Friends
                                                    </span>
                                                ) : hasSentRequest(u._id) ? (
                                                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                                                        Request Sent
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAddFriend(u._id)}
                                                        disabled={actionLoading === u._id}
                                                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition disabled:opacity-50 flex items-center gap-1"
                                                    >
                                                        {actionLoading === u._id ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                                        Add Friend
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Communities Section */}
                    {(activeTab === 'ALL' || activeTab === 'COMMUNITIES') && (communities.length > 0 || activeTab === 'COMMUNITIES') && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <TrendingUp size={20} className="text-slate-600" /> Communities
                            </h2>
                            {communities.length === 0 ? (
                                <p className="text-sm text-gray-500">No communities found.</p>
                            ) : (
                                <div className="grid gap-3">
                                    {communities.map(c => (
                                        <div key={c._id} className="bg-white border rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/communities`)}>
                                                <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl text-white font-bold flex items-center justify-center text-lg shadow-sm">
                                                    {c.name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900">{c.name}</h3>
                                                    <p className="text-sm font-medium text-gray-500">t/{c.slug} • {c.memberCount || 0} members</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {c.isMember ? (
                                                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">Joined</span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleJoinCommunity(c._id)}
                                                        disabled={actionLoading === c._id}
                                                        className="px-4 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-full transition disabled:opacity-50 flex items-center justify-center"
                                                    >
                                                        {actionLoading === c._id ? <Loader2 size={16} className="animate-spin" /> : "Join"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Videos Section */}
                    {(activeTab === 'ALL' || activeTab === 'VIDEOS') && (videos.length > 0 || activeTab === 'VIDEOS') && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Video size={20} className="text-slate-600" /> Videos
                            </h2>
                            {videos.length === 0 ? (
                                <p className="text-sm text-gray-500">No videos found.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {videos.map(v => (
                                        <VideoFeedCard key={v._id} item={{ raw: v }} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Empty All State */}
                    {activeTab === 'ALL' && users.length === 0 && communities.length === 0 && videos.length === 0 && (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                            <p className="text-gray-500 font-medium">We couldn't find anything matching "{query}".</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchPage;
