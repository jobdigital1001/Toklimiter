export const CATEGORIES = [
  { slug: "software-engineering", name: "Software Engineering", icon: "code", description: "Build and scale products and platforms." },
  { slug: "product-management", name: "Product Management", icon: "rocket", description: "Shape strategy and ship what matters." },
  { slug: "design", name: "Design", icon: "palette", description: "Product, brand, and research." },
  { slug: "marketing", name: "Marketing", icon: "megaphone", description: "Growth, content, and brand." },
  { slug: "sales", name: "Sales", icon: "handshake", description: "Win and grow customer relationships." },
  { slug: "customer-success", name: "Customer Success", icon: "headset", description: "Help customers get lasting value." },
  { slug: "data-ai", name: "Data / AI", icon: "brain", description: "Data science, ML, and analytics." },
  { slug: "operations", name: "Operations", icon: "cog", description: "People, finance, and business operations." },
] as const;

type Slug = (typeof CATEGORIES)[number]["slug"];

export type TemplateSeed = {
  name: string;
  category: Slug;
  title: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  screeningQuestions: string[];
};

const BENEFITS = [
  "Competitive salary and meaningful equity",
  "Flexible hours and remote-friendly culture",
  "Comprehensive health coverage",
  "Annual learning and development budget",
  "Generous paid time off",
];

export const TEMPLATE_BENEFITS = BENEFITS;

