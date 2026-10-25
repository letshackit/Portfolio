/**
 * THE content file. Every string, number and link shown on the site lives here (FR-3).
 * Source of truth: .sdlc/00-inputs/resume.md and testimonials.md. If a number is not in the résumé, it does not go here (FR-142).
 * Hand-synced elsewhere: the <title>, meta description, JSON-LD and <noscript> block in index.html must be updated by hand when this changes.
 * Confidentiality: the HRIS vendor is only ever "the incumbent enterprise HRIS" or "an HRIS vendor". One client quote is not cleared and is not here.
 * Glyph rule (ADR-004): type only latin characters; arrows and dots are drawn, not typed.
 */
import type { SiteContent } from './content.types';

export const content: SiteContent = {
  meta: {
    name: 'Harshal Saraogi',
    title: 'Harshal Saraogi — AI-native builder and Product Manager',
    description:
      'Harshal Saraogi embeds with enterprise teams, builds working platforms with AI agents, and hands them to engineers. Open to Forward Deployed Engineer roles.',
    url: 'https://harshalsaraogi.com/',
    location: 'Delhi NCR, India',
    currentRole: 'Product Manager I',
    employer: 'Paytm',
  },

  ui: {
    skipLink: 'Skip to content',
    monogram: 'HS',
    navLabel: 'Sections',
    pipelineCaption: 'Pipeline · 7 stages',
    deploymentPrefix: 'Deployment',
    stackLabel: 'Stack',
    metricsLabel: 'Key figures',
    artifactLabel: 'Artifact',
    stageListLabel: 'Seven stages from research to deploy',
    heroStagesLabel: 'Pipeline graphic stages, select one to read it below',
    connectsTo: 'Connects to',
    proofLabel: 'Proof',
    degreesHeading: 'Degrees',
    journalLabel: 'Open the journal PDF',
    factsLabel: 'Architecture facts',
    archGroupsLabel: 'TravelDesk services by layer',
    contactEmail: 'Email',
    contactPhone: 'Phone',
    contactLocation: 'Location',
    contactLinkedin: 'LinkedIn',
    contactGithub: 'GitHub',
    openLinkedin: 'Open LinkedIn',
  },

  palette: {
    dialogLabel: 'Command palette',
    inputLabel: 'Type a command',
    placeholder: 'Type a command…',
    empty: 'No matching command',
    groupNavigate: 'NAVIGATE',
    groupActions: 'ACTIONS',
    goTo: 'Go to',
    goToTop: 'Go to top',
    topHint: '#top',
    resume: 'Download résumé',
    resumeHint: 'PDF',
    copyEmail: 'Copy email',
    linkedinHint: 'NEW TAB',
    emailCopied: 'Email copied',
    copyBlocked: 'Copy is blocked here',
    copyFallbackLead: 'Your browser blocked copying. Select the address below.',
    writeEmail: 'Write an email',
    footerHint: 'UP/DOWN MOVE · ENTER RUN · ESC CLOSE',
    openPalette: 'Open command palette',
    menu: 'MENU',
    menuClose: 'Close menu',
    menuPalette: 'COMMAND PALETTE',
    copyButton: 'Copy email',
    bootLabel: 'Site starting',
    bootAnnounce: 'The site is starting. Press Skip or any key to continue.',
    skip: 'SKIP',
    skipHint: 'ANY KEY',
  },

  nav: [
    { id: 'how-i-work', label: 'How I work', anchor: 'howIWork' },
    { id: 'deployments', label: 'Deployments', anchor: 'deployments' },
    { id: 'architecture', label: 'Architecture', anchor: 'architecture' },
    { id: 'capabilities', label: 'Capabilities', anchor: 'capabilities' },
    { id: 'history', label: 'History', anchor: 'history' },
    { id: 'recognition', label: 'Recognition', anchor: 'recognition' },
    { id: 'contact', label: 'Contact', anchor: 'contact' },
  ],

  hero: {
    eyebrow: 'BUILDER-PM · OPEN TO FORWARD DEPLOYED ENGINEER ROLES',
    headline: 'Embedded with the enterprise. Shipping with AI agents.',
    subline:
      'I work inside the business, scope the problem, and build the first working version myself with Claude Code, Cursor and Codex. Then I hire and lead the engineers who scale it.',
    primaryCta: 'See deployments',
    secondaryCta: 'Download résumé',
    strip: [
      { id: 'deployed', label: 'DEPLOYED', value: 'Paytm · Telco SaaS & AI Platforms', tone: 'amber' },
      {
        id: 'platforms',
        label: 'PLATFORMS',
        value: '3 in flight: TravelDesk (UAT) · BSS (in development) · HRMS (scoping)',
        tone: 'amber',
      },
      { id: 'team', label: 'TEAM', value: '16+ engineers led', tone: 'cyan' },
    ],
  },

  boot: [
    { id: 'boot', tag: 'boot', key: '', text: 'harshalsaraogi.com' },
    { id: 'operator', tag: 'ok', key: 'operator', text: 'Harshal Saraogi, Product Manager I @ Paytm' },
    {
      id: 'pipeline',
      tag: 'ok',
      key: 'pipeline',
      text: '7 stages: research > PRD > UX > prototype > Jira/Confluence > QA/UAT > deploy',
    },
    {
      id: 'deployments',
      tag: 'ok',
      key: 'deployments',
      text: '5 loaded: 1 UAT · 1 in development · 1 prototype delivered · 2 scoping',
    },
    { id: 'team', tag: 'ok', key: 'team', text: '16+ engineers led' },
    { id: 'status', tag: 'run', key: 'status', text: 'deployed: Paytm Telco SaaS' },
  ],

  howIWork: {
    heading: 'I build what I spec.',
    lead: '',
    tools: ['Claude Code', 'Cursor', 'Codex'],
    toolsLine: 'Claude Code · Cursor · Codex',
    stages: [
      {
        id: 'research',
        index: 1,
        name: 'Research',
        shortLabel: 'Research',
        summary: 'Market and vendor study before anything is scoped.',
        artifact:
          'HRMS market study across 12+ vendors (Keka, greytHR, ZingHR, Zoho, Rippling, HiBob, BambooHR, Deel), benchmarked against Workday, Darwinbox and the incumbent enterprise HRIS.',
        numbers: [{ value: '12+', label: 'vendors studied' }],
      },
      {
        id: 'prd',
        index: 2,
        name: 'PRD',
        shortLabel: 'PRD',
        summary: 'The full requirement set, written before build.',
        artifact:
          'TravelDesk 116-page master PRD: travel requests, multi-level approvals, booking coordination, expense claims, OCR receipt capture, policy validation, reimbursement workflow, notifications, admin controls. Also the HRMS 461-page, 13-module PRD.',
        numbers: [
          { value: '116', label: 'pages, TravelDesk PRD' },
          { value: '461', label: 'pages, HRMS PRD' },
          { value: '13', label: 'modules, HRMS PRD' },
        ],
      },
      {
        id: 'ux',
        index: 3,
        name: 'UX',
        shortLabel: 'UX',
        summary: 'The product and its screens, designed before code.',
        artifact:
          '"Obsidian Command" design system and a configurable Configuration Engine, generated with Codex (HRMS). Complete product and UX design for BSS.',
        numbers: [],
      },
      {
        id: 'prototype',
        index: 4,
        name: 'Prototype',
        shortLabel: 'Prototype',
        summary: 'A working prototype is the alignment artifact, not a slide deck.',
        artifact:
          'Cloud Commerce: 8-module working Node.js prototype built in Cursor within 3 months. It became the reference design for the SAP-to-cloud migration.',
        numbers: [
          { value: '8', label: 'modules in the prototype' },
          { value: '3', label: 'months to build it' },
        ],
      },
      {
        id: 'jira-confluence',
        index: 5,
        name: 'Jira and Confluence',
        shortLabel: 'Jira + Confluence',
        summary: 'Work broken into stories a team can pick up.',
        artifact:
          'TravelDesk: about 94 source stories consolidated into 56 Jira-ready stories across 10 epics, with Confluence specs.',
        numbers: [
          { value: '94', label: 'source stories' },
          { value: '56', label: 'Jira-ready stories' },
          { value: '10', label: 'epics' },
        ],
      },
      {
        id: 'qa-uat',
        index: 6,
        name: 'QA and UAT',
        shortLabel: 'QA + UAT',
        summary: 'Quality and security gates before anything ships.',
        artifact:
          'TravelDesk in organisational UAT. QA coverage and UAT readiness defined per release. Infosec review gates.',
        numbers: [],
      },
      {
        id: 'deploy',
        index: 7,
        name: 'Deploy',
        shortLabel: 'Deploy',
        summary: 'Ship it, then hand it to a team.',
        artifact:
          'TravelDesk MVP built and deployed solo, now led by a six-engineer team (2 backend, 2 frontend, 2 QA). BSS: about 60% of the build delivered personally, from local dev to deployment, before hiring the team.',
        numbers: [
          { value: '6', label: 'engineers led: 2 backend, 2 frontend, 2 QA' },
          { value: '60%', label: 'of the BSS build delivered personally' },
        ],
      },
    ],
  },

  deployments: {
    heading: 'Deployments',
    lead: 'Five platforms, scoped and built inside Paytm. Status is the real status.',
    detailsLabel: 'Details',
    items: [
      {
        id: 'traveldesk',
        name: 'TravelDesk',
        description:
          'Corporate travel and expense reimbursement platform. Conceived, architected and built solo.',
        status: 'UAT',
        stack: ['Next.js', 'Spring Boot', 'Microservices', 'Multi-tenant', 'OCR'],
        metrics: ['116-page PRD', '18 microservices', '56 stories across 10 epics', '6-engineer team'],
        details: [
          'Phase-1 production rollout targeted Jan 2027.',
          'Integrated with the enterprise HRIS, Quest2Travel and SAP.',
          'Mobile web app and Phase-2 integrations (EBIX forex, Recharge) scoped around infosec review gates.',
        ],
        link: { label: 'See the architecture', anchor: 'architecture' },
      },
      {
        id: 'hrms',
        name: 'HRMS',
        description:
          'In-house HR management system to replace the incumbent enterprise HRIS for about 50,000 employees.',
        status: 'Scoping',
        stack: ['Modular monolith', 'Postgres', 'Event bus', 'Transactional outbox', 'Codex'],
        metrics: ['~50,000 employees', '461-page, 13-module PRD', '12+ vendors studied', '5 satellite services'],
        details: [
          'India compliance scoped end to end: PF, ESI, PT, LWF, TDS, gratuity, Labour Codes, DPDP Act.',
          'Gap analysis found Performance Management is the critical-path module blocking Compensation Planning.',
          'Designed to be productised beyond Paytm.',
          'UI prototype covers the core HR flows.',
        ],
      },
      {
        id: 'bss',
        name: 'BSS',
        description: 'Telco business support system.',
        status: 'In development',
        stack: ['Node.js', 'Jira', 'Confluence'],
        metrics: ['~60% of build delivered personally'],
        details: [
          'Designed the complete product and UX, built the working Node.js prototype, set up Jira and Confluence.',
          'Then hired and onboarded a dedicated engineering team.',
        ],
      },
      {
        id: 'cloud-commerce',
        name: 'Cloud Commerce',
        description: 'SaaS prototype for SAP-to-cloud migration (Paytm Telco).',
        status: 'Prototype delivered',
        stack: ['Node.js', 'Cursor', 'SAP-to-cloud'],
        metrics: ['8 modules', '3 months', '100+ APIs scoped', '~1 month of discovery and build cut'],
        details: [
          'Scoped integration touchpoints, service boundaries and admin and product modules.',
          'Became the reference design for the migration strategy.',
        ],
      },
      {
        id: 'ai-operations',
        name: 'AI Operations platform',
        description: 'Platform for chatbots, digital avatars and IVR journeys.',
        status: 'Scoping',
        stack: ['Local SLMs', 'OCR pipelines', 'RBAC'],
        metrics: [],
        details: [
          'Scoped chatbots, digital avatars, IVR journeys, bot configuration, conversation orchestration, RBAC, analytics and reporting, and third-party integrations.',
          'Started evaluating locally hosted small language models and OCR pipelines for lower inference cost, data privacy and less dependence on external LLM APIs.',
        ],
      },
    ],
  },

  architecture: {
    heading: 'TravelDesk: 18 services, built solo.',
    lead: 'Hover or focus a service to light up what it talks to.',
    facts: [
      'Front end: Next.js.',
      'Gateway: Spring Boot API gateway.',
      'Domain services: 16.',
      'Tenancy: multi-tenant from day one.',
      'Integrations: the enterprise HRIS, Quest2Travel and SAP.',
      'Phase 2: EBIX forex and Recharge.',
      'Build: MVP built and deployed solo with AI-assisted development.',
    ],
    proposedBanner: 'SERVICE NAMES PROPOSED — PENDING CONFIRMATION',
  },

  capabilities: {
    heading: 'Capabilities',
    lead: '',
    groups: [
      {
        id: 'product',
        name: 'Product',
        skills: [
          'discovery',
          'market research',
          'MVP scoping',
          'PRDs/BRDs',
          'roadmaps',
          'user journeys',
          'user stories',
          'acceptance criteria',
          'prioritisation',
          'launch planning',
          'stakeholder governance',
        ],
        proof: '461-page, 13-module HRMS PRD, benchmarked across 12+ vendors.',
        anchor: 'deployments',
      },
      {
        id: 'technical',
        name: 'Technical',
        skills: [
          'system design',
          'API design and contracts',
          'data modelling',
          'microservices and modular monoliths',
          'NFRs',
          'AWS',
          'GCP',
          'SAP-to-cloud migration',
          'OCR pipelines',
          'local SLMs',
        ],
        proof: '18-microservice TravelDesk architecture. 100+ APIs scoped for Cloud Commerce.',
        anchor: 'architecture',
      },
      {
        id: 'ai-native-build',
        name: 'AI-native build',
        skills: [
          'Claude Code',
          'Cursor',
          'OpenAI Codex',
          'prompt engineering',
          'agentic development workflows',
          'Node.js',
          'Next.js',
          'JavaScript',
          'Python',
          'PostgreSQL',
          'MongoDB',
          'MySQL',
        ],
        proof: 'TravelDesk MVP built and deployed solo with AI-assisted development.',
        anchor: 'howIWork',
      },
      {
        id: 'delivery',
        name: 'Delivery and tools',
        skills: [
          'Jira',
          'Confluence',
          'Figma',
          'Kanban and Scrum',
          'QA/UAT',
          'release management',
          'infosec review gates',
          'GA4',
          'GTM',
        ],
        proof: '16+ engineers led across Kanban streams. 98% on-time across 20+ concurrent client programmes.',
        anchor: 'history',
      },
    ],
  },

  history: {
    heading: 'Deployment history',
    lead: '',
    entries: [
      {
        id: 'paytm',
        company: 'Paytm (One97 Communications)',
        location: 'Noida',
        roles: [
          { id: 'pm1', title: 'Product Manager I, Telco SaaS, Cloud Commerce and AI Platforms', dates: 'Apr 2026 — present' },
          { id: 'apm', title: 'Associate Product Manager', dates: 'Jul 2025 — Mar 2026' },
        ],
        marker: 'Promoted in 9 months',
        highlights: [
          'Owns strategy, scoping and delivery for Cloud Commerce, BSS, TravelDesk, HRMS and the AI Operations platform.',
          'Leads execution for 16+ engineers across Kanban streams.',
          'Leads technical scoping: API contracts, data models, service boundaries, NFRs.',
        ],
      },
      {
        id: 'hippo',
        company: 'Hippo Innovations',
        location: 'Gurugram',
        roles: [
          { id: 'spa', title: 'Senior Project Associate, Product Development', dates: 'Dec 2023 — Jul 2025' },
        ],
        highlights: [
          '50+ business use cases turned into PRDs, journeys and roadmaps for 5+ cloud products on AWS and Google Cloud.',
          'Introduced structured QA and UAT gates.',
          'Primary product contact for enterprise storefront clients including Amul and SBI Life.',
        ],
      },
      {
        id: 'ans',
        company: 'ANS Commerce (Flipkart Group)',
        location: 'Gurugram',
        roles: [
          {
            id: 'sapm',
            title: 'Senior Associate Project Manager, Product Development',
            dates: 'Jun 2023 — Dec 2023',
          },
          {
            id: 'apm',
            title: 'Associate Project Manager, Web Applications and Product Delivery',
            dates: 'Sep 2022 — May 2023',
          },
        ],
        marker: 'Promoted in 9 months',
        highlights: [
          'Led roadmap execution for in-house commerce platforms Kartify and Flipshop.',
          'PRDs for Shop by Color, MoEngage, Bose, ITC Fiama D2C and Ekart Logistics.',
          'Recognised in writing by ITC, Ekart and Alma Mater.',
        ],
      },
      {
        id: 'adsrole',
        company: 'AdsRole',
        location: 'Noida',
        roles: [
          { id: 'am', title: 'Assistant Manager, Product Delivery and Web Projects', dates: 'Jun 2021 — May 2022' },
        ],
        highlights: [
          '20+ concurrent client programmes with 98% on-time completion.',
          'Weekly calls with US, UK and Australian stakeholders.',
        ],
      },
    ],
    education: {
      heading: 'Education and certifications',
      degrees: [
        {
          id: 'pgp',
          title: 'PG Program in Artificial Intelligence and Machine Learning',
          issuer: 'IIIT Bangalore',
          dates: 'Nov 2023 — Aug 2025',
        },
        {
          id: 'bca',
          title: 'Bachelor of Computer Applications',
          issuer: 'Asian School of Business, Noida',
          dates: 'Aug 2019 — Apr 2022',
        },
      ],
      certificationsHeading: 'Certifications',
      certifications: [
        { id: 'google-pm', title: 'Foundations of Project Management', issuer: 'Google' },
        { id: 'ibm-python', title: 'Python for Data Science', issuer: 'IBM' },
        { id: 'niit-cloud', title: 'Executive Certification in Cloud Computing', issuer: 'NIIT' },
        { id: 'iso27001', title: 'ISO/IEC 27001 Information Security Associate', issuer: 'SkillFront' },
        { id: 'ga360', title: 'Google Analytics 360', issuer: 'Google' },
      ],
      publicationHeading: 'Publication',
      publication: {
        id: 'blue-brain',
        title: 'Blue Brain: The Stimulation Algorithm',
        venue: 'ABS International Journal of Management',
        url: 'https://absjournal.abs.edu.in/ABS-Journal-Volume-9-isuue-2december-2021/article-5.pdf',
      },
    },
  },

  recognition: {
    heading: 'Recognition',
    lead: 'Written by clients, published as written.',
    readFullLabel: 'Read the full note',
    quotes: [
      {
        id: 'itc',
        author: 'Ankita Mahapatra',
        attribution:
          'Brand Manager – Fiama Innovations & DTC, Personal Care Business Division, ITC Ltd.',
        context: 'Fiama D2C website · ANS Commerce',
        pull: 'No matter what, you have always been extremely helpful & patient in adding each and every functionality… would not have been possible had it not been for your relentless effort.',
        text: [
          'It has been a great experience working with you on the Fiama D2C website development! We have had our timeline clashes, recurring issues cropping up on website, or me demanding new functionalities for the website – no matter what, you have always been extremely helpful & patient in adding each and every functionality into the website. The entire bulk of the tasks, and the minute checks through each & every page of the website would have not been possible had it not been for your relentless effort & incessant pushing. However, I am glad that we reached this stage now where the website is up & running and its pretty!',
          "Don't think for a second that your job is done – we still have a long way to go to make our website perfect! But I know that in every step you will always be there to help & guide me through every step of the way. Here is to cheers to all the work we have done so far, and all the work we will do together in the future!",
        ],
      },
      {
        id: 'whites',
        author: 'Abdulhamid Imam',
        attribution: 'Whites',
        context: 'Substore order functionality · Hippo Innovations',
        text: [
          'I extend my gratitude to you and your team members for the exceptional effort you dedicated to working on the store Substore order functionality within a limited timeframe and under short notice. The completion and deployment of this task would not have been achievable without the hard work and commitment that you and your team have demonstrated. Thank you for your dedication!',
        ],
      },
      {
        id: 'amul',
        author: 'Kaushal Parmar',
        attribution: 'GCMMF Ltd. (Amul), Anand',
        context: 'StoreHippo services · Hippo Innovations',
        text: [
          'Writing to share sincere appreciation for the outstanding support provided by Store Hippo over the past year. Your proactive assistance and willingness to address numerous queries (both tech & general ones) have been invaluable. Time and again, you have ensured that we have the information and query resolution that we needed to move forward successfully. Thank you once again for your hard work and dedication!',
        ],
      },
      {
        id: 'ekart',
        author: 'Rohit Sharma',
        attribution: 'Director, Ekart',
        context: 'Ekart Logistics project · ANS Commerce',
        bullets: [
          'Requirements and tweaks which we discovered along the way were well addressed',
          'Single POC coordinated well with all ANS internal teams',
          'Guidance and suggestions received from Shashi, Harshal and other team members',
        ],
        text: [
          'Overall it has been a good project and happy to be a positive customer willing to speak well of ANS and its team. Looking forward to build this together down the line.',
        ],
      },
      {
        id: 'alma-mater',
        author: 'Sachin Sahni',
        attribution: 'CEO, Alma Mater Store Pvt. Ltd.',
        context: 'New website · ANS Commerce',
        text: [
          'Really appreciate the work done by ANS team on our new website. Quick response to our queries and issues has really been amazing. Keep up the good work!',
        ],
      },
    ],
  },

  contact: {
    heading: 'Contact',
    lead: 'Email is the fastest channel.',
    badge: 'Open to Forward Deployed Engineer roles',
    email: 'saraogiharshal@gmail.com',
    phone: '+91 84478 56889',
    phoneHref: 'tel:+918447856889',
    location: 'Delhi NCR, India',
    linkedin: 'https://www.linkedin.com/in/harshal-saraogi-b07260194/',
    github: 'https://github.com/letshackit',
    resumeLabel: 'Download résumé',
    resumePath: '/Harshal_Saraogi_Resume.pdf',
    resumeFileName: 'Harshal_Saraogi_Resume.pdf',
    resumeMeta: 'PDF · October 2026 · 0.4 MB',
  },

  footer: { backToTop: 'Back to top' },
};
