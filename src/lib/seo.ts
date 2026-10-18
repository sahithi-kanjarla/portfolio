// Everything search engines and AI answer engines read about the site lives
// here: titles, descriptions, the share image, and the structured data that
// says who Sahithi is. None of it changes what's on screen.

export const SITE_URL = "https://www.somehowliving.tech";
export const OG_IMAGE = `${SITE_URL}/og.png`;

export const NAME = "Sahithi Kanjarla";
export const ABOUT_SHORT =
  "Sahithi Kanjarla is a Hyderabad-based software engineer (B.Tech CSE 2026) building AI and real-time apps: document AI, RAG over audio and video, and agentic AI.";

export const PROFILES = [
  "https://www.linkedin.com/in/sahithi-kanjarla-569025289/",
  "https://github.com/sahithi-kanjarla",
];

export const person = {
  "@type": "Person",
  "@id": `${SITE_URL}/#person`,
  name: NAME,
  alternateName: ["Sahithi"],
  url: SITE_URL,
  image: OG_IMAGE,
  email: "mailto:sahithikanjarla4082@gmail.com",
  jobTitle: "Software Engineer",
  description: ABOUT_SHORT,
  address: { "@type": "PostalAddress", addressLocality: "Hyderabad", addressCountry: "IN" },
  knowsAbout: [
    "AI agents",
    "Retrieval-augmented generation",
    "Document AI",
    "Computer vision",
    "Full-stack development",
    "IoT",
  ],
  sameAs: PROFILES,
};

// Turn a JSON-LD object into a <script> entry for a route's head.
export const jsonLd = (data: Record<string, unknown>) => ({
  type: "application/ld+json",
  children: JSON.stringify({ "@context": "https://schema.org", ...data }),
});

// The standard set of tags for a page: title, description, canonical address
// and the share card.
export function pageMeta({ title, description, path }: { title: string; description: string; path: string }) {
  const url = `${SITE_URL}${path}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "professionally curious. personally chaotic. — Sahithi Kanjarla" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
