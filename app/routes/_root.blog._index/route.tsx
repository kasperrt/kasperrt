import { Link } from 'react-router';
import type { Route } from './+types/route';
import { BlogLoader } from './_loader';
import { BlogMeta } from './_meta';

export const loader = BlogLoader;
export const meta = BlogMeta;

export default function BlogRoot({ loaderData }: Route.ComponentProps) {
  return (
    <div className="mt-10 flex flex-col gap-y-6 pr-6 pl-5 md:w-2/5">
      <h1 className="text-2xl font-bold">blog</h1>
      {loaderData.map((post) => (
        <Link key={post.slug} to={`/blog/${post.slug}`}>
          <h2 className="font-semibold">{post.title}</h2>
          <h3 className="font-extralight">{post.published}</h3>
          <p className="font-light">{post.description}</p>
        </Link>
      ))}
    </div>
  );
}
