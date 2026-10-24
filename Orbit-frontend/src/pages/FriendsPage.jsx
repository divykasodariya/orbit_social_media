import React, { useState, useEffect, useRef } from 'react';
import { 
    getFriends, 
    getFriendRequests, 
    getSuggestedUsers, 
    sendFriendRequest, 
    acceptFriendRequest, 
    rejectFriendRequest,
    removeFriend
} from '../api/friend.api';
import { searchUsers } from '../api/user.api';
import { Users, UserPlus, UserCheck, UserX, Loader2, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';

const FriendsPage = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    
    const [activeTab, setActiveTab] = useState('FRIENDS'); // 'FRIENDS', 'REQUESTS', 'SUGGESTED'
    
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [suggested, setSuggested] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null); // id of user/request being acted on

    // Search by username state
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [sentRequests, setSentRequests] = useState(new Set()); // track sent requests in this session
    const searchTimeoutRef = useRef(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [friendsRes, requestsRes, suggestedRes] = await Promise.all([
                getFriends().catch(() => ({ data: { data: [] } })),
                getFriendRequests().catch(() => ({ data: { data: [] } })),
                getSuggestedUsers().catch(() => ({ data: { data: [] } }))
            ]);
            
            setFriends(friendsRes.data?.data || []);
            setRequests(requestsRes.data?.data || []);
            setSuggested(suggestedRes.data?.data || []);
        } catch (err) {
            console.error("Failed to load friends data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Debounced search
    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setSearchError('');
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setSearchLoading(true);
            setSearchError('');
            try {
                const res = await searchUsers(searchQuery.trim());
                setSearchResults(res.data?.data || []);
            } catch (err) {
                setSearchError('Failed to search users. Please try again.');
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 400);

        return () => clearTimeout(searchTimeoutRef.current);
    }, [searchQuery]);

    // Actions
    const handleSendRequest = async (userId) => {
        setActionLoading(userId);
        try {
            await sendFriendRequest(userId);
            setSentRequests(prev => new Set([...prev, userId]));
            // Optimistically update suggested list
            setSuggested(prev => prev.filter(s => s.user?._id !== userId && s.userId !== userId));
        } catch (err) {
            alert(err.response?.data?.message || "Failed to send request");
        } finally {
            setActionLoading(null);
        }
    };

    const handleAcceptRequest = async (requestId, senderId) => {
        setActionLoading(requestId);
        try {
            await acceptFriendRequest(requestId);
            const acceptedRequest = requests.find(r => r._id === requestId);
            
            // Remove from requests, add to friends
            setRequests(prev => prev.filter(r => r._id !== requestId));
            if (acceptedRequest && acceptedRequest.sender) {
                setFriends(prev => [acceptedRequest.sender, ...prev]);
            }
        } catch (err) {
            alert(err.response?.data?.message || "Failed to accept request");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectRequest = async (requestId) => {
        setActionLoading(requestId);
        try {
            await rejectFriendRequest(requestId);
            setRequests(prev => prev.filter(r => r._id !== requestId));
        } catch (err) {
            alert(err.response?.data?.message || "Failed to reject request");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveFriend = async (userId) => {
        if (!window.confirm("Are you sure you want to remove this friend?")) return;
        setActionLoading(userId);
        try {
            await removeFriend(userId);
            setFriends(prev => prev.filter(f => f._id !== userId));
            fetchData(); // refresh suggestions
        } catch (err) {
            alert(err.response?.data?.message || "Failed to remove friend");
        } finally {
            setActionLoading(null);
        }
    };

    // Check if a search result user is already a friend
    const isFriend = (userId) => friends.some(f => f._id === userId);
    const hasPendingRequest = (userId) => sentRequests.has(userId);

    // User Card Component
    const UserCard = ({ userData, subtitle, actionButton }) => {
        const avatar = userData?.avatar || `https://ui-avatars.com/api/?name=${userData?.fullName || 'User'}&background=e5e7eb&color=374151`;
        
        return (
            <div className="bg-white border rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                    <img src={avatar} alt="avatar" className="w-12 h-12 rounded-full border object-cover" />
                    <div>
                        <h3 className="font-bold text-gray-900">{userData?.fullName || 'Orbit User'}</h3>
                        <p className="text-sm font-medium text-gray-500">@{userData?.username || 'user'}</p>
                        {subtitle && <p className="text-xs text-blue-600 font-semibold mt-1">{subtitle}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {actionButton}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-80px)]">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 animate-[fadeIn_0.3s_ease-out]">
            
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                    <Users className="text-blue-600" size={32} />
                    Friends Hub
                </h1>
                <p className="text-gray-500 mt-2 font-medium">Connect with others and expand your Orbit network.</p>
            </div>

            {/* Add by Username Search Box */}
            <div className="mb-8 bg-white border rounded-2xl p-5 shadow-sm">
                <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <UserPlus size={18} className="text-blue-600" />
                    Add a Friend by Username
                </h2>
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        id="username-search-input"
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by username or name..."
                        className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Search Results */}
                {searchLoading && (
                    <div className="flex justify-center py-4">
                        <Loader2 size={20} className="animate-spin text-blue-500" />
                    </div>
                )}

                {searchError && (
                    <p className="text-sm text-red-500 mt-3">{searchError}</p>
                )}

                {!searchLoading && searchResults.length > 0 && (
                    <div className="mt-3 grid gap-2">
                        {searchResults.map(u => (
                            <div key={u._id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={u.avatar || `https://ui-avatars.com/api/?name=${u.fullName}&background=e5e7eb&color=374151`}
                                        alt={u.fullName}
                                        className="w-10 h-10 rounded-full object-cover border"
                                    />
                                    <div>
                                        <p className="font-semibold text-sm text-gray-900">{u.fullName}</p>
                                        <p className="text-xs text-gray-500">@{u.username}</p>
                                    </div>
                                </div>
                                {isFriend(u._id) ? (
                                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full flex items-center gap-1">
                                        <UserCheck size={13} /> Friends
                                    </span>
                                ) : hasPendingRequest(u._id) ? (
                                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                                        Request Sent
                                    </span>
                                ) : (
                                    <button
                                        id={`add-friend-${u._id}`}
                                        onClick={() => handleSendRequest(u._id)}
                                        disabled={actionLoading === u._id}
                                        className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {actionLoading === u._id
                                            ? <Loader2 size={13} className="animate-spin" />
                                            : <UserPlus size={13} />
                                        }
                                        Add Friend
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {!searchLoading && searchQuery.trim() && searchResults.length === 0 && !searchError && (
                    <p className="text-sm text-gray-500 mt-3 text-center">No users found for "{searchQuery}"</p>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-6 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('FRIENDS')}
                    className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${
                        activeTab === 'FRIENDS' 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    Your Friends ({friends.length})
                </button>
                <button
                    onClick={() => setActiveTab('REQUESTS')}
                    className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
                        activeTab === 'REQUESTS' 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    Friend Requests
                    {requests.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                            {requests.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('SUGGESTED')}
                    className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${
                        activeTab === 'SUGGESTED' 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    Suggested for You
                </button>
            </div>

            {/* Content Area */}
            <div className="grid gap-4">
                
                {/* 1. Friends Tab */}
                {activeTab === 'FRIENDS' && (
                    friends.length > 0 ? (
                        friends.map(friend => (
                            <UserCard 
                                key={friend._id} 
                                userData={friend} 
                                actionButton={
                                    <button 
                                        onClick={() => handleRemoveFriend(friend._id)}
                                        disabled={actionLoading === friend._id}
                                        className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition"
                                        title="Remove Friend"
                                    >
                                        {actionLoading === friend._id ? <Loader2 size={20} className="animate-spin" /> : <UserX size={20} />}
                                    </button>
                                }
                            />
                        ))
                    ) : (
                        <div className="text-center py-20 bg-gray-50 border border-dashed rounded-2xl">
                            <Users size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-bold text-gray-600">No friends yet</h3>
                            <p className="text-gray-500 mt-2 text-sm">Search by username above or check the Suggested tab.</p>
                            <button 
                                onClick={() => setActiveTab('SUGGESTED')}
                                className="mt-4 px-6 py-2 bg-blue-100 text-blue-700 font-semibold rounded-full hover:bg-blue-200 transition text-sm"
                            >
                                Find Friends
                            </button>
                        </div>
                    )
                )}

                {/* 2. Requests Tab */}
                {activeTab === 'REQUESTS' && (
                    requests.length > 0 ? (
                        requests.map(request => (
                            <UserCard 
                                key={request._id} 
                                userData={request.sender} 
                                subtitle="Wants to be your friend"
                                actionButton={
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleRejectRequest(request._id)}
                                            disabled={actionLoading === request._id}
                                            className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition disabled:opacity-50"
                                        >
                                            Decline
                                        </button>
                                        <button 
                                            onClick={() => handleAcceptRequest(request._id, request.sender._id)}
                                            disabled={actionLoading === request._id}
                                            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition disabled:opacity-50 flex items-center gap-1"
                                        >
                                            {actionLoading === request._id ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                                            Accept
                                        </button>
                                    </div>
                                }
                            />
                        ))
                    ) : (
                        <div className="text-center py-20 bg-gray-50 border border-dashed rounded-2xl">
                            <UserCheck size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-bold text-gray-600">No pending requests</h3>
                            <p className="text-gray-500 mt-2 text-sm">You're all caught up!</p>
                        </div>
                    )
                )}

                {/* 3. Suggested Tab */}
                {activeTab === 'SUGGESTED' && (
                    suggested.length > 0 ? (
                        suggested.map(suggestion => {
                            const u = suggestion.user || suggestion;
                            const uId = u._id || suggestion.userId;
                            return (
                                <UserCard 
                                    key={uId} 
                                    userData={u} 
                                    subtitle={suggestion.reason}
                                    actionButton={
                                        hasPendingRequest(uId) ? (
                                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                                                Request Sent
                                            </span>
                                        ) : (
                                            <button 
                                                onClick={() => handleSendRequest(uId)}
                                                disabled={actionLoading === uId}
                                                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition disabled:opacity-50 flex items-center gap-1"
                                            >
                                                {actionLoading === uId ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                                Add Friend
                                            </button>
                                        )
                                    }
                                />
                            );
                        })
                    ) : (
                        <div className="text-center py-20 bg-gray-50 border border-dashed rounded-2xl">
                            <Search size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-bold text-gray-600">No suggestions right now</h3>
                            <p className="text-gray-500 mt-2 text-sm">Join more communities or follow people to improve recommendations.</p>
                        </div>
                    )
                )}

            </div>
        </div>
    );
};

export default FriendsPage;
