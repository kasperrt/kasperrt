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
        "A fully automated cybersecurity awareness training program that adapts to each individual in your organization using AI, machine learning, and distributed microservices — all wrapped in a cutting-edge frontend. It's designed to require minimal setup, keeping both IT admins and end users secure without disrupting their day-to-day work.",
    },
    {
      from: '2023',
      positions: ['VP of Engineering'],
      summary:
        "Responsible for all code written and deployed at the company, as well as the overall functionality and performance of Pistachio's systems. Led the tech team — managing developers, hiring new team members, and working closely with other stakeholders to deliver on Pistachio's vision.",
    },
    {
      from: '2022',
      positions: ['Lead Architect'],
      summary:
        'Responsible for building and maintaining both backend and frontend applications, while making key decisions on the overall architecture of all technical systems. Also helped establish team processes for how development work should be planned and distributed.',
    },
    {
      from: '2020',
      to: '2022',
      where: 'Aller Media',
      skills: ['React', 'svelte', 'Go', 'PostgreSQL', 'MicroServices'],
      summary:
        "One of Norway's largest media conglomerates, home to brands like Dagbladet, Se&Hør, Børsen, and more. Worked across a wide range of systems — from frontend applications to designing recommender systems and delivering real-time content.",
    },
    {
      from: '2022',
      positions: ['Lead Architect'],
      summary:
        "Held overall architectural responsibility for Aller Media's distributed applications — both frontend and backend.",
    },
    {
      from: '2021',
      positions: ['Lead Developer'],
      summary:
        'Led decision-making around frontend applications and their strategic direction, including exploring and adopting newer frameworks like Svelte.',
    },
    {
      from: '2020',
      positions: ['Developer'],
      summary:
        "Worked on Aller Media's expansive media network, focusing on extending their CMS and integrating interconnected frontend platforms.",
    },
    {
      from: '2019',
      to: '2020',
      where: 'Knowit Experience',
      skills: ['C#', 'vue.js', 'EpiServer', 'Entity Framework', 'React', 'Xamarin.Forms'],
      summary:
        'In-house consultancy in Oslo focused on C#, Episerver, and cross-platform mobile apps. Emphasized delivering across the full development cycle — from design and development to analytics — all under one roof.',
    },
    {
      positions: ['System Developer'],
      summary:
        'Full-time system developer at Knowit Experience Oslo. Worked on projects for the Norwegian National Gallery, Bademiljø, PPFinans, and Norsirk — all using Episerver, with frontends built in React or Vue.js. Norsirk also utilized ServiceFabric for a microservice architecture.',
    },
    {
      from: '2018',
      positions: ['Summer Internship'],
      summary:
        'Led the setup of a mobile banking solution for yABank, working full-stack to develop and implement the backend infrastructure. Focused on seamless integration between the backend systems and the mobile app, ensuring a smooth and secure user experience.',
    },
    {
      from: '2017',
      positions: ['Summer Internship'],
      summary:
        'Developed a mobile app in Xamarin.Forms for LOS Energy, designed to display real-time power consumption data. Integrated the app with third-party services to provide personalized power consumption advice, enhancing user engagement and energy efficiency.',
    },
    {
      from: '2016',
      where: 'UNINETT',
      positions: ['Summer intern', 'Part time developer'],
      skills: ['JavaScript', 'Docker', 'PHP', 'Go'],
      summary:
        'Developed client integrations for Dataporten (OAuth2.0/OpenID provider), while also containerizing these solutions for scalability and ease of deployment. The integrations spanned various platforms, including SimpleSAML2, WordPress, and OmniAuth. Initially started as a summer internship, which evolved into a longer-term role alongside my studies.',
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
    'HTML',
    'CSS',
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
