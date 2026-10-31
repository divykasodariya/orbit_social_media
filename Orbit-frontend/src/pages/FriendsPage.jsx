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
import { Users, UserPlus, UserCheck, UserX, Loader2, Search, X, MessageCircle, Send, ArrowLeft } from 'lucide-react';
import { getMessages, sendMessage } from '../api/message.api';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';

const FriendsPage = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    
    const [activeTab, setActiveTab] = useState('FRIENDS'); // 'FRIENDS', 'REQUESTS', 'SUGGESTED'
    
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [suggested, setSuggested] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null); // id of user/request being acted on

    // One-to-one chat state
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [messageSending, setMessageSending] = useState(false);
    const [chatError, setChatError] = useState('');
    const messagesEndRef = useRef(null);
    const seenMessageKeysRef = useRef(new Set());   // messages we've already seen (for notifications)
    const initialLoadDoneRef = useRef(false);        // don't notify for the history load
    const activeFriendIdRef = useRef(null);          // ignore late responses from a previous chat

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

    // Normalize the API response so the UI can handle either { data: [...] } or [...].
    const extractMessageList = (response) => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.messages)) return response.messages;
        return [];
    };

    const loadMessages = async (friendId, showLoader = false) => {
        if (showLoader) setChatLoading(true);
        try {
            const response = await getMessages(friendId);
            if (activeFriendIdRef.current !== friendId) return; // user switched chats meanwhile
            const list = extractMessageList(response);

            // Detect newly received messages (from the other person) and notify
            const myId = String(user?._id || user?.id);
            const keyOf = (m, i) => m._id || `${m.createdAt || i}-${m.content || m.text}`;
            const incomingNew = list.filter((m, i) => {
                const senderId = String(m.sender?._id || m.sender || m.senderId);
                return senderId !== myId && !seenMessageKeysRef.current.has(keyOf(m, i));
            });
            if (initialLoadDoneRef.current && incomingNew.length > 0) {
                notifyNewMessage(incomingNew[incomingNew.length - 1]);
            }
            list.forEach((m, i) => seenMessageKeysRef.current.add(keyOf(m, i)));
            initialLoadDoneRef.current = true;

            setMessages(list);
            setChatError('');
        } catch (error) {
            console.error('Failed to load conversation:', error);
            if (showLoader) setChatError(error.response?.data?.message || 'Unable to load messages. Please try again.');
        } finally {
            if (showLoader) setChatLoading(false);
        }
    };

    // Sound + browser notification when a new message arrives
    const notifyNewMessage = (message) => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                const ctx = new AudioCtx();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
                gain.gain.setValueAtTime(0.0001, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.26);
                osc.onended = () => ctx.close();
            }
        } catch (e) { /* sound is optional */ }

        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
            const n = new Notification(selectedFriend?.fullName || 'New message', {
                body: message.content || message.text || 'Sent you a message',
                icon: selectedFriend?.avatar || undefined,
                tag: 'orbit-chat'
            });
            n.onclick = () => { window.focus(); n.close(); };
        }
    };

    const handleOpenChat = (friend) => {
        activeFriendIdRef.current = friend._id;
        seenMessageKeysRef.current = new Set();
        initialLoadDoneRef.current = false;
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        setSelectedFriend(friend);
        setMessages([]);
        setMessageText('');
        setChatError('');
        loadMessages(friend._id, true);
    };

    const handleSendMessage = async (event) => {
        event.preventDefault();
        const content = messageText.trim();
        if (!content || !selectedFriend || messageSending) return;

        setMessageSending(true);
        setChatError('');
        try {
            await sendMessage(selectedFriend._id, content);
            setMessageText('');
            await loadMessages(selectedFriend._id);
        } catch (error) {
            console.error('Failed to send message:', error);
            setChatError(error.response?.data?.message || 'Message could not be sent. Please try again.');
        } finally {
            setMessageSending(false);
        }
    };

    // Poll while a conversation is open to receive new messages.
    useEffect(() => {
        if (!selectedFriend?._id) return;

        const friendId = selectedFriend._id;
        const intervalId = setInterval(() => loadMessages(friendId), 3000);
        return () => clearInterval(intervalId);
    }, [selectedFriend?._id]);

    // Lock page scroll while the messenger is open
    useEffect(() => {
        if (!selectedFriend) {
            activeFriendIdRef.current = null;
            return;
        }
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [selectedFriend]);

    // Keep the latest message visible when a conversation updates.
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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

            {/* One-to-one chat panel (Instagram/Messenger style full-screen messenger) */}
            {selectedFriend && createPortal(
                <div className="fixed inset-0 z-[100] bg-black/50 md:p-6 flex items-center justify-center animate-[fadeIn_0.2s_ease-out]">
                    <section className="w-full h-[100dvh] md:max-w-5xl md:h-[85vh] bg-white md:rounded-2xl shadow-2xl overflow-hidden flex">

                        {/* Left: conversations list (desktop only) */}
                        <aside className="hidden md:flex flex-col w-80 border-r border-gray-200 bg-white">
                            <div className="px-5 py-4 border-b flex items-center justify-between">
                                <h2 className="text-lg font-extrabold text-gray-900">Messages</h2>
                                <button
                                    onClick={() => { setSelectedFriend(null); setMessages([]); setChatError(''); }}
                                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition"
                                    aria-label="Close chat"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {friends.map(friend => {
                                    const isActive = friend._id === selectedFriend._id;
                                    return (
                                        <button
                                            key={friend._id}
                                            onClick={() => !isActive && handleOpenChat(friend)}
                                            className={`w-full flex items-center gap-3 px-5 py-3 text-left transition ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                        >
                                            <img
                                                src={friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.fullName || friend.username || 'User')}&background=e5e7eb&color=374151`}
                                                alt=""
                                                className="w-12 h-12 rounded-full object-cover border"
                                            />
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm text-gray-900 truncate">{friend.fullName || 'Orbit User'}</p>
                                                <p className="text-xs text-gray-500 truncate">@{friend.username || 'user'}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </aside>

                        {/* Right: active conversation */}
                        <div className="flex-1 min-w-0 flex flex-col bg-white">
                            {/* Chat header */}
                            <div className="flex items-center gap-3 px-3 md:px-5 py-3 border-b bg-white">
                                <button
                                    onClick={() => { setSelectedFriend(null); setMessages([]); setChatError(''); }}
                                    className="md:hidden p-2 rounded-full text-gray-700 hover:bg-gray-100 transition"
                                    aria-label="Back"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <img
                                    src={selectedFriend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedFriend.fullName || selectedFriend.username || 'User')}&background=e5e7eb&color=374151`}
                                    alt=""
                                    className="w-10 h-10 rounded-full object-cover border"
                                />
                                <div className="min-w-0 flex-1">
                                    <h2 className="font-bold text-gray-900 truncate leading-tight">{selectedFriend.fullName || 'Orbit User'}</h2>
                                    <p className="text-xs text-gray-500 truncate">@{selectedFriend.username || 'user'}</p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 bg-white space-y-1">
                                {chatLoading ? (
                                    <div className="h-full flex items-center justify-center text-blue-600">
                                        <Loader2 size={26} className="animate-spin" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                                        <img
                                            src={selectedFriend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedFriend.fullName || selectedFriend.username || 'User')}&background=e5e7eb&color=374151`}
                                            alt=""
                                            className="w-20 h-20 rounded-full object-cover border mb-3"
                                        />
                                        <p className="font-bold text-gray-900">{selectedFriend.fullName || 'Orbit User'}</p>
                                        <p className="text-sm">@{selectedFriend.username || 'user'}</p>
                                        <p className="text-sm mt-3">No messages yet. Say hi 👋</p>
                                    </div>
                                ) : (
                                    messages.map((message, index) => {
                                        const getSenderId = (m) => String(m?.sender?._id || m?.sender || m?.senderId);
                                        const myId = String(user?._id || user?.id);
                                        const isOwnMessage = getSenderId(message) === myId;
                                        const nextMessage = messages[index + 1];
                                        const prevMessage = messages[index - 1];
                                        const isLastInGroup = !nextMessage || getSenderId(nextMessage) !== getSenderId(message);
                                        const isFirstInGroup = !prevMessage || getSenderId(prevMessage) !== getSenderId(message);
                                        // Timestamp only on the very last message from each person (max 2 in the whole chat)
                                        const isLastFromThisSender = !messages.slice(index + 1).some(m => getSenderId(m) === getSenderId(message));
                                        return (
                                            <div
                                                key={message._id || `${message.createdAt || ''}-${index}`}
                                                className={`flex items-end gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'} ${isFirstInGroup && index !== 0 ? 'pt-2' : ''}`}
                                            >
                                                {/* Friend avatar beside the last bubble of a group */}
                                                {!isOwnMessage && (
                                                    <div className="w-7 h-7 shrink-0">
                                                        {isLastInGroup && (
                                                            <img
                                                                src={selectedFriend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedFriend.fullName || selectedFriend.username || 'User')}&background=e5e7eb&color=374151`}
                                                                alt=""
                                                                className="w-7 h-7 rounded-full object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                                <div className={`flex flex-col max-w-[75%] md:max-w-[60%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                                                    {/* Timestamp: only on the last message from me and the last message from them, above the bubble */}
                                                    {isLastFromThisSender && message.createdAt && (
                                                        <span className="text-[10px] text-gray-400 mb-1 px-2">
                                                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                    <div
                                                        title={message.createdAt ? new Date(message.createdAt).toLocaleString() : undefined}
                                                        className={`rounded-3xl px-4 py-2 ${isOwnMessage ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}
                                                    >
                                                        <p className="text-sm whitespace-pre-wrap break-words">{message.content || message.text}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {chatError && <p className="px-5 pt-2 text-sm text-red-600">{chatError}</p>}

                            {/* Composer */}
                            <form onSubmit={handleSendMessage} className="p-3 md:p-4 bg-white">
                                <div className="flex items-center gap-2 border border-gray-200 rounded-full pl-4 pr-1.5 py-1.5 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                                    <input
                                        type="text"
                                        value={messageText}
                                        onChange={(event) => setMessageText(event.target.value)}
                                        placeholder={`Message ${selectedFriend.fullName || 'your friend'}...`}
                                        maxLength={2000}
                                        className="flex-1 min-w-0 py-2 text-sm bg-transparent focus:outline-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!messageText.trim() || messageSending}
                                        className="p-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                        aria-label="Send message"
                                    >
                                        {messageSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </section>
                </div>,
                document.body
            )}

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
                                    <>
                                        <button
                                            onClick={() => handleOpenChat(friend)}
                                            className="px-3 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full transition flex items-center gap-2"
                                            title={`Chat with ${friend.fullName || friend.username || 'friend'}`}
                                        >
                                            <MessageCircle size={17} />
                                            Chat
                                        </button>
                                        <button
                                            onClick={() => handleRemoveFriend(friend._id)}
                                            disabled={actionLoading === friend._id}
                                            className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition"
                                            title="Remove Friend"
                                        >
                                            {actionLoading === friend._id ? <Loader2 size={20} className="animate-spin" /> : <UserX size={20} />}
                                        </button>
                                    </>
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
