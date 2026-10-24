import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar onMenuClick={toggleSidebar} />

      <div className="flex pt-14">
        {/* Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          isMobile={true}
          onClose={closeSidebar}
        />

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar isOpen={true} isMobile={false} />
        </div>

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 py-6 md:ml-64">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
