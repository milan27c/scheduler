import type { Metadata } from "next";
import "./globals.css";
import TopNav from "@/components/TopNav";
import Breadcrumb from "@/components/Breadcrumb";
import ThemeProvider from "@/components/ThemeProvider";
import AuthProvider from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Creative Scheduler",
  description: "Internal task scheduling and management platform for digital marketing agencies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-screen flex flex-col overflow-hidden bg-[var(--surface-page)]">
        <ThemeProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
