import { ThumbsUp, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { formatDate } from "../../utils/helpers";
import { useState } from "react";

const CommentItem = ({
  comment,
  onLike,
  onUpdate,
  onDelete,
  canModify
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    if (!content.trim()) return;

    try {
      setSaving(true);
      await onUpdate(comment._id, content);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!window.confirm("Delete this comment?")) return;
    onDelete(comment._id);
  };

  return (
    <div className="flex gap-3">
      <img
        src={comment.commentor.avatar}
        className="w-10 h-10 rounded-full"
        alt="avatar"
      />

      <div className="flex-1">
        {/* HEADER */}
        <div className="flex justify-between items-start">
          <div className="flex gap-2 text-sm">
            <span className="font-semibold">
              {comment.commentor.fullName}
            </span>
            <span className="text-gray-500">
              {formatDate(comment.createdAt)}
            </span>
          </div>

          {canModify && (
            <div className="relative">
              <button
                onClick={() => setShowMenu((p) => !p)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <MoreVertical size={16} />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-1 bg-white border rounded shadow w-28 z-10">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-gray-100"
                  >
                    <Edit2 size={14} /> Edit
                  </button>

                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-red-50 text-red-600"
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
          <div className="mt-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={2}
              className="w-full border rounded px-2 py-1 text-sm"
            />

            <div className="flex gap-2 mt-2">
              <button
                disabled={saving}
                onClick={handleUpdate}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
              >
                {saving ? "Saving..." : "Save"}
              </button>

              <button
                onClick={() => {
                  setIsEditing(false);
                  setContent(comment.content);
                }}
                className="px-3 py-1 bg-gray-100 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1">{comment.content}</p>
        )}

        {/* LIKE */}
        <button
          onClick={onLike}
          className={`flex items-center gap-1 mt-2 text-sm ${
            comment.isLiked
              ? "text-blue-600"
              : "text-gray-600 hover:text-blue-600"
          }`}
        >
          <ThumbsUp size={14} />
          {comment.likesCount ?? 0}
        </button>
      </div>
    </div>
  );
};

export default CommentItem;