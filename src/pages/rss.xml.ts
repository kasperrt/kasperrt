import type { APIContext } from "astro";
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { blogIndexMeta } from "~/data/meta";

export async function GET(context: APIContext) {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  const items = posts
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
    .map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.slug}`,
    }));

  return rss({
    title: blogIndexMeta.title,
    description: blogIndexMeta.description,
    site: new URL("/blog", context.site ?? context.url.origin).toString(),
    items,
    customData: "<language>en-us</language>",
  });
}
