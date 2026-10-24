import { Link } from "react-router-dom";
import { ThumbsUp, MoreVertical, Trash2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDate } from "../../utils/helpers";

const TweetCard = ({
  tweet,
  onLike,
  canModify,
  onUpdate,
  onDelete,
}) => {
  const owner = typeof tweet.owner === "object" ? tweet.owner : null;

  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(tweet.content);
  const [saving, setSaving] = useState(false);

  /* ✅ keep your existing logic exactly */
  const [isLiked, setIsLiked] = useState(tweet.isLiked);
  const [likesCount, setLikesCount] = useState(tweet.likesCount ?? 0);

  useEffect(() => {
    setIsLiked(tweet.isLiked);
    setLikesCount(tweet.likesCount ?? 0);
  }, [tweet.isLiked, tweet.likesCount]);

  const handleUpdate = async () => {
    if (!content.trim()) return;
    try {
      setSaving(true);
      await onUpdate(tweet._id, content);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!window.confirm("Delete this tweet?")) return;
    onDelete(tweet._id);
  };

  const handleLike = async () => {
    await onLike();
    setIsLiked((p) => !p);
    setLikesCount((p) => (isLiked ? p - 1 : p + 1));
  };

  return (
    <div
      className="bg-white p-4 rounded-xl border
      transition-all duration-300
      hover:shadow-md hover:-translate-y-0.5
      animate-[cardIn_0.35s_ease-out]"
    >
      <div className="flex gap-3 items-start">
        <Link to={`/channel/${owner?.username}`}>
          <img
            src={owner?.avatar}
            alt={owner?.fullName}
            className="w-12 h-12 rounded-full object-cover
            transition-transform duration-300 hover:scale-105"
          />
        </Link>

        <div className="flex-1">
          {/* HEADER */}
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold">{owner?.fullName}</p>
              <p className="text-sm text-gray-500">
                @{owner?.username} • {formatDate(tweet.createdAt)}
              </p>
            </div>

            {canModify && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu((p) => !p)}
                  className="p-1 rounded-full hover:bg-gray-100
                  transition transform hover:scale-110"
                >
                  <MoreVertical size={18} />
                </button>

                {showMenu && (
                  <div
                    className="absolute right-0 mt-1 bg-white border
                    rounded w-32 shadow z-10
                    origin-top-right animate-[dropdown_0.2s_ease-out]"
                  >
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 w-full
                      hover:bg-gray-100 text-sm transition"
                    >
                      <Pencil size={14} /> Edit
                    </button>

                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 px-3 py-2 w-full
                      hover:bg-red-50 text-red-600 text-sm transition"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CONTENT */}
          {isEditing ? (
            <div className="mt-2 animate-[fadeIn_0.2s_ease-out]">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                className="w-full border rounded p-2 text-sm"
              />

              <div className="flex gap-2 mt-2">
                <button
                  disabled={saving}
                  onClick={handleUpdate}
                  className="px-3 py-1 bg-blue-600 text-white
                  rounded text-sm transition hover:bg-blue-700"
                >
                  {saving ? "Saving..." : "Save"}
                </button>

                <button
                  onClick={() => {
                    setIsEditing(false);
                    setContent(tweet.content);
                  }}
                  className="px-3 py-1 bg-gray-100 rounded text-sm
                  transition hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2">{tweet.content}</p>
          )}

          {/* LIKE */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 mt-3 text-sm
            transition transform active:scale-95 ${
              isLiked
                ? "text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            <ThumbsUp size={16} />
            {likesCount}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TweetCard;














// import { Link } from "react-router-dom";
// import { ThumbsUp, MoreVertical, Trash2, Pencil } from "lucide-react";
// import { useState } from "react";
// import { formatDate } from "../../utils/helpers";

// const TweetCard = ({
//   tweet,
//   onLike,
//   canModify,
//   onUpdate,
//   onDelete
// }) => {
//   const owner = typeof tweet.owner === "object" ? tweet.owner : null;

//   const [showMenu, setShowMenu] = useState(false);
//   const [isEditing, setIsEditing] = useState(false);
//   const [content, setContent] = useState(tweet.content);
//   const [saving, setSaving] = useState(false);

//   const handleUpdate = async () => {
//     if (!content.trim()) return;

//     try {
//       setSaving(true);
//       await onUpdate(tweet._id, content);
//       setIsEditing(false);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleDelete = () => {
//     if (!window.confirm("Delete this tweet?")) return;
//     onDelete(tweet._id);
//   };

//   return (
//     <div className="bg-white p-4 rounded-xl border">
//       <div className="flex gap-3 items-start">
//         <Link to={`/channel/${owner?.username}`}>
//           <img
//             src={owner?.avatar}
//             alt={owner?.fullName}
//             className="w-12 h-12 rounded-full object-cover"
//           />
//         </Link>

//         <div className="flex-1">
//           {/* HEADER */}
//           <div className="flex justify-between items-start">
//             <div>
//               <p className="font-semibold">{owner?.fullName}</p>
//               <p className="text-sm text-gray-500">
//                 @{owner?.username} • {formatDate(tweet.createdAt)}
//               </p>
//             </div>

//             {canModify && (
//               <div className="relative">
//                 <button
//                   onClick={() => setShowMenu((p) => !p)}
//                   className="p-1 hover:bg-gray-100 rounded-full"
//                 >
//                   <MoreVertical size={18} />
//                 </button>

//                 {showMenu && (
//                   <div className="absolute right-0 mt-1 bg-white border rounded w-32 shadow z-10">
//                     <button
//                       onClick={() => {
//                         setIsEditing(true);
//                         setShowMenu(false);
//                       }}
//                       className="flex items-center gap-2 px-3 py-2 w-full hover:bg-gray-100 text-sm"
//                     >
//                       <Pencil size={14} /> Edit
//                     </button>

//                     <button
//                       onClick={handleDelete}
//                       className="flex items-center gap-2 px-3 py-2 w-full hover:bg-red-50 text-red-600 text-sm"
//                     >
//                       <Trash2 size={14} /> Delete
//                     </button>
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>

//           {/* CONTENT */}
//           {isEditing ? (
//             <div className="mt-2">
//               <textarea
//                 value={content}
//                 onChange={(e) => setContent(e.target.value)}
//                 rows={3}
//                 className="w-full border rounded p-2 text-sm"
//               />

//               <div className="flex gap-2 mt-2">
//                 <button
//                   disabled={saving}
//                   onClick={handleUpdate}
//                   className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
//                 >
//                   {saving ? "Saving..." : "Save"}
//                 </button>

//                 <button
//                   onClick={() => {
//                     setIsEditing(false);
//                     setContent(tweet.content);
//                   }}
//                   className="px-3 py-1 bg-gray-100 rounded text-sm"
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </div>
//           ) : (
//             <p className="mt-2">{tweet.content}</p>
//           )}

//           {/* LIKE */}
//           <button
//             onClick={onLike}
//             className={`flex items-center gap-1 mt-3 text-sm ${
//               tweet.isLiked
//                 ? "text-blue-600"
//                 : "text-gray-600 hover:text-blue-600"
//             }`}
//           >
//             <ThumbsUp size={16} />
//             {tweet.likesCount ?? 0}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default TweetCard;