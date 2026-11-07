/**
 * Curated background gallery for project kanban boards (admin/team selectable).
 * All URLs point at the Unsplash CDN (landscape photography, high resolution).
 * The URL list doubles as a server-side allowlist: only these URLs (or null)
 * may be persisted on a project.
 */

export interface GalleryImage {
  /** Stable slug (also the alt/text label). */
  id: string;
  name: string;
  url: string;
  thumb: string;
}

function unsplash(id: string, width: number, quality: number): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=${quality}`;
}

const SOURCE_IDS: Array<[id: string, name: string]> = [
  ["1506905925346-21bda4d32df4", "Alpine ridge"],
  ["1464822759023-fed622ff2c3b", "Rocky summits"],
  ["1441974231531-c6227db76b6e", "Sunlit forest"],
  ["1470071459604-3b5ec3a7fe05", "Misty valley"],
  ["1501785888041-af3ef285b470", "Alpine lake sunset"],
  ["1470770841072-f978cf4d019e", "Lakeside cabin"],
  ["1472214103451-9374bd1c798e", "Golden field"],
  ["1493246507139-91e8fad9978e", "Pastel mountains"],
  ["1454496522488-7a8e488e8606", "Snowy peaks"],
  ["1507525428034-b723cf961d3e", "Tropical beach"],
  ["1500530855697-b586d89ba3ee", "Open road dusk"],
  ["1519681393784-d120267933ba", "Starry mountains"],
  ["1458668383970-8ddd3927deed", "Mirror lake"],
  ["1447752875215-b2761acb3c5d", "Emerald forest"],
  ["1475924156734-496f6cac6ec1", "Sunset pier"],
  ["1505142468610-359e7d316be0", "Ocean waves"],
  ["1483728642387-6c3bdd6c93e5", "Summit trail"],
  ["1465056836041-7f43ac27dcb5", "Forest road"],
  ["1439066615861-d1af74d74000", "Quiet lake"],
  ["1469474968028-56623f02e42e", "Sunrise hills"],
];

export const BACKGROUND_GALLERY: GalleryImage[] = SOURCE_IDS.map(([id, name]) => ({
  id,
  name,
  url: unsplash(id, 1600, 80),
  thumb: unsplash(id, 480, 70),
}));

const ALLOWED_URLS = new Set<string>(BACKGROUND_GALLERY.map((g) => g.url));

/** Server-side allowlist: a project may only store gallery URLs (or null). */
export function isAllowedBackgroundUrl(url: unknown): url is string {
  return typeof url === "string" && ALLOWED_URLS.has(url);
}
