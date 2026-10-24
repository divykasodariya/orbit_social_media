import React, { useState, useEffect } from 'react';
import { getNotifications, markAsRead, markAllAsRead } from '../api/notification.api';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Heart, MessageSquare, UserPlus, Users, Check, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotificationsPage = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const res = await getNotifications();
            setNotifications(res.data?.data?.notifications || []);
            setUnreadCount(res.data?.data?.unreadCount || 0);
        } catch (err) {
            console.error("Failed to load notifications", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkAllRead = async () => {
        try {
            await markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error(err);
        }
    };

    const handleNotificationClick = async (notif) => {
        if (!notif.isRead) {
            try {
                await markAsRead(notif._id);
                setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (err) {
                console.error(err);
            }
        }
        
        // Navigation based on notification type
        if (notif.type === 'FRIEND_REQUEST') {
            navigate('/friends');
        } else if (notif.type === 'COMMUNITY_JOIN') {
            navigate('/communities');
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'LIKE': return <Heart className="text-red-500" size={20} />;
            case 'COMMENT': return <MessageSquare className="text-blue-500" size={20} />;
            case 'FRIEND_REQUEST': 
            case 'FRIEND_ACCEPT': return <UserPlus className="text-green-500" size={20} />;
            case 'COMMUNITY_JOIN': return <Users className="text-orange-500" size={20} />;
            default: return <Bell className="text-gray-500" size={20} />;
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
                        <Bell className="text-slate-700" size={30} /> 
                        Notifications
                        {unreadCount > 0 && (
                            <span className="bg-blue-600 text-white text-sm font-bold px-2 py-0.5 rounded-full ml-2">
                                {unreadCount}
                            </span>
                        )}
                    </h1>
                </div>
                {unreadCount > 0 && (
                    <button 
                        onClick={handleMarkAllRead}
                        className="text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full transition flex items-center gap-2"
                    >
                        <Check size={16} /> Mark all read
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-slate-500" size={40} />
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-24 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <Bell className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-500 font-medium text-lg">You're all caught up!</p>
                    <p className="text-gray-400 text-sm mt-1">No new notifications right now.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                    {notifications.map((notif, index) => (
                        <div 
                            key={notif._id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`flex items-start gap-4 p-5 cursor-pointer transition ${
                                notif.isRead ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50/70'
                            } ${index !== notifications.length - 1 ? 'border-b' : ''}`}
                        >
                            <div className="relative">
                                <img 
                                    src={notif.sender?.avatar || `https://ui-avatars.com/api/?name=${notif.sender?.fullName}&background=e5e7eb`} 
                                    alt="avatar" 
                                    className="w-12 h-12 rounded-full object-cover border"
                                />
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border shadow-sm">
                                    {getIcon(notif.type)}
                                </div>
                            </div>
                            <div className="flex-1">
                                <p className={`text-[15px] ${notif.isRead ? 'text-gray-700' : 'text-slate-900 font-medium'}`}>
                                    <span className="font-bold text-slate-900 mr-1">{notif.sender?.fullName}</span>
                                    {notif.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 font-medium">
                                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                            {!notif.isRead && (
                                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
