import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex pt-14">
        {/* Mobile Sidebar */}
        <Sidebar
          isMobile
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Page Content */}
        <main className="flex-1 px-4 md:px-6 py-6 md:ml-64">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
