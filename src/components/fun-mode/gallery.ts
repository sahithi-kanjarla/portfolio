// Fun Mode's gallery reads from the folders inside src/assets/fun-mode/:
//
//   art/  crafts/  communities/  games/
//
// Drop .jpg/.jpeg/.png/.webp files into the matching folder and they show up
// on their own. Pictures left loose in src/assets/fun-mode/ (apart from
// well.png and basketball.webp) are treated as art.
//
// Order: every picture from every section, jumbled together, with the ones
// named in FEATURED always on top. The shuffle is seeded, so the page is the
// same on every visit.
//
// Per-picture details go in DETAILS, keyed by file name:
//   "ink study.jpg": { title: "ink study", alt: "An ink drawing of ...", note: "2026", hover: "a line for the cursor bubble" }
// `hover` is the little comment that follows the cursor, like in the main
// portfolio. Nothing has one yet.

export type Section = "games" | "art" | "crafts" | "communities";

export type GalleryItem = {
  src: string;
  alt: string;
  section: Section;
  title?: string;
  note?: string;
  hover?: string;
};

export const SECTION_ORDER: Section[] = ["games", "art", "crafts", "communities"];
export const SECTION_LABEL: Record<Section, string> = { games: "games", art: "art", crafts: "crafts", communities: "communities" };

// File names to keep at the very top, in this order (the numbered drawings; the AWS photo sits in the first row
// of the full view), and the one that always goes last. Filtered views keep the same relative order.
const FEATURED: string[] = ["1.jpeg", "aws.jpeg", "2.jpg", "3.jpeg", "4.jpeg"];
const LAST: string[] = ["end1.jpeg"];

// Per-picture details, keyed by file name. `hover` is the little comment that follows the cursor.
const DETAILS: Record<string, { title?: string; alt?: string; note?: string; hover?: string }> = {
  "1.jpeg": { alt: "A detailed colour drawing of Luffy and his Gear forms", hover: "It took me 2 days to complete it 😭" },
  "aws.jpeg": { alt: "At the AWS ideathon", hover: "2nd position AWS Ideathon 2024" },
  "gdg meets.jpeg": { alt: "A GDG team meeting late at night", hover: "Late night planning" },
  "agentcon.jpeg": { alt: "Anchoring a session room at Agentcon", hover: "Anchored a session room at Agentcon (International Event)" },
  "wtm.jpeg": { alt: "At a Google Women Techmakers event", hover: "Volunteer at Google Women Techmakers event" },
  "gdg networking session.jpeg": { alt: "A GDG on Campus networking session", hover: "First session, GDG on Campus" },
};

const files = import.meta.glob("../../assets/fun-mode/**/*.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const sectionOf = (path: string): Section => {
  const m = /assets\/fun-mode\/([^/]+)\//.exec(path);
  const folder = m?.[1]?.toLowerCase();
  return (SECTION_ORDER as string[]).includes(folder ?? "") ? (folder as Section) : "art";
};

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const items: (GalleryItem & { name: string })[] = Object.entries(files)
  .filter(([path]) => !/\/fun-mode\/(well\.png|basketball\.webp)$/.test(path))
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([path, src], index) => {
    const name = decodeURIComponent(path.split("/").pop() ?? "");
    const d = DETAILS[name];
    return {
      name,
      src,
      section: sectionOf(path),
      alt: d?.alt ?? `A little thing I've made, number ${index + 1}`,
      ...(d?.title ? { title: d.title } : {}),
      ...(d?.note ? { note: d.note } : {}),
      ...(d?.hover ? { hover: d.hover } : {}),
    };
  });

// One jumbled collage: every section mixed together (seeded, so it is the same
// on every visit), with the FEATURED pieces always at the very top.
export const GALLERY: GalleryItem[] = (() => {
  const next = rng(7919);
  const rest = items.filter((g) => !FEATURED.includes(g.name) && !LAST.includes(g.name));
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }
  const top = FEATURED.map((n) => items.find((g) => g.name === n)).filter((g): g is (typeof items)[number] => Boolean(g));
  const end = LAST.map((n) => items.find((g) => g.name === n)).filter((g): g is (typeof items)[number] => Boolean(g));
  return [...top, ...rest, ...end].map(({ name: _name, ...item }) => item);
})();
