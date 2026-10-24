import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Video,
  History,
  Users,
  MessageSquare,
  Heart,
  ListVideo,
} from "lucide-react";

const Sidebar = ({ isMobile, isOpen, onClose }) => {
  const location = useLocation();

  const links = [
    { to: "/", label: "Home", icon: Home },
    { to: "/videos", label: "Videos", icon: Video },
    { to: "/communities", label: "Communities", icon: Users },
    { to: "/friends", label: "Friends", icon: Heart },
    { to: "/explore", label: "Explore", icon: ListVideo },
    { to: "/notifications", label: "Notifications", icon: MessageSquare },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40
          animate-[fadeIn_0.2s_ease-out]"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-14 left-0 w-64
        h-[calc(100vh-3.5rem)] bg-white border-r z-50
        transition-transform duration-300 ease-out
        ${isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : ""}`}
      >
        <nav className="p-3 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className={`flex items-center gap-4 px-4 py-2.5 rounded-lg
              transition-all duration-200 transform hover:translate-x-1
              ${
                isActive(to)
                  ? "bg-blue-50 text-blue-600 font-medium relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:bg-blue-600 before:rounded-r"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
