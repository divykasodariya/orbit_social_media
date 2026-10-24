import React, { useState, useEffect, useCallback } from 'react';
import {
    getCommunities,
    getCommunityThreads,
    joinCommunity,
    leaveCommunity,
    searchCommunities,
    deleteCommunity,
    createCommunity
} from '../api/community.api';
import ThreadFeedCard from '../components/feed/ThreadFeedCard';
import CreateThreadBox from '../components/feed/CreateThreadBox';
import CreateCommunityModal from '../components/community/CreateCommunityModal';
import CommunityMembersModal from '../components/community/CommunityMembersModal';
import { useAuth } from '../context/AuthContext';
import {
    Users, Loader2, Search, Plus, MoreVertical,
    Trash2, Shield, Lock, Globe, ChevronRight, Flame
} from 'lucide-react';

/* ──────────────── Small avatar placeholder ──────────────── */
const communityInitials = (name = '') =>
    name.slice(0, 2).toUpperCase();

/* ──────────────── CommunityRow (sidebar item) ──────────────── */
const CommunityRow = ({ community, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all
            ${isActive
                ? 'bg-blue-50 border border-blue-200'
                : 'hover:bg-gray-50 border border-transparent'
            }`}
    >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0
            ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
        >
            {communityInitials(community.name)}
        </div>
        <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm truncate ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
                t/{community.slug}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">{community.memberCount || 0} members</p>
        </div>
        <ChevronRight size={14} className={isActive ? 'text-blue-400' : 'text-gray-300'} />
    </button>
);

/* ──────────────── Main Page ──────────────── */
const CommunitiesPage = () => {
    const { user } = useAuth();

    const [communities, setCommunities] = useState([]);
    const [activeCommunity, setActiveCommunity] = useState(null);
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [threadsLoading, setThreadsLoading] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [joinLoading, setJoinLoading] = useState(false);

    /* ──── Fetch communities ──── */
    const fetchCommunities = useCallback(async (query = '') => {
        try {
            setIsSearching(true);
            const res = query.trim()
                ? await searchCommunities(query)
                : await getCommunities();
            const docs = res.data?.data?.docs || res.data?.data || [];
            setCommunities(docs);
            return docs;
        } catch (err) {
            console.error('Failed to load communities', err);
            return [];
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        fetchCommunities().then(docs => {
            if (docs.length > 0) setActiveCommunity(docs[0]);
        });
    }, []);

    // debounced search
    useEffect(() => {
        const t = setTimeout(() => fetchCommunities(searchQuery), 400);
        return () => clearTimeout(t);
    }, [searchQuery]);

    /* ──── Fetch threads for active community ──── */
    useEffect(() => {
        if (!activeCommunity) return;
        setThreads([]);
        setThreadsLoading(true);

        getCommunityThreads(activeCommunity._id)
            .then(res => {
                const docs = res.data?.data?.docs || res.data?.data || [];
                setThreads(docs.map(t => ({
                    type: 'THREAD',
                    contentId: t._id,
                    raw: t,
                    reason: null // no reason label inside a community feed
                })));
            })
            .catch(err => console.error('Failed to load threads', err))
            .finally(() => setThreadsLoading(false));
    }, [activeCommunity?._id]);

    /* ──── Join / Leave ──── */
    const handleJoinToggle = async () => {
        if (!activeCommunity || joinLoading) return;
        const isJoined = activeCommunity.isMember;
        setJoinLoading(true);
        try {
            isJoined
                ? await leaveCommunity(activeCommunity._id)
                : await joinCommunity(activeCommunity._id);

            const updated = {
                ...activeCommunity,
                isMember: !isJoined,
                memberCount: isJoined
                    ? activeCommunity.memberCount - 1
                    : activeCommunity.memberCount + 1
            };
            setActiveCommunity(updated);
            setCommunities(prev =>
                prev.map(c => c._id === activeCommunity._id ? updated : c)
            );
        } catch (err) {
            console.error('Join/Leave failed', err);
        } finally {
            setJoinLoading(false);
        }
    };

    /* ──── Delete ──── */
    const handleDeleteCommunity = async () => {
        if (!window.confirm(`Delete "${activeCommunity.name}"? This cannot be undone.`)) return;
        setShowSettingsMenu(false);
        try {
            await deleteCommunity(activeCommunity._id);
            setActiveCommunity(null);
            const docs = await fetchCommunities();
            if (docs.length > 0) setActiveCommunity(docs[0]);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete community');
        }
    };

    /* ──── New thread prepended ──── */
    const handleThreadCreated = (newItem) => {
        setThreads(prev => [newItem, ...prev]);
    };

    /* ──── New community created ──── */
    const handleCommunityCreated = (newComm) => {
        setCommunities(prev => [newComm, ...prev]);
        setActiveCommunity({ ...newComm, isMember: true });
    };

    const isOwner = user?._id?.toString() === activeCommunity?.creator?.toString()
        || user?._id?.toString() === activeCommunity?.creator?._id?.toString();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-80px)]">
                <Loader2 className="animate-spin text-blue-400" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-6 px-4 flex gap-5 animate-[fadeIn_0.3s_ease-out]">

            {/* ════════════ LEFT SIDEBAR ════════════ */}
            <aside className="w-72 shrink-0 hidden md:block">
                <div className="bg-white border rounded-2xl overflow-hidden shadow-sm sticky top-20">
                    {/* Sidebar header */}
                    <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
                        <span className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <Flame size={16} className="text-orange-500" /> Communities
                        </span>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 transition"
                            title="Create Community"
                        >
                            <Plus size={15} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-3 py-2 border-b">
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-50 border rounded-lg pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                            />
                            {isSearching && <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
                        </div>
                    </div>

                    {/* Community list */}
                    <div className="p-2 max-h-[65vh] overflow-y-auto space-y-1">
                        {communities.length > 0 ? communities.map(c => (
                            <CommunityRow
                                key={c._id}
                                community={c}
                                isActive={activeCommunity?._id === c._id}
                                onClick={() => setActiveCommunity(c)}
                            />
                        )) : (
                            <p className="text-center text-xs text-gray-400 py-8">No communities yet.</p>
                        )}
                    </div>

                    {/* Create CTA */}
                    <div className="px-4 py-3 border-t bg-gray-50">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="w-full text-sm font-semibold text-blue-600 hover:text-blue-700 transition py-1"
                        >
                            + Create Community
                        </button>
                    </div>
                </div>
            </aside>

            {/* ════════════ MAIN FEED ════════════ */}
            <main className="flex-1 min-w-0">
                {activeCommunity ? (
                    <>
                        {/* Community Banner */}
                        <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-2xl p-6 mb-5 shadow-md relative overflow-visible">
                            <div className="flex items-start justify-between gap-4">
                                {/* Left info */}
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-white text-xl font-extrabold border border-white/20 shrink-0">
                                        {communityInitials(activeCommunity.name)}
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-extrabold text-white leading-tight">
                                            {activeCommunity.name}
                                        </h1>
                                        <p className="text-slate-300 text-xs mt-0.5 flex items-center gap-1">
                                            {activeCommunity.privacy === 'PRIVATE'
                                                ? <><Lock size={10} /> Private</>
                                                : <><Globe size={10} /> Public</>}
                                            <span className="mx-1">·</span>
                                            t/{activeCommunity.slug}
                                        </p>
                                        {activeCommunity.description && (
                                            <p className="text-slate-300 text-sm mt-2 max-w-lg line-clamp-2">
                                                {activeCommunity.description}
                                            </p>
                                        )}
                                        {/* Stats row */}
                                        <div className="flex items-center gap-4 mt-3">
                                            <button
                                                onClick={() => setShowMembersModal(true)}
                                                className="text-xs text-slate-300 hover:text-white transition flex items-center gap-1.5 font-medium"
                                            >
                                                <Users size={13} />
                                                {activeCommunity.memberCount || 0} members
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={handleJoinToggle}
                                        disabled={joinLoading}
                                        className={`px-4 py-1.5 rounded-full font-semibold text-sm transition flex items-center gap-1.5
                                            ${activeCommunity.isMember
                                                ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                                                : 'bg-white text-slate-800 hover:bg-gray-100 shadow-sm'
                                            }`}
                                    >
                                        {joinLoading && <Loader2 size={13} className="animate-spin" />}
                                        {activeCommunity.isMember ? 'Joined' : 'Join'}
                                    </button>

                                    {isOwner && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowSettingsMenu(v => !v)}
                                                className="p-2 rounded-full hover:bg-white/20 text-white transition"
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                            {showSettingsMenu && (
                                                <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border z-50 overflow-hidden">
                                                    <button
                                                        onClick={handleDeleteCommunity}
                                                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                                    >
                                                        <Trash2 size={14} /> Delete Community
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Create Post Box — only for members */}
                        {activeCommunity.isMember ? (
                            <CreateThreadBox
                                communityId={activeCommunity._id}
                                onThreadCreated={handleThreadCreated}
                            />
                        ) : (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center text-blue-600 mb-4 text-sm font-medium">
                                <Shield size={18} className="inline mr-2 mb-0.5" />
                                Join this community to post threads.
                            </div>
                        )}

                        {/* Thread Feed */}
                        <div className="space-y-3">
                            {threadsLoading ? (
                                <div className="flex justify-center py-16">
                                    <Loader2 className="animate-spin text-gray-300" size={32} />
                                </div>
                            ) : threads.length > 0 ? (
                                threads.map(item => (
                                    <ThreadFeedCard key={item.contentId} item={item} />
                                ))
                            ) : (
                                <div className="text-center py-16 bg-white border border-dashed rounded-2xl">
                                    <p className="text-gray-500 font-semibold text-lg">No posts yet</p>
                                    <p className="text-gray-400 text-sm mt-1">
                                        {activeCommunity.isMember
                                            ? 'Be the first to start a discussion!'
                                            : 'Join this community to be the first to post!'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* Empty state — no community selected */
                    <div className="text-center py-24 bg-white border border-dashed rounded-2xl flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                            <Users size={36} className="text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-700">Find your people</h2>
                        <p className="text-gray-400 text-sm mt-2 max-w-sm">
                            Join communities to see their posts here, or start your own to connect with others.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-6 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition shadow-sm"
                        >
                            Create a Community
                        </button>
                    </div>
                )}
            </main>

            {/* ════════════ MODALS ════════════ */}
            <CreateCommunityModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={handleCommunityCreated}
            />
            <CommunityMembersModal
                isOpen={showMembersModal}
                onClose={() => setShowMembersModal(false)}
                community={activeCommunity}
            />
        </div>
    );
};

export default CommunitiesPage;
