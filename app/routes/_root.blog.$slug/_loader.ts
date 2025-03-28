import fs from 'node:fs';
import Markdoc from '@markdoc/markdoc';
import toml from 'toml';
import type { Route } from './+types/route';

export async function BlogLoader({ params }: Route.LoaderArgs) {
  const { slug } = params;
  const files = fs.readdirSync('./app/content');
  if (!files.includes(`${slug}.md`)) {
    throw new Error('nono');
  }

  const c = fs.readFileSync(`./app/content/${slug}.md`, 'utf8');
  const ast = Markdoc.parse(c);
  const meta = toml.parse(ast.attributes.frontmatter);
  const content = Markdoc.transform(ast);

  return { meta, content };
}
