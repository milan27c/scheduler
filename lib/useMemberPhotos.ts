'use client';

import { useEffect, useState } from "react";
import { getAllMemberPhotos } from "./imageStore";

// Returns a map of memberId -> photo dataUrl, loaded from IndexedDB.
// Use this wherever member avatars are displayed.
export function useMemberPhotos(): Record<string, string> {
  const [photos, setPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    getAllMemberPhotos().then(setPhotos).catch(() => {});
  }, []);

  return photos;
}
