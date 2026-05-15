'use client';

import { useSidebar } from "./SidebarContext";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div
      className={`flex-1 flex flex-col overflow-hidden transition-all duration-200 ${
        collapsed ? "ml-16" : "ml-64"
      }`}
    >
      {children}
    </div>
  );
}
