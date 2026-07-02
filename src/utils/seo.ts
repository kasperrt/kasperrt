const SITE_URL = "https://kasperrt.me";
const PERSON_ID = `${SITE_URL}/#person`;
const WEBSITE_ID = `${SITE_URL}/#website`;

interface BlogPostingJsonLd {
  canonicalUrl: string;
  dateModified?: Date;
  datePublished: Date;
  description: string;
  headline: string;
  image: string;
}

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function createPersonJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: "Kasper Rynning-Tønnesen",
    alternateName: "kasperrt",
    url: SITE_URL,
    image: absoluteUrl("/me-small.png"),
    email: "mailto:kasper@rynning-toennesen.email",
    jobTitle: "CTO and Software Engineer",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Oslo",
      addressCountry: "NO",
    },
    sameAs: ["https://github.com/kasperrt", "https://www.linkedin.com/in/kasperrt/"],
    knowsAbout: [
      "Software engineering",
      "TypeScript",
      "Go",
      "React",
      "PostgreSQL",
      "Web architecture",
      "Product engineering",
    ],
  };
}

export function createWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: "Kasper Rynning-Tønnesen",
    url: SITE_URL,
    author: {
      "@id": PERSON_ID,
    },
    publisher: {
      "@id": PERSON_ID,
    },
    inLanguage: "en",
  };
}

export function createProfilePageJsonLd(url: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${url}#profile`,
    url,
    name: "Kasper Rynning-Tønnesen",
    description,
    isPartOf: {
      "@id": WEBSITE_ID,
    },
    mainEntity: {
      "@id": PERSON_ID,
    },
  };
}

export function createBlogPostingJsonLd({
  canonicalUrl,
  dateModified,
  datePublished,
  description,
  headline,
  image,
}: BlogPostingJsonLd) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${canonicalUrl}#article`,
    headline,
    description,
    image,
    datePublished: datePublished.toISOString(),
    dateModified: (dateModified ?? datePublished).toISOString(),
    author: {
      "@id": PERSON_ID,
    },
    publisher: {
      "@id": PERSON_ID,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    isPartOf: {
      "@type": "Blog",
      "@id": `${SITE_URL}/blog/#blog`,
      name: "Software Engineering Blog | Kasper Rynning-Tønnesen",
      url: `${SITE_URL}/blog/`,
    },
    inLanguage: "en",
  };
}