export const TEMPLATES: TemplateSeed[] = [
  {
    name: "Software Engineer",
    category: "software-engineering",
    title: "Software Engineer",
    description:
      "We’re looking for a software engineer to design, build, and operate the systems behind our product. You’ll work across the stack with a small, senior team and own projects from idea to production.",
    responsibilities: [
      "Design, build, and maintain reliable, well-tested services and interfaces",
      "Collaborate with product and design to scope and ship features",
      "Review code and raise the quality bar for the team",
      "Improve performance, observability, and developer experience",
    ],
    requirements: [
      "3+ years of professional software engineering experience",
      "Strong fundamentals in at least one modern language and framework",
      "Experience operating production systems",
      "Clear written and verbal communication",
    ],
    skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS"],
    screeningQuestions: ["Tell us about a system you built that you’re proud of. What trade-offs did you make?"],
  },
  {
    name: "Product Manager",
    category: "product-management",
    title: "Product Manager",
    description:
      "As a product manager you’ll own a core area of our product: understanding customers deeply, setting direction, and working with engineering and design to deliver outcomes that matter.",
    responsibilities: [
      "Define product strategy and roadmap for your area",
      "Talk to customers every week and turn insight into priorities",
      "Write clear specs and align stakeholders",
      "Measure impact and iterate after launch",
    ],
    requirements: [
      "3+ years in product management for software products",
      "Track record of shipping products customers love",
      "Comfort with data and experimentation",
      "Excellent communication and stakeholder management",
    ],
    skills: ["Roadmapping", "User Research", "Analytics", "Prioritization", "SQL"],
    screeningQuestions: ["Describe a product decision you made with incomplete data. What happened?"],
  },
  {
    name: "Designer",
    category: "design",
    title: "Product Designer",
    description:
      "We’re hiring a product designer to craft experiences that feel effortless. You’ll take problems from fuzzy to shipped, partnering closely with product and engineering.",
    responsibilities: [
      "Lead end-to-end design from discovery through polished UI",
      "Prototype and test ideas with real users",
      "Contribute to and evolve our design system",
      "Advocate for accessibility and quality in every release",
    ],
    requirements: [
      "A portfolio demonstrating strong interaction and visual design",
      "3+ years designing digital products",
      "Fluency in Figma and prototyping tools",
      "Experience working directly with engineers",
    ],
    skills: ["Figma", "Prototyping", "Design Systems", "User Research", "Accessibility"],
    screeningQuestions: ["Share a link to a project you’re proud of and describe your role in it."],
  },
  {
    name: "Marketing",
    category: "marketing",
    title: "Marketing Manager",
    description:
      "You’ll own campaigns and channels that grow awareness and pipeline. This is a hands-on role for a marketer who is equally comfortable with strategy, writing, and analysis.",
    responsibilities: [
      "Plan and run multi-channel campaigns",
      "Create content that explains our product clearly",
      "Own reporting on funnel performance",
      "Partner with sales and product on launches",
    ],
    requirements: [
      "3+ years in B2B or product marketing",
      "Excellent writing and storytelling",
      "Experience with marketing automation and analytics",
      "Bias to experimentation",
    ],
    skills: ["Content Strategy", "SEO", "Lifecycle Marketing", "Analytics", "Copywriting"],
    screeningQuestions: ["Tell us about a campaign you ran and how you measured its success."],
  },
  {
    name: "Sales",
    category: "sales",
    title: "Account Executive",
    description:
      "As an account executive you’ll run the full sales cycle with companies that can benefit most from our product, from first conversation through close.",
    responsibilities: [
      "Build and manage a healthy pipeline",
      "Run discovery, demos, and negotiations",
      "Forecast accurately and keep the CRM current",
      "Feed customer insight back to product",
    ],
    requirements: [
      "2+ years of closing experience in SaaS sales",
      "Consistent attainment against quota",
      "Strong discovery and listening skills",
      "Comfort with technical products",
    ],
    skills: ["Prospecting", "Negotiation", "Salesforce", "Discovery", "Forecasting"],
    screeningQuestions: ["Walk us through a deal you’re proud of winning."],
  },
  {
    name: "Customer Success",
    category: "customer-success",
    title: "Customer Success Manager",
    description:
      "You’ll be a trusted partner to our customers, helping them adopt the product, reach their goals, and grow with us over time.",
    responsibilities: [
      "Own onboarding and adoption for a portfolio of accounts",
      "Run business reviews and success plans",
      "Identify risks early and drive renewals",
      "Champion customer feedback internally",
    ],
    requirements: [
      "2+ years in customer success or account management",
      "Empathy and strong communication skills",
      "Ability to learn technical products quickly",
      "Organized and proactive",
    ],
    skills: ["Onboarding", "Account Management", "Renewals", "Communication", "Zendesk"],
    screeningQuestions: ["Describe a time you turned an unhappy customer into an advocate."],
  },
  {
    name: "Data / AI",
    category: "data-ai",
    title: "Machine Learning Engineer",
    description:
      "Join our data and AI team to build models and pipelines that power core product experiences. You’ll take ideas from research through to reliable production systems.",
    responsibilities: [
      "Develop, evaluate, and deploy machine learning models",
      "Build data pipelines and evaluation tooling",
      "Collaborate with product teams to identify high-impact applications",
      "Monitor model quality and iterate in production",
    ],
    requirements: [
      "3+ years building ML systems or data products",
      "Strong Python and experience with modern ML frameworks",
      "Solid grounding in statistics and experimentation",
      "Experience shipping models to production",
    ],
    skills: ["Python", "PyTorch", "SQL", "MLOps", "Statistics"],
    screeningQuestions: ["Describe a model you took to production and how you evaluated it."],
  },
  {
    name: "Operations",
    category: "operations",
    title: "Operations Manager",
    description:
      "You’ll design and run the processes that keep the company moving, from planning and vendor management to the systems our team relies on every day.",
    responsibilities: [
      "Own and improve core operating processes",
      "Manage vendors, tools, and budgets",
      "Partner with finance and people teams on planning",
      "Build dashboards that keep leadership informed",
    ],
    requirements: [
      "3+ years in operations, consulting, or a similar role",
      "Structured problem solving and attention to detail",
      "Strong spreadsheet and analytical skills",
      "Comfort with ambiguity",
    ],
    skills: ["Process Design", "Project Management", "Budgeting", "Excel", "Vendor Management"],
    screeningQuestions: ["Tell us about a process you redesigned and the impact it had."],
  },
];

