import fs from 'node:fs';
import Markdoc from '@markdoc/markdoc';
import toml from 'toml';
import type { BlogMeta } from './_typtes';

export async function BlogLoader() {
  const files = fs.readdirSync('./app/content');
  const posts: BlogMeta[] = [];

  for (const file of files) {
    const c = fs.readFileSync(`./app/content/${file}`, 'utf8');
    const ast = Markdoc.parse(c);
    const meta = toml.parse(ast.attributes.frontmatter);
    const content = Markdoc.transform(ast);
    console.log({ ast, content, meta });

    posts.push({ ...meta, slug: file.replace('.md', '') });
  }

  return posts;
}
