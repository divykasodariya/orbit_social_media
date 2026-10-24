import React from 'react';
import { useNavigate } from 'react-router-dom';
import { timeAgo } from '../../utils/helpers';
import { Play } from 'lucide-react';

const VideoFeedCard = ({ item }) => {
    const navigate = useNavigate();
    const { raw: video, reason } = item;
    
    if (!video) return null;

    return (
        <div 
            onClick={() => navigate(`/watch/${video._id}`)}
            className="flex flex-col gap-2 cursor-pointer group animate-[fadeIn_0.3s_ease-out]"
        >
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-200">
                <img 
                    src={video.thumbnail} 
                    alt={video.title} 
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                </div>
                {reason && (
                    <div className="absolute top-2 left-2 bg-blue-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                        {reason}
                    </div>
                )}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors flex items-center justify-center">
                    <Play className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" size={48} fill="currentColor" />
                </div>
            </div>
            
            <div className="flex gap-3 mt-2">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0 border">
                    <img 
                        src={video.ownerDetails?.avatar || video.owner?.avatar || `https://ui-avatars.com/api/?name=User`} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="flex flex-col">
                    <h3 className="text-gray-900 font-semibold line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                        {video.title}
                    </h3>
                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/friends?q=${video.ownerDetails?.username || video.owner?.username || 'user'}`); }}
                        className="text-sm text-gray-500 mt-1 hover:text-blue-600 hover:underline text-left"
                    >
                        {video.ownerDetails?.fullName || video.owner?.fullName || "Creator"}
                    </button>
                    <p className="text-xs text-gray-500">
                        {video.views || 0} views • {timeAgo(video.createdAt)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default VideoFeedCard;
