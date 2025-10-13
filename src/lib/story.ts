// src/lib/story.ts
import { API_BASE } from '../services/env';

export type Story = {
  id: string;
  title?: string;
  nodes?: any[];
  edges?: any[];
};

export async function loadStory(id: string): Promise<Story> {
  // Try API first; fall back to a harmless stub so the UI won't explode.
  try {
    const res = await fetch(`${API_BASE}/stories/${encodeURIComponent(id)}`);
    if (res.ok) return (await res.json()) as Story;
  } catch {
    // ignore network issues; we'll return a local stub
  }
  return { id, title: 'New Story', nodes: [], edges: [] };
}
