export type Capability = {
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
};

export type Experience = {
  role: string;
  company: string;
  meta: string;
  period: string;
  description: string;
};

export type HighlightMetric = {
  value: string;
  label: string;
};

export type Highlight = {
  title: string;
  category: string;
  summary: string;
  focus: string;
  bullets: string[];
  metrics: HighlightMetric[];
};

export const portfolioData = {
  meta: {
    initials: "HS",
    name: "Harshal Saraogi",
    title: "Product Manager",
    subtitle: "Product Owner | AI/ML-Enabled Product Delivery",
    email: "saraogiharshal@gmail.com",
    phone: "+91 84478 56889",
    phoneHref: "tel:+918447856889",
    emailHref: "mailto:saraogiharshal@gmail.com",
    location: "Delhi NCR, India",
    locationHref: "https://www.google.com/maps/search/Delhi+NCR+India",
    linkedinHref: "https://www.linkedin.com/in/harshal-saraogi-b07260194/",
    resumePath: "/Harshal_Saraogi_Resume.pdf",
  },
  landing: {
    greeting: "Hello! I'm",
    firstName: "HARSHAL",
    lastName: "SARAOGI",
    lead: "Product Manager &",
    accentPrimary: "AI/ML",
    accentSecondary: "DELIVERY",
    basePrimary: "PRODUCT",
    baseSecondary: "STRATEGY",
  },
  about:
    "Product Manager with experience building and scaling B2B and B2C digital products across fintech, e-commerce, and cloud platform ecosystems. I work across discovery, roadmaps, user journey mapping, backlog prioritization, analytics, and AI-enabled execution to turn customer needs into scalable product outcomes.",
  capabilities: [
    {
      title: "PRODUCT STRATEGY",
      subtitle: "Discovery, PRDs, and Journey Mapping",
      description:
        "I frame problems with stakeholders and users, define requirements, and shape roadmaps that balance customer impact, business goals, and engineering feasibility.",
      tags: [
        "Product discovery",
        "Roadmapping",
        "User journeys",
        "PRDs",
        "User stories",
        "Acceptance criteria",
      ],
    },
    {
      title: "DELIVERY & INSIGHTS",
      subtitle: "AI/ML Thinking, Analytics, and Execution",
      description:
        "I run cross-functional delivery from sprint planning to launch, using analytics, API integration planning, QA collaboration, and AI tooling to improve speed and quality.",
      tags: [
        "Agile / Scrum",
        "Jira & Confluence",
        "GA4 / GTM",
        "API integrations",
        "Experimentation",
        "AI tooling",
      ],
    },
    {
      title: "UX & DESIGN THINKING",
      subtitle: "User Research, Wireframes, and Prototyping",
      description:
        "I bridge product and design by conducting user research, translating insights into wireframes and flows, and iterating with design teams to craft experiences that are intuitive and conversion-driven.",
      tags: [
        "User research",
        "Figma",
        "Wireframing",
        "Prototyping",
        "Usability testing",
        "Design systems",
      ],
    },
    {
      title: "AI / ML PRODUCT",
      subtitle: "Intelligent Features, Models, and Data Pipelines",
      description:
        "I scope AI/ML opportunities — from recommendation engines and predictive analytics to NLP and GenAI features — defining use-case briefs, data requirements, and evaluation criteria that bridge data science and product delivery.",
      tags: [
        "NLP / LLMs",
        "Predictive analytics",
        "Recommendation systems",
        "Prompt engineering",
        "Python / ML pipelines",
        "GenAI integration",
      ],
    },
  ] as Capability[],
  experience: [
    {
      role: "Associate Product Manager",
      company: "Paytm",
      meta: "Noida, India",
      period: "2025-NOW",
      description:
        "Lead discovery with business stakeholders, merchants, and end users; convert priorities into PRDs, epics, user stories, use cases, and acceptance criteria; partner with design, engineering, and QA on UX reviews, backlog readiness, API-led integrations, release progress, and launch feedback.",
    },
    {
      role: "Senior Project Associate",
      company: "Hippo Innovations Pvt. Ltd.",
      meta: "Gurugram, India",
      period: "2023-25",
      description:
        "Defined product requirements across 50+ business use cases and 5+ cloud products, improving project clarity and execution speed by 30%, increasing team productivity by 25%, reducing post-production defects by 60%, and driving 50% web traffic growth through analytics-led product improvements.",
    },
    {
      role: "Senior Project Manager",
      company: "ANS Commerce (Flipkart Group)",
      meta: "Gurugram, India",
      period: "2022-23",
      description:
        "Led roadmap execution and end-to-end delivery for Kartify and Flipshop, authored PRDs for major integrations, improved execution visibility through Jira and Confluence, and used customer feedback to raise user satisfaction by 15%.",
    },
  ] as Experience[],
  highlights: [
    {
      title: "Merchant Product Delivery",
      category: "Paytm · Fintech",
      summary:
        "Own discovery and sprint-ready product definition for merchant-facing features across requirement clarifications, UX feedback, backlog prioritization, and launch support.",
      focus:
        "PRDs, epics, use cases, acceptance criteria, UX review loops, API integration support, and release readiness.",
      bullets: [
        "Lead discovery with business stakeholders, merchants, and end users to identify pain points and product gaps.",
        "Turn product priorities into sprint-ready artifacts that engineering and QA can execute with clear scope.",
        "Use AI tools to speed up product research, prototyping, documentation, and day-to-day communication.",
      ],
      metrics: [
        { value: "Discovery", label: "Stakeholder and merchant input" },
        { value: "Sprint-ready", label: "PRDs and stories" },
        { value: "API-led", label: "Integration support" },
        { value: "AI", label: "Research acceleration" },
      ],
    },
    {
      title: "Cloud Product Portfolio",
      category: "Hippo Innovations · Platform Delivery",
      summary:
        "Managed cross-functional delivery across discovery, planning, development, QA, and launch for cloud-based products spanning multiple customer use cases.",
      focus:
        "50+ business use cases, 5+ cloud products, React/Node/Vue/Angular collaboration, analytics, SEO insights, AWS, and Google Cloud.",
      bullets: [
        "Mapped requirements and user journeys into PRDs and roadmaps that improved execution clarity and speed.",
        "Aligned engineering, QA, and business teams around prioritized workstreams and launch quality.",
        "Identified AI/ML opportunities in workflow automation, intelligent search, predictive insights, and personalization.",
      ],
      metrics: [
        { value: "50+", label: "Business use cases" },
        { value: "5+", label: "Cloud products" },
        { value: "30%", label: "Faster execution clarity" },
        { value: "60%", label: "Fewer post-prod defects" },
      ],
    },
    {
      title: "Commerce Platform Roadmaps",
      category: "ANS Commerce · E-commerce",
      summary:
        "Led delivery for in-house commerce platforms and high-impact integrations, balancing roadmap priorities with customer needs and commercial goals.",
      focus:
        "Kartify, Flipshop, reusable integration patterns, customer feedback loops, Jira, Confluence, and launch visibility.",
      bullets: [
        "Owned roadmap execution, feature prioritization, and cross-functional coordination across engineering, design, and business.",
        "Authored PRDs for integrations including Shop by Color, MoEngage, Bose, and ITC Fiama.",
        "Proposed reusable components and scalable integration patterns that accelerated feature rollouts across brands.",
      ],
      metrics: [
        { value: "2", label: "Core commerce platforms" },
        { value: "15%", label: "Higher user satisfaction" },
        { value: "PRDs", label: "Integration planning" },
        { value: "Launch", label: "Execution visibility" },
      ],
    },
    {
      title: "AI/ML Product Enablement",
      category: "Cross-Domain · AI Strategy",
      summary:
        "Identified, scoped, and championed AI/ML integration opportunities across products — from intelligent search and automation to predictive analytics and personalisation pipelines.",
      focus:
        "AI tooling, intelligent search, workflow automation, predictive insights, personalisation, and prompt engineering.",
      bullets: [
        "Mapped AI/ML opportunities to product pain points — intelligent search, recommendation engines, and churn prediction.",
        "Used generative AI tools to accelerate product research, documentation, prototyping, and stakeholder communication.",
        "Evaluated third-party AI integrations and built use-case briefs to guide engineering prioritisation and vendor selection.",
      ],
      metrics: [
        { value: "AI", label: "Research acceleration" },
        { value: "3+", label: "Use-case frameworks" },
        { value: "2×", label: "Faster documentation" },
        { value: "ML", label: "Opportunity mapping" },
      ],
    },
    {
      title: "Analytics & Growth Instrumentation",
      category: "Multi-Product · Growth",
      summary:
        "Defined and implemented analytics frameworks across product lines using GA4, GTM, and custom event tracking to drive data-informed decisions and measurable growth.",
      focus:
        "GA4, GTM, event schemas, funnel analysis, SEO insights, A/B testing frameworks, and stakeholder reporting.",
      bullets: [
        "Designed event taxonomies and GTM configurations to capture full user journeys across web and mobile surfaces.",
        "Built reporting dashboards that surfaced actionable funnel drop-off and conversion insights to leadership.",
        "Leveraged analytics findings to prioritise roadmap items, resulting in a 50% increase in web traffic across accounts.",
      ],
      metrics: [
        { value: "50%", label: "Web traffic growth" },
        { value: "GA4", label: "Analytics platform" },
        { value: "25%", label: "Team productivity gain" },
        { value: "GTM", label: "Tag management" },
      ],
    },
  ] as Highlight[],
  education: [
    "PG in Artificial Intelligence & Machine Learning, IIIT Bangalore",
    "Bachelor of Computer Applications, Asian School of Business, Noida",
  ],
  certifications: [
    "Foundation of Project Management — Google",
    "Python for Data Science — IBM",
    "Introduction to Cybersecurity — Cisco",
    "ISO/IEC 27001 Information Security Associate — SkillFront",
  ],
  research: {
    title: "Blue Brain: The Stimulation Algorithm",
    publication: "ABS International Journal of Management",
    href: "https://absjournal.abs.edu.in/ABS-Journal-Volume-9-isuue-2december-2021/article-5.pdf",
  },
  toolLabels: [
    "Jira",
    "Figma",
    "Confluence",
    "GA4",
    "GTM",
    "APIs",
    "AWS",
    "GCloud",
    "Node.js",
    "MongoDB",
    "MySQL",
    "AI/ML",
  ],
  loaderLabels: [
    "Product Manager",
    "Product Owner",
    "AI/ML Product Delivery",
    "Roadmaps & Discovery",
  ],
  closingStatement:
    "Product thinking grounded in customer insight, delivery rigor, analytics, and AI-enabled execution.",
};
