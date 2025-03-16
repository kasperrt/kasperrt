interface Experience {
  from: string;
  to?: string;
  where?: string;
  positions: string[];
  summary: string;
}

interface Education {
  from: string;
  to: string;
  where: string;
  grades: { title: string; grade: string }[];
}

export function CVLoader() {
  const experiences: Experience[] = [
    {
      from: '2022',
      to: 'Present',
      where: 'Pistachio',
      positions: ['2023- VP of Engineering', '2022- Lead Architect'],
      summary:
        'Developed the Pistachio platform, helping with the next generation of security awareness, and help education people about the threats that exists. Worked with expanding the distributed micro-service architecture, improving content-delivery, remix/react frontend, securing simulation pages, as well as decisions on scoring algorithms.',
    },
    {
      from: '2020',
      to: '2022',
      where: 'Aller Media',
      positions: ['2022- Lead Architect', '2021- Lead Developer', '2020- Developer'],
      summary:
        'One of Norways largest Media conglomerates housing a range of brands such as Dagbladet, Se&Hør, Børsen and more. Worked with a range of systems, all from frontend applications to structuring recommender-systems and serving content realtime.',
    },
    {
      from: '2019',
      to: '2020',
      where: 'Knowit Experience',
      positions: ['System Developer'],
      summary:
        'Full time system developer, fullstack at Knowit Experience Oslo. Worked on projects spanning from the Norwegian National Gallery, Bademiljø, PPFinans, and Norsirk. All EpiServer apps, with varying React or Vue.js frontends, with Norsirk using ServiceFabric for micro-serivce architecture.',
    },
    {
      from: '2018',
      positions: ['Summer Internship'],
      summary:
        'Setup a mobile banking solution for yABank, working full-stack on backend solution for integrating with mobile app.',
    },
    {
      from: '2017',
      positions: ['Summer Internship'],
      summary:
        'Made a mobile app in Xamarin.Forms for LOS Energy, displaying power consumption and integrating with third parties on power-consumption advice.',
    },
    {
      from: '2017',
      to: '2016',
      where: 'UNINETT',
      positions: ['Summer intern', 'Part time developer'],
      summary:
        'Developed client-integrations for dataporten (OAuth2.0 openID provider), as well as containerizing these solutions. Integrations ranged form SimpleSAML2, WordPress, to OmniAuth. Worked a summer internship that spanned into an internship along side studies to keep expanding integrations.',
    },
  ];

  const skills = [
    'Go',
    'React',
    'PostgreSQL',
    'JavaScript',
    'MicroServices',
    'node.js',
    'svelte',
    'HTML5',
    'CSS3',
    'C#',
    'vue.js',
    'solid.js',
  ];

  const educations: Education[] = [
    {
      from: '2013',
      to: '2018',
      where: 'NTNU Trondheim',
      grades: [
        {
          title: 'Masters, Informatics [2018]',
          grade: 'B',
        },
        {
          title: 'Bachelors, Informatics [2016]',
          grade: 'C',
        },
      ],
    },
  ];

  return {
    experiences,
    skills,
    educations,
  };
}
