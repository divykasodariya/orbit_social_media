import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Video,
  Users,
  MessageSquare,
  Heart,
  ListVideo,
} from "lucide-react";

const Sidebar = ({ isMobile, isOpen, onClose, isCollapsed = true }) => {
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

  // Mobile drawer sidebar with backdrop
  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 animate-[fadeIn_0.2s_ease-out]"
            onClick={onClose}
          />
        )}

        <aside
          className={`fixed top-14 left-0 w-64 h-[calc(100vh-3.5rem)] bg-white border-r z-50 transition-transform duration-300 ease-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav className="p-3 space-y-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={`flex items-center gap-4 px-4 py-2.5 rounded-xl transition-all duration-200 transform hover:translate-x-1 ${
                  isActive(to)
                    ? "bg-blue-50 text-blue-600 font-semibold relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:bg-blue-600 before:rounded-r"
                    : "text-gray-700 hover:bg-gray-100 font-medium"
                }`}
              >
                <Icon size={20} />
                <span className="text-sm">{label}</span>
              </Link>
            ))}
          </nav>
        </aside>
      </>
    );
  }

  // Desktop / Tablet navigation rail
  return (
    <aside
      className={`fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-white border-r z-40 transition-[width] duration-300 ease-out select-none ${
        isCollapsed ? "w-[72px]" : "w-60"
      }`}
    >
      <nav className={`h-full overflow-y-auto py-2.5 ${isCollapsed ? "px-1.5 space-y-1" : "px-3 space-y-1"}`}>
        {links.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);

          if (isCollapsed) {
            return (
              <Link
                key={to}
                to={to}
                title={label}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-center group transition-all duration-200 ${
                  active
                    ? "bg-blue-50 text-blue-600 font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon
                  size={20}
                  className={`transition-transform duration-200 group-hover:scale-110 ${
                    active ? "text-blue-600 stroke-[2.2]" : "text-gray-600"
                  }`}
                />
                <span className="text-[10px] sm:text-[11px] font-medium leading-tight mt-1 text-center truncate max-w-[64px]">
                  {label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all duration-200 ${
                active
                  ? "bg-blue-50 text-blue-600 font-semibold relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:bg-blue-600 before:rounded-r"
                  : "text-gray-700 hover:bg-gray-100 font-medium"
              }`}
            >
              <Icon size={20} className={active ? "text-blue-600" : "text-gray-600"} />
              <span className="text-sm truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;

