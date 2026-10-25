import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  Search,
  Upload,
  User,
  X,
  Video,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import CoWatchNavButton from "../cowatch/CoWatchNavButton";

const Navbar = ({ onMenuClick }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownRef = useRef(null);

  /* ================= SEARCH ================= */
  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    setShowMobileSearch(false);
  };

  /* ================= LOGOUT ================= */
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  /* ================= CLOSE DROPDOWN ================= */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ================= PREVENT SCROLL ================= */
  useEffect(() => {
    document.body.style.overflow = showMobileSearch ? "hidden" : "auto";
  }, [showMobileSearch]);

  return (
    <>
      {/* ================= NAVBAR ================= */}
      <nav className="fixed top-0 inset-x-0 h-14 bg-white border-b z-50
        animate-[slideDown_0.35s_ease-out]">
        <div className="flex items-center justify-between px-4 h-full">

          {/* LEFT */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-700
              transition transform hover:scale-105 active:scale-95"
              title="Toggle sidebar"
              aria-label="Toggle navigation"
            >
              <Menu size={20} />
            </button>

            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-lg
                flex items-center justify-center font-bold">
                X
              </div>
              <span className="text-xl font-bold hidden sm:block">
                Orbit
              </span>
            </Link>
          </div>

          {/* SEARCH (DESKTOP) */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-lg mx-6"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-2 border rounded-l-full focus:outline-none"
              placeholder="Search"
            />
            <button
              className="px-5 border rounded-r-full bg-gray-100
              transition hover:bg-gray-200"
            >
              <Search />
            </button>
          </form>

          {/* RIGHT */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMobileSearch(true)}
              className="md:hidden p-2 rounded hover:bg-gray-100
              transition transform hover:scale-105 active:scale-95"
            >
              <Search />
            </button>

            {isAuthenticated ? (
              <>
                <CoWatchNavButton />

                <Link
                  to="/upload"
                  className="p-2 rounded hover:bg-gray-100
                  transition transform hover:scale-105 active:scale-95"
                >
                  <Upload />
                </Link>

                {/* AVATAR + DROPDOWN */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown((p) => !p)}
                    className="w-8 h-8 rounded-full overflow-hidden border
                    transition transform hover:scale-110 active:scale-95"
                  >
                    <img
                      src={user?.avatar}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border
                      rounded-xl shadow-lg py-2 origin-top-right
                      animate-[dropdown_0.2s_ease-out]">

                      <Link
                        to={`/channel/${user?.username}`}
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-4 py-3
                        hover:bg-gray-50 transition"
                      >
                        <img
                          src={user?.avatar}
                          alt={user?.fullName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-semibold">
                            {user?.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{user?.username}
                          </div>
                        </div>
                      </Link>

                      <hr className="my-2" />

                      <Link
                        to="/profile"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2
                        hover:bg-gray-100 transition"
                      >
                        <User size={18} />
                        My Profile
                      </Link>

                      <Link
                        to="/studio/dashboard"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2
                        hover:bg-gray-100 transition"
                      >
                        <Video size={18} />
                        Your Channel
                      </Link>

                      <Link
                        to="/studio/videos"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2
                        hover:bg-gray-100 transition"
                      >
                        <Settings size={18} />
                        Studio
                      </Link>

                      <hr className="my-2" />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2
                        hover:bg-gray-100 transition text-left"
                      >
                        <LogOut size={18} />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2
                text-blue-600 border border-blue-600 rounded-full
                hover:bg-blue-50 transition"
              >
                <User size={18} />
                <span className="hidden sm:block">Login</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ================= MOBILE SEARCH ================= */}
      {showMobileSearch && (
        <div className="fixed inset-0 bg-white z-[60] px-4 py-3
          animate-[slideUp_0.25s_ease-out]">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMobileSearch(false)}
              className="p-2 rounded hover:bg-gray-100 transition"
            >
              <X />
            </button>

            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-full"
              placeholder="Search Orbit"
            />
          </form>
        </div>
      )}
    </>
  );
};

export default Navbar;
