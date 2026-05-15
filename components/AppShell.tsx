'use client';

import { usePathname } from "next/navigation";
import TopNav from "@/components/TopNav";
import Breadcrumb from "@/components/Breadcrumb";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <TopNav />
      <Breadcrumb />
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[var(--surface-page)]">
        <div className="flex-1 overflow-y-auto flex flex-col">
          {children}
        </div>
      </div>
    </>
  );
}
