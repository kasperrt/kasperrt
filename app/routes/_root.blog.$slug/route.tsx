import Markdoc from '@markdoc/markdoc';
import React from 'react';
import type { Route } from './+types/route';
import { BlogLoader } from './_loader';
import { BlogMeta } from './_meta';

export const loader = BlogLoader;
export const meta = BlogMeta;

export default function BlogRoot({ loaderData: { meta, content } }: Route.ComponentProps) {
  return (
    <div className="mt-10 flex flex-col gap-y-6 pr-6 pl-5 md:w-2/5">
      <h1 className="text-2xl font-bold">{meta.title}</h1>
      <h3 className="font-extralight">{meta.published}</h3>
      {Markdoc.renderers.react(content, React)}
    </div>
  );
}
