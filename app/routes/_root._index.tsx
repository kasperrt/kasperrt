import { NavLink } from 'react-router';
import type { Route } from './+types/_root._index';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'kasper rynning-tønnesen' },
    {
      name: 'description',
      content: "hi, i'm kasper and welcome to my webpage 👋",
    },
  ];
}

export default function Index() {
  return (
    <section className="mb-[15%] flex w-2/5 flex-col gap-y-6 self-center pl-5">
      <h1 className="py-4 text-2xl font-bold">hi 👋</h1>
      <p>
        I am Kasper and I currently work as the VP of Engineering at Pistachio, a tech startup in Norway. Prior to this
        I worked as the Lead Architect at Aller Media.
      </p>
      <p>
        I have worked with a range of technologies from golang, react, postgresql - to svelte, c#, mongodb and{' '}
        <NavLink className="text-red-600" to="/cv">
          a bunch more
        </NavLink>
        .
      </p>
      <p>
        Want to get to know me or connect?
        <br />
        <a className="text-red-600" href="mailto:kasper@rynning-toennesen.email">
          kasper@rynning-toennesen.email
        </a>
      </p>
    </section>
  );
}
