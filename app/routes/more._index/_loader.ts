interface Experience {
  from?: string;
  to?: string;
  where?: string;
  skills?: string[];
  positions?: string[];
  summary?: string;
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
      skills: ['Go', 'React', 'PostgreSQL', 'MicroServices', 'node.js', 'Docker'],
      summary:
        'Fully automated cybersecurity awareness training program that tailors training for every person onboarded in an organization, through artificial intelligence, machine learning, distributed micro-services, and cutting edge frontend, all the while mainting minimal configurability allowing IT-Admins as well as customers to remain secured with minimal interruption in their day-to-day activites.',
    },
    {
      from: '2023',
      positions: ['VP of Engineering'],
      summary:
        "Responsible for all code written and deployed by company, as well as the functionality and functioning of Pistachio's systems. " +
        'Managed developers and team members of the tech team, and hiring new members to work at Pistachio, while working with other stakeholders in the company to deliver on Pistachios vision.',
    },
    {
      from: '2022',
      positions: ['Lead Architect'],
      summary:
        'Responsible for building and maintaining backend and frontend applications, and making key decisions on overall architecture of all technical systems. ' +
        'Worked on establishing processes for the team on how development work should be distributed on the team.',
    },
    {
      from: '2020',
      to: '2022',
      where: 'Aller Media',
      skills: ['React', 'svelte', 'Go', 'PostgreSQL', 'MicroServices'],
      summary:
        'One of Norways largest Media conglomerates housing a range of brands such as Dagbladet, Se&Hør, Børsen and more. ' +
        'Worked with a range of systems, all from frontend applications to structuring recommender-systems and serving content realtime.',
    },
    {
      from: '2022',
      positions: ['Lead Architect'],
      summary:
        'Overall architectural responsibility for Aller Media distributed apps, both frontend apps and backend apps.',
    },
    {
      from: '2021',
      positions: ['Lead Developer'],
      summary:
        'Decision-making around frontend apps and what direction it should go, as well as expanding on newer areas like including new frameworks as svelte.',
    },
    {
      from: '2020',
      positions: ['Developer'],
      summary:
        "Worked on Aller Medias widespread media business' website on expanding their CMS and interconnected frontends",
    },
    {
      from: '2019',
      to: '2020',
      where: 'Knowit Experience',
      skills: ['C#', 'vue.js', 'EpiServer', 'React', 'C#', 'Xamarin.Forms'],
      summary:
        'Inhouse consultancy in Oslo focusing on C#, EpiServer, and cross-platform mobile-apps, with a strong ideal of delivering all disciplines in a development-cycle, all from design, to analytics, to development.',
    },
    {
      positions: ['System Developer'],
      summary:
        'Full time system developer, fullstack at Knowit Experience Oslo. ' +
        'Worked on projects spanning from the Norwegian National Gallery, Bademiljø, PPFinans, and Norsirk. All EpiServer apps, with varying React or Vue.js frontends, with Norsirk using ServiceFabric for micro-serivce architecture.',
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
      from: '2016',
      where: 'UNINETT',
      positions: ['Summer intern', 'Part time developer'],
      skills: ['JavaScript', 'Docker', 'PHP', 'Go'],
      summary:
        'Developed client-integrations for dataporten (OAuth2.0 openID provider), as well as containerizing these solutions. ' +
        'Integrations ranged form SimpleSAML2, WordPress, to OmniAuth. Worked a summer internship that spanned into an internship along side studies to keep expanding integrations.',
    },
  ];

  const skills = [
    'Go',
    'React',
    'PostgreSQL',
    'MicroServices',
    'Docker',
    'Node.js',
    'JavaScript',
    'HTML5',
    'CSS3',
    'Svelte',
    'mongodb',
    'PHP',
    'C#',
    'vue.js',
  ];

  const educations: Education[] = [
    {
      from: '2013',
      to: '2018',
      where: 'NTNU Trondheim, Norway',
      grades: [
        {
          title: 'Masters, Informatics',
          grade: 'B',
        },
        {
          title: 'Bachelors, Informatics',
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
