import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";

const MainLayout = () => {
  const location = useLocation();
  const isWatchPage = location.pathname.startsWith("/watch/");

  // Default to compact rail (true) to conserve horizontal space
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Auto-collapse sidebar on watch page navigation
  useEffect(() => {
    if (isWatchPage) {
      setIsCollapsed(true);
    }
  }, [isWatchPage]);

  const handleMenuClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <Navbar onMenuClick={handleMenuClick} />

      <div className="flex pt-14 flex-1">
        {/* Mobile Drawer Sidebar */}
        <Sidebar
          isOpen={isMobileOpen}
          isMobile={true}
          onClose={closeMobileSidebar}
        />

        {/* Desktop / Tablet Sidebar */}
        <div className="hidden md:block">
          <Sidebar
            isMobile={false}
            isCollapsed={isCollapsed}
          />
        </div>

        {/* Main Content Area */}
        <main
          className={`flex-1 transition-[margin] duration-300 ease-out min-w-0 ${
            isCollapsed ? "md:ml-[72px]" : "md:ml-60"
          } ${
            isWatchPage
              ? "px-3 sm:px-4 lg:px-6 py-4 sm:py-6"
              : "px-4 sm:px-6 py-6"
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;

