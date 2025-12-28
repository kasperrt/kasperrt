import { readdirSync, readFileSync } from "node:fs";
import frontmatter from "front-matter";
import type { SitemapItem } from "@astrojs/sitemap";
import type { BlogPost } from "~/schemas/blog";
import type { Experience, Skills, Education } from "~/schemas/more";

const BLOG_DIR = "./src/content/blog/";
const MORE_DIR = "./src/content/more/";

function getLatestDate(current: Date | null, next?: Date | null | string): Date | null {
  if (!next) {
    return current;
  }

  const nextDate = new Date(next);
  if (!current) {
    return nextDate;
  }

  if (nextDate.getTime() > current.getTime()) {
    return nextDate;
  }

  return current;
}

function getLatestDateFromMore(): string | null {
  const files = readdirSync(MORE_DIR, { recursive: true });
  let lastmod: Date | null = null;

  for (const fileName of files) {
    if (typeof fileName !== "string") {
      continue;
    }

    if (!fileName.endsWith(".md")) {
      continue;
    }

    const file = readFileSync(`${MORE_DIR}${fileName}`, "utf8");
    const { attributes } = frontmatter<Experience | Skills | Education>(file);
    if (!("from" in attributes || "to" in attributes)) {
      continue;
    }

    const { from, to } = attributes;

    lastmod = getLatestDate(lastmod, from);
    lastmod = getLatestDate(lastmod, to);
  }

  if (!lastmod) {
    return null;
  }

  return lastmod.toISOString();
}

function getLatestBlogDate(): string | null {
  const files = readdirSync(BLOG_DIR);
  let lastmod: Date | null = null;

  for (const fileName of files) {
    if (!fileName.endsWith(".md")) {
      continue;
    }

    const file = readFileSync(`${BLOG_DIR}${fileName}`, "utf8");
    const { attributes } = frontmatter<BlogPost>(file);
    lastmod = getLatestDate(lastmod, attributes.pubDate);
  }

  if (!lastmod) {
    return null;
  }

  return lastmod.toISOString();
}

function getBlogPostDate(fileName: string): string | null {
  const file = readFileSync(`${BLOG_DIR}${fileName}.md`, "utf8");
  const { attributes } = frontmatter<BlogPost>(file);
  if (!attributes.pubDate) {
    return null;
  }

  return new Date(attributes.pubDate).toISOString();
}

interface SiteMapSerialize {
  site: string;
}

export function createSitemapSerialize({ site }: SiteMapSerialize) {
  return async (item: SitemapItem): Promise<SitemapItem> => {
    if (item.url === `${site}/more/`) {
      const lastmod = getLatestDateFromMore();
      if (!lastmod) {
        return item;
      }

      return {
        ...item,
        lastmod,
      };
    }

    if (item.url.startsWith(`${site}/blog/`)) {
      let fileName = item.url.replace(`${site}/blog/`, "");
      fileName = fileName.substring(0, fileName.length - 1);

      if (!fileName) {
        const lastmod = getLatestBlogDate();
        if (!lastmod) {
          return item;
        }

        return {
          ...item,
          lastmod,
        };
      }

      const lastmod = getBlogPostDate(fileName);
      if (!lastmod) {
        return item;
      }

      return {
        ...item,
        lastmod,
      };
    }

    return item;
  };
}
