'use client';

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export type UserRole = "manager" | "writer" | "designer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  designation: string;
  role: UserRole;
  photo?: string;
}

interface StoredMember {
  id: string;
  name: string;
  email: string;
  designation: string;
  photo?: string;
  paused?: boolean;
}

const DEFAULT_MEMBERS: StoredMember[] = [
  { id: "1", name: "Sanjaya Samaratunga", designation: "Manager", email: "sanjaya@test.com" },
];

// Manager designations get the manager role; everything else is a creator.
// Adjust this list if more manager-level titles are added.
const MANAGER_DESIGNATIONS = new Set([
  "manager",
  "assistant manager",
  "team leader",
]);

function designationToRole(designation: string): UserRole {
  const lower = designation.toLowerCase();
  if (MANAGER_DESIGNATIONS.has(lower)) return "manager";
  if (lower.includes("content writer") || lower.includes("writer")) return "writer";
  return "designer";
}

const SEED_VERSION = "v2";

function loadMembers(): StoredMember[] {
  try {
    const seeded = localStorage.getItem("team-members-seed");
    const raw = localStorage.getItem("team-members");
    if (raw && seeded === SEED_VERSION) return JSON.parse(raw) as StoredMember[];
    // Seed version mismatch — reset to defaults
    localStorage.setItem("team-members", JSON.stringify(DEFAULT_MEMBERS));
    localStorage.setItem("team-members-seed", SEED_VERSION);
  } catch {}
  return DEFAULT_MEMBERS;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => false,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      // Clean up old data to free space
      localStorage.removeItem("task-uploads"); // Old blob storage
      const stored = localStorage.getItem("auth-user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user && pathname !== "/login") router.replace("/login");
    if (user && pathname === "/login") router.replace("/");
  }, [user, ready, pathname]);

  const login = (email: string, password: string): boolean => {
    if (password !== "1234") return false;
    const members = loadMembers();
    const match = members.find(
      (m) => m.email.toLowerCase() === email.toLowerCase().trim() && !m.paused
    );
    if (!match) return false;
    const authUser: AuthUser = {
      id: match.id,
      name: match.name,
      email: match.email,
      designation: match.designation,
      role: designationToRole(match.designation),
      photo: match.photo,
    };
    setUser(authUser);
    try {
      localStorage.setItem("auth-user", JSON.stringify(authUser));
    } catch (e) {
      // If quota exceeded, clear old upload metadata and try again
      if (e instanceof Error && e.message.includes("quota")) {
        try {
          localStorage.removeItem("task-upload-meta");
          localStorage.setItem("auth-user", JSON.stringify(authUser));
        } catch {
          console.error("Failed to save auth-user even after clearing cache");
        }
      }
    }
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth-user");
    router.replace("/login");
  };

  if (!ready) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
