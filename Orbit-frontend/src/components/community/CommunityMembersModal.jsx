import React, { useState, useEffect } from 'react';
import { getCommunityMembers } from '../../api/community.api';
import { X, Loader2 } from 'lucide-react';

const CommunityMembersModal = ({ isOpen, onClose, community }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !community) return;
        const fetchMembers = async () => {
            setLoading(true);
            try {
                const res = await getCommunityMembers(community._id);
                setMembers(res.data?.data?.docs || []);
            } catch (err) {
                console.error("Failed to load members", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMembers();
    }, [isOpen, community]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-900">Members ({community?.memberCount || 0})</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-4 max-h-96 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 size={24} className="animate-spin text-gray-400" />
                        </div>
                    ) : members.length > 0 ? (
                        <div className="space-y-3">
                            {members.map(member => (
                                <div key={member._id} className="flex items-center gap-3">
                                    <img 
                                        src={member.userId?.avatar || `https://ui-avatars.com/api/?name=${member.userId?.fullName || 'User'}`} 
                                        alt="avatar" 
                                        className="w-10 h-10 rounded-full border object-cover"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{member.userId?.fullName || 'User'}</p>
                                        <p className="text-xs text-gray-500">@{member.userId?.username}</p>
                                    </div>
                                    {member.role === 'OWNER' && (
                                        <span className="ml-auto text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                            OWNER
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 text-sm py-4">No members found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommunityMembersModal;
