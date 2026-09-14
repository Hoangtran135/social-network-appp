import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { SidebarLeft } from './SidebarLeft';
import { CreatePostModal } from '../features/posts/CreatePostModal';
import { Toast } from '../common/Toast';

export interface MainLayoutContext {
  openCreatePost: () => void;
  setRightPanel: (node: React.ReactNode) => void;
}

export const MainLayout: React.FC = () => {
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<React.ReactNode>(null);
  const location = useLocation();

  // Messages uses its own full-bleed two-pane layout, without the sidebar shell.
  const isFullBleed = location.pathname.startsWith('/messages');

  const context: MainLayoutContext = {
    openCreatePost: () => setIsCreatePostOpen(true),
    setRightPanel,
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar onOpenCreatePost={() => setIsCreatePostOpen(true)} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 min-w-0">
        {isFullBleed ? (
          <Outlet context={context} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] xl:grid-cols-[16rem_1fr_18rem] gap-6 items-start">
            <SidebarLeft />
            <div className="min-w-0">
              <Outlet context={context} />
            </div>
            <div className="hidden xl:block">{rightPanel}</div>
          </div>
        )}
      </main>

      {/* Global Create Post Modal */}
      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />

      <Toast />
    </div>
  );
};
