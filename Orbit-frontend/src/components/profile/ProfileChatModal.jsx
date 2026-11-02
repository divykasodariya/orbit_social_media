import { useState, useEffect, useRef } from "react";
import { X, Send, Loader2, ArrowLeft, MessageCircle, UserPlus, Users } from "lucide-react";
import { getMessages, sendMessage } from "../../api/message.api";
import { getFriends, sendFriendRequest } from "../../api/friend.api";
import { useAuth } from "../../context/AuthContext";
import { getInitials, timeAgo } from "../../utils/helpers";
import { Link } from "react-router-dom";

const ProfileChatModal = ({ initialUser = null, onClose }) => {
  const { user: currentUser } = useAuth();

  const [activeFriend, setActiveFriend] = useState(initialUser);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [searchFriend, setSearchFriend] = useState("");

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [friendRequestSent, setFriendRequestSent] = useState(false);

  const messagesEndRef = useRef(null);
  const activeFriendIdRef = useRef(null);

  // Load friends if starting on own profile without preselected user
  useEffect(() => {
    if (!initialUser) {
      setFriendsLoading(true);
      getFriends()
        .then((res) => setFriends(res.data?.data || []))
        .catch(() => setFriends([]))
        .finally(() => setFriendsLoading(false));
    }
  }, [initialUser]);

  // Load messages whenever activeFriend changes
  const loadChat = async (friendId, showSpinner = false) => {
    if (!friendId) return;
    if (showSpinner) setChatLoading(true);
    setErrorMsg("");

    try {
      const res = await getMessages(friendId);
      if (activeFriendIdRef.current !== friendId) return;

      const list = res.data?.data || res.data || [];
      setMessages(Array.isArray(list) ? list : []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setErrorMsg(msg);
    } finally {
      if (showSpinner) setChatLoading(false);
    }
  };

  useEffect(() => {
    if (!activeFriend?._id) return;
    activeFriendIdRef.current = activeFriend._id;
    setMessages([]);
    setMessageText("");
    setErrorMsg("");
    loadChat(activeFriend._id, true);

    const timer = setInterval(() => {
      loadChat(activeFriend._id, false);
    }, 3000);

    return () => clearInterval(timer);
  }, [activeFriend?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = messageText.trim();
    if (!content || !activeFriend?._id || sending) return;

    setSending(true);
    setErrorMsg("");

    try {
      await sendMessage(activeFriend._id, content);
      setMessageText("");
      await loadChat(activeFriend._id, false);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Failed to send message. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  const handleAddFriend = async () => {
    if (!activeFriend?._id) return;
    try {
      await sendFriendRequest(activeFriend._id);
      setFriendRequestSent(true);
    } catch (err) {
      console.error("Failed to send friend request", err);
    }
  };

  const filteredFriends = friends.filter(
    (f) =>
      f.fullName?.toLowerCase().includes(searchFriend.toLowerCase()) ||
      f.username?.toLowerCase().includes(searchFriend.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg h-[600px] max-h-[90vh] flex flex-col overflow-hidden animate-[slideUp_0.25s_ease-out]">
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            {activeFriend && !initialUser && (
              <button
                onClick={() => setActiveFriend(null)}
                className="p-1 hover:bg-gray-200 rounded-full text-gray-600 transition -ml-1"
                title="Back to friend list"
              >
                <ArrowLeft size={18} />
              </button>
            )}

            {activeFriend ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm shrink-0">
                  {activeFriend.avatar ? (
                    <img
                      src={activeFriend.avatar}
                      alt={activeFriend.fullName || activeFriend.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(activeFriend.fullName || activeFriend.username)
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 leading-tight">
                    {activeFriend.fullName || activeFriend.username}
                  </h3>
                  <p className="text-xs text-gray-500">@{activeFriend.username}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MessageCircle size={20} className="text-blue-600" />
                <h3 className="font-bold text-gray-900 text-base">Your Messages</h3>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/friends"
              onClick={onClose}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hidden sm:inline mr-1"
            >
              Open Hub
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        {!activeFriend ? (
          /* FRIEND SELECTOR (When opening on own profile) */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-100 bg-white">
              <input
                type="text"
                value={searchFriend}
                onChange={(e) => setSearchFriend(e.target.value)}
                placeholder="Search friends to chat with..."
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:bg-white transition"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
              {friendsLoading ? (
                <div className="py-12 flex justify-center text-gray-400">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="py-12 text-center text-gray-400 px-4">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-gray-600">No friends found</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                    Add friends in the Friends Hub to start messaging each other.
                  </p>
                  <Link
                    to="/friends"
                    onClick={onClose}
                    className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition"
                  >
                    Find Friends
                  </Link>
                </div>
              ) : (
                filteredFriends.map((friend) => (
                  <button
                    key={friend._id}
                    onClick={() => setActiveFriend(friend)}
                    className="w-full p-2.5 rounded-xl hover:bg-slate-50 flex items-center gap-3 text-left transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-700 font-bold text-sm shrink-0">
                      {friend.avatar ? (
                        <img
                          src={friend.avatar}
                          alt={friend.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(friend.fullName || friend.username)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {friend.fullName || friend.username}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        @{friend.username}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                      Chat
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          /* ACTIVE CHAT CONVERSATION */
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {chatLoading ? (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                </div>
              ) : errorMsg && errorMsg.includes("friends") ? (
                /* Not friends warning */
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                  <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-3">
                    <UserPlus size={22} />
                  </div>
                  <h4 className="font-bold text-gray-800 text-base mb-1">
                    Connect as Friends to Chat
                  </h4>
                  <p className="text-xs text-gray-500 max-w-xs mb-4">
                    On Orbit, you can exchange direct messages once you are friends with each other.
                  </p>

                  {friendRequestSent ? (
                    <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-xl">
                      ✓ Friend Request Sent
                    </span>
                  ) : (
                    <button
                      onClick={handleAddFriend}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition shadow-xs flex items-center gap-1.5"
                    >
                      <UserPlus size={14} /> Send Friend Request
                    </button>
                  )}
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                  <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-2">
                    <MessageCircle size={26} />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">No messages yet</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Say hello to {activeFriend.fullName || activeFriend.username}!
                  </p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const senderId = String(m?.sender?._id || m?.sender || m?.senderId);
                  const isMine = senderId === String(currentUser?._id);

                  return (
                    <div
                      key={m._id || idx}
                      className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[78%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                          isMine
                            ? "bg-blue-600 text-white rounded-br-xs shadow-2xs"
                            : "bg-white text-gray-800 border border-gray-200 rounded-bl-xs shadow-2xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 px-1">
                        {timeAgo(m.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            {(!errorMsg || !errorMsg.includes("friends")) && (
              <form
                onSubmit={handleSend}
                className="p-3 border-t border-gray-200 bg-white flex items-center gap-2"
              >
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Message ${activeFriend.fullName || activeFriend.username}...`}
                  className="flex-1 px-4 py-2 text-sm bg-slate-50 border border-gray-200 rounded-full focus:outline-none focus:border-blue-400 focus:bg-white transition"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || sending}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition disabled:opacity-50 disabled:hover:bg-blue-600 shadow-xs"
                  title="Send message"
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileChatModal;