export const COMPANIES = [
  {
    slug: "lumen-labs",
    name: "Lumen Labs",
    tagline: "Developer tools that make AI systems observable.",
    industry: "Artificial Intelligence",
    size: "51-200",
    location: "San Francisco, CA",
    verified: true,
    highlights: ["Open-source tracing library used by 40,000+ developers", "Backed by leading AI-focused investors", "Research-friendly: 10% time for exploratory projects"],
  },
  {
    slug: "northwind-energy",
    name: "Northwind Energy",
    tagline: "Software for a faster, cleaner electricity grid.",
    industry: "Climate & Energy",
    size: "201-500",
    location: "Copenhagen, Denmark",
    verified: true,
    highlights: ["Forecasting platform live across three national grids", "Certified B Corporation", "Carbon-negative operations since 2023"],
  },
  {
    slug: "quanta-health",
    name: "Quanta Health",
    tagline: "Earlier answers through at-home diagnostics.",
    industry: "Healthcare",
    size: "51-200",
    location: "Boston, MA",
    verified: true,
    highlights: ["Clinical-grade results from a single at-home kit", "Peer-reviewed validation studies", "Clinician-in-the-loop product design"],
  },
  {
    slug: "atlas-robotics",
    name: "Atlas Robotics",
    tagline: "Warehouse robots that learn on the job.",
    industry: "Robotics & Hardware",
    size: "201-500",
    location: "Munich, Germany",
    verified: false,
    highlights: ["Fleet has moved 100M+ items", "In-house simulation environment", "Hardware and software teams under one roof"],
  },
  {
    slug: "ledgerline",
    name: "Ledgerline",
    tagline: "Real-time finance for modern businesses.",
    industry: "Fintech",
    size: "11-50",
    location: "London, UK",
    verified: true,
    highlights: ["Closes the books in hours, not weeks", "SOC 2 Type II certified", "Profitable and growing"],
  },
  {
    slug: "bloom-learning",
    name: "Bloom Learning",
    tagline: "Personalised learning paths for every student.",
    industry: "Education",
    size: "11-50",
    location: "Toronto, Canada",
    verified: false,
    highlights: ["Used in 2,000+ classrooms", "Built with teachers from day one", "Accessibility-first product principles"],
  },
  {
    slug: "cipherstack",
    name: "Cipherstack",
    tagline: "Security automation for lean engineering teams.",
    industry: "Security",
    size: "51-200",
    location: "Austin, TX",
    verified: true,
    highlights: ["Detects misconfigurations before they ship", "Founded by former incident responders", "Fully remote across 14 countries"],
  },
  {
    slug: "fieldnote",
    name: "Fieldnote",
    tagline: "The collaborative notebook for research teams.",
    industry: "SaaS",
    size: "1-10",
    location: "Lisbon, Portugal",
    verified: false,
    highlights: ["Local-first sync engine", "Loved by 500+ research teams", "Small team, big ownership"],
  },
] as const;

type JobSeed = {
  company: (typeof COMPANIES)[number]["slug"];
  template: string;
  title: string;
  level: "ENTRY" | "MID" | "SENIOR" | "LEAD" | "EXECUTIVE";
  arrangement: "REMOTE" | "HYBRID" | "ONSITE";
  type?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "TEMPORARY";
  location?: string;
  salary?: [number, number];
  featured?: boolean;
  skills?: string[];
};

