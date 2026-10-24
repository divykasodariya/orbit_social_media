import React, { useState } from 'react';
import { createCommunity } from '../../api/community.api';
import { X, Loader2 } from 'lucide-react';

const CreateCommunityModal = ({ isOpen, onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [privacy, setPrivacy] = useState('PUBLIC');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!name || !slug) return;

        try {
            setIsSubmitting(true);
            const res = await createCommunity({ name, slug, description, privacy });
            if (res.data?.data) {
                onCreated(res.data.data);
                setName('');
                setSlug('');
                setDescription('');
                onClose();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create community');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-900">Create Community</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
                                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                                }
                            }}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            placeholder="e.g. React Developers"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Slug (URL)</label>
                        <div className="flex items-center border rounded-lg overflow-hidden focus-within:border-blue-500">
                            <span className="bg-gray-100 text-gray-500 px-3 py-2 text-sm border-r">t/</span>
                            <input 
                                type="text" 
                                value={slug}
                                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                className="w-full px-3 py-2 text-sm focus:outline-none"
                                placeholder="react-developers"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                        <textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none h-24"
                            placeholder="What is this community about?"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Privacy</label>
                        <select 
                            value={privacy}
                            onChange={(e) => setPrivacy(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
                        >
                            <option value="PUBLIC">Public - Anyone can view and join</option>
                            <option value="PRIVATE">Private - Only approved members</option>
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting || !name || !slug}
                            className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCommunityModal;
