const SITE_URL = "https://kasperrt.me";
const PERSON_ID = `${SITE_URL}/#person`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const PERSON_DESCRIPTION =
  "CTO, cofounder, and software engineer in Oslo working with AI security, Go, React, TypeScript, PostgreSQL, product engineering, and web architecture.";

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
    givenName: "Kasper",
    familyName: "Rynning-Tønnesen",
    alternateName: "kasperrt",
    description: PERSON_DESCRIPTION,
    url: SITE_URL,
    image: absoluteUrl("/me-small.png"),
    email: "mailto:kasper@rynning-toennesen.email",
    jobTitle: ["CTO", "Cofounder", "Software Engineer"],
    worksFor: {
      "@type": "Organization",
      name: "embroidery",
      url: "https://embroidery.io",
    },
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: "Norwegian University of Science and Technology",
      alternateName: "NTNU",
      url: "https://www.ntnu.no",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Oslo",
      addressCountry: "NO",
    },
    sameAs: ["https://github.com/kasperrt", "https://www.linkedin.com/in/kasperrt/"],
    knowsAbout: [
      "AI security",
      "AI agents",
      "Software engineering",
      "TypeScript",
      "Go",
      "React",
      "PostgreSQL",
      "Web architecture",
      "Product engineering",
    ],
    knowsLanguage: ["en", "no"],
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
    inLanguage: "en",
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