export const JOBS: JobSeed[] = [
  { company: "lumen-labs", template: "Software Engineer", title: "Senior Frontend Engineer", level: "SENIOR", arrangement: "REMOTE", location: "Remote (US)", salary: [165000, 205000], featured: true, skills: ["TypeScript", "React", "Next.js", "GraphQL"] },
  { company: "lumen-labs", template: "Data / AI", title: "Machine Learning Engineer, Evaluation", level: "SENIOR", arrangement: "HYBRID", salary: [180000, 240000], featured: true },
  { company: "lumen-labs", template: "Product Manager", title: "Product Manager, Developer Platform", level: "MID", arrangement: "HYBRID", salary: [150000, 185000] },
  { company: "lumen-labs", template: "Marketing", title: "Developer Advocate", level: "MID", arrangement: "REMOTE", location: "Remote (Worldwide)", salary: [120000, 150000], skills: ["Technical Writing", "Public Speaking", "Python", "Community"] },
  { company: "northwind-energy", template: "Software Engineer", title: "Backend Engineer, Grid Forecasting", level: "MID", arrangement: "HYBRID", salary: [85000, 110000], featured: true, skills: ["Go", "PostgreSQL", "Kubernetes", "Time Series"] },
  { company: "northwind-energy", template: "Data / AI", title: "Data Scientist, Demand Modelling", level: "MID", arrangement: "ONSITE", salary: [80000, 105000] },
  { company: "northwind-energy", template: "Operations", title: "Head of Business Operations", level: "EXECUTIVE", arrangement: "ONSITE", salary: [140000, 180000] },
  { company: "northwind-energy", template: "Sales", title: "Enterprise Account Executive, Utilities", level: "SENIOR", arrangement: "REMOTE", location: "Remote (Europe)", salary: [95000, 130000] },
  { company: "quanta-health", template: "Designer", title: "Senior Product Designer", level: "SENIOR", arrangement: "HYBRID", salary: [145000, 175000], featured: true },
  { company: "quanta-health", template: "Software Engineer", title: "Full-Stack Engineer", level: "MID", arrangement: "HYBRID", salary: [135000, 165000] },
  { company: "quanta-health", template: "Customer Success", title: "Clinical Customer Success Manager", level: "MID", arrangement: "REMOTE", location: "Remote (US)", salary: [90000, 115000] },
  { company: "quanta-health", template: "Operations", title: "Lab Operations Associate", level: "ENTRY", arrangement: "ONSITE", salary: [55000, 68000] },
  { company: "atlas-robotics", template: "Software Engineer", title: "Robotics Software Engineer", level: "SENIOR", arrangement: "ONSITE", salary: [95000, 125000], featured: true, skills: ["C++", "ROS", "Python", "Motion Planning"] },
  { company: "atlas-robotics", template: "Data / AI", title: "Computer Vision Engineer", level: "MID", arrangement: "ONSITE", salary: [85000, 110000], skills: ["Python", "PyTorch", "OpenCV", "C++"] },
  { company: "atlas-robotics", template: "Product Manager", title: "Technical Product Manager, Fleet", level: "SENIOR", arrangement: "HYBRID", salary: [100000, 130000] },
  { company: "atlas-robotics", template: "Software Engineer", title: "Software Engineering Intern", level: "ENTRY", arrangement: "ONSITE", type: "INTERNSHIP", salary: [30000, 36000] },
  { company: "ledgerline", template: "Software Engineer", title: "Staff Engineer, Ledger Platform", level: "LEAD", arrangement: "HYBRID", salary: [130000, 165000], featured: true, skills: ["Rust", "PostgreSQL", "Distributed Systems", "AWS"] },
  { company: "ledgerline", template: "Sales", title: "Account Executive, Mid-Market", level: "MID", arrangement: "HYBRID", salary: [65000, 85000] },
  { company: "ledgerline", template: "Marketing", title: "Product Marketing Manager", level: "MID", arrangement: "REMOTE", location: "Remote (UK)", salary: [70000, 90000] },
  { company: "ledgerline", template: "Customer Success", title: "Implementation Specialist", level: "ENTRY", arrangement: "HYBRID", salary: [42000, 52000] },
  { company: "bloom-learning", template: "Designer", title: "Product Designer, Student Experience", level: "MID", arrangement: "REMOTE", location: "Remote (Canada)", salary: [95000, 120000] },
  { company: "bloom-learning", template: "Software Engineer", title: "Mobile Engineer (React Native)", level: "MID", arrangement: "REMOTE", location: "Remote (Americas)", salary: [110000, 140000], skills: ["React Native", "TypeScript", "iOS", "Android"] },
  { company: "bloom-learning", template: "Marketing", title: "Content Marketing Lead", level: "SENIOR", arrangement: "HYBRID", type: "PART_TIME", salary: [60000, 75000] },
  { company: "cipherstack", template: "Software Engineer", title: "Security Engineer, Detection", level: "SENIOR", arrangement: "REMOTE", location: "Remote (Worldwide)", salary: [160000, 200000], featured: true, skills: ["Go", "Cloud Security", "Kubernetes", "Threat Modeling"] },
  { company: "cipherstack", template: "Product Manager", title: "Senior Product Manager, Integrations", level: "SENIOR", arrangement: "REMOTE", location: "Remote (US)", salary: [155000, 190000] },
  { company: "cipherstack", template: "Customer Success", title: "Technical Account Manager", level: "MID", arrangement: "REMOTE", location: "Remote (US)", salary: [110000, 135000] },
  { company: "cipherstack", template: "Software Engineer", title: "Site Reliability Engineer", level: "MID", arrangement: "REMOTE", location: "Remote (Europe)", type: "CONTRACT", salary: [120000, 150000], skills: ["Terraform", "Kubernetes", "Go", "Observability"] },
  { company: "fieldnote", template: "Software Engineer", title: "Founding Engineer", level: "LEAD", arrangement: "HYBRID", salary: [90000, 120000], featured: true, skills: ["TypeScript", "CRDTs", "React", "Rust"] },
  { company: "fieldnote", template: "Designer", title: "Brand and Product Designer", level: "MID", arrangement: "REMOTE", location: "Remote (Europe)" },
  { company: "fieldnote", template: "Operations", title: "Chief of Staff", level: "SENIOR", arrangement: "ONSITE", salary: [70000, 90000] },
];
