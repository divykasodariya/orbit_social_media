import React, { useState, useRef } from 'react';
import { createTweet } from '../../api/tweet.api';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Image as ImageIcon, Loader2, Send, X } from 'lucide-react';

const CreatePostBox = ({ onPostCreated }) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const fileInputRef = useRef(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setImage(null);
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim() && !image) return;

        try {
            setIsSubmitting(true);
            
            const formData = new FormData();
            if (content.trim()) formData.append("content", content);
            if (image) formData.append("image", image);

            const res = await createTweet(formData);
            
            setContent('');
            removeImage();
            
            if (onPostCreated && res.data?.data) {
                onPostCreated({
                    type: 'POST',
                    contentId: res.data.data._id,
                    raw: res.data.data,
                    reason: 'Just posted'
                });
            }
        } catch (error) {
            console.error("Failed to create post", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white border rounded-xl p-4 shadow-sm mb-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border">
                    <img 
                        src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.fullName || 'User'}`}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                    />
                </div>
                <form onSubmit={handleSubmit} className="flex-1">
                    <textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's on your mind? Share a post..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-colors resize-none"
                        rows="3"
                    />

                    {preview && (
                        <div className="relative mt-3 inline-block">
                            <img src={preview} alt="Upload preview" className="max-h-48 rounded-lg border object-cover" />
                            <button 
                                type="button" 
                                onClick={removeImage}
                                className="absolute top-2 right-2 bg-gray-900/70 hover:bg-gray-900 text-white p-1 rounded-full transition"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2 text-gray-500">
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleImageChange} 
                                accept="image/*" 
                                className="hidden" 
                            />
                            <button type="button" className="p-2 rounded-full hover:bg-gray-100 transition text-blue-500 cursor-not-allowed" onClick={() => alert("Formatting options coming soon!")}>
                                <MessageSquare size={18} />
                            </button>
                            <button type="button" className="p-2 rounded-full hover:bg-gray-100 transition text-green-500" onClick={() => fileInputRef.current?.click()}>
                                <ImageIcon size={18} />
                            </button>
                        </div>
                        <button 
                            type="submit" 
                            disabled={(!content.trim() && !image) || isSubmitting}
                            className="bg-blue-600 text-white px-5 py-2 rounded-full font-medium text-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            Post
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePostBox;
