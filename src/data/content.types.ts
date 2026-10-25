/** Types for src/data/content.ts. Every string shown on the site comes from a value of one of these types. */

export type AnchorKey =
  | 'top'
  | 'howIWork'
  | 'deployments'
  | 'architecture'
  | 'capabilities'
  | 'history'
  | 'recognition'
  | 'contact';

export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly anchor: AnchorKey;
}

export interface SiteMeta {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly location: string;
  readonly currentRole: string;
  readonly employer: string;
}

export type StripDotTone = 'amber' | 'cyan';

export interface StatusStripItem {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly tone: StripDotTone;
}

export interface HeroContent {
  readonly eyebrow: string;
  readonly headline: string;
  readonly subline: string;
  readonly primaryCta: string;
  readonly secondaryCta: string;
  readonly strip: readonly StatusStripItem[];
}

export type BootTag = 'boot' | 'ok' | 'run';

export interface BootLine {
  readonly id: string;
  readonly tag: BootTag;
  /** Left column, e.g. "operator". Empty for the first line. */
  readonly key: string;
  readonly text: string;
}

export interface PipelineStage {
  readonly id: string;
  readonly index: number;
  readonly name: string;
  /** Short tab label for the stepper rail. */
  readonly shortLabel: string;
  readonly summary: string;
  readonly artifact: string;
  /** Numbers that appear in the artifact text, shown as chips. */
  readonly numbers: readonly string[];
}

export interface HowIWorkContent {
  readonly heading: string;
  readonly lead: string;
  readonly tools: readonly string[];
  readonly toolsLine: string;
  readonly stages: readonly PipelineStage[];
}

export type DeploymentStatus = 'UAT' | 'In development' | 'Prototype delivered' | 'Scoping';

export interface Deployment {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: DeploymentStatus;
  readonly stack: readonly string[];
  /** Headline metrics; empty when the résumé gives none. */
  readonly metrics: readonly string[];
  readonly details: readonly string[];
  /** Anchor the card links to, if any (TravelDesk to the architecture section). */
  readonly link?: { readonly label: string; readonly anchor: AnchorKey };
}

export interface DeploymentsContent {
  readonly heading: string;
  readonly lead: string;
  readonly detailsLabel: string;
  readonly items: readonly Deployment[];
}

export interface ArchitectureContent {
  readonly heading: string;
  readonly lead: string;
  readonly facts: readonly string[];
  readonly proposedBanner: string;
}

export interface CapabilityGroup {
  readonly id: string;
  readonly name: string;
  readonly skills: readonly string[];
  readonly proof: string;
  readonly anchor: AnchorKey;
}

export interface CapabilitiesContent {
  readonly heading: string;
  readonly lead: string;
  readonly groups: readonly CapabilityGroup[];
}

export interface Role {
  readonly id: string;
  readonly title: string;
  readonly dates: string;
}

export interface HistoryEntry {
  readonly id: string;
  readonly company: string;
  readonly location: string;
  readonly roles: readonly Role[];
  /** Marker text such as "Promoted in 9 months"; absent when none applies. */
  readonly marker?: string;
  readonly highlights: readonly string[];
}

export interface Credential {
  readonly id: string;
  readonly title: string;
  readonly issuer: string;
  readonly dates?: string;
}

export interface Publication {
  readonly id: string;
  readonly title: string;
  readonly venue: string;
  readonly url: string;
}

export interface EducationContent {
  readonly heading: string;
  readonly degrees: readonly Credential[];
  readonly certificationsHeading: string;
  readonly certifications: readonly Credential[];
  readonly publicationHeading: string;
  readonly publication: Publication;
}

export interface HistoryContent {
  readonly heading: string;
  readonly lead: string;
  readonly entries: readonly HistoryEntry[];
  readonly education: EducationContent;
}

export interface Quote {
  readonly id: string;
  readonly author: string;
  /** Title and organisation exactly as cleared; absent when none was given. */
  readonly attribution: string;
  readonly context: string;
  /** Quote paragraphs, word for word. */
  readonly text: readonly string[];
  /** Short form shown first when the full note is behind a button. */
  readonly pull?: string;
  /** Bullet list shown instead of full text (Ekart), followed by text. */
  readonly bullets?: readonly string[];
}

export interface RecognitionContent {
  readonly heading: string;
  readonly lead: string;
  readonly readFullLabel: string;
  readonly quotes: readonly Quote[];
}

export interface ContactContent {
  readonly heading: string;
  readonly lead: string;
  readonly badge: string;
  readonly email: string;
  readonly phone: string;
  readonly phoneHref: string;
  readonly location: string;
  readonly linkedin: string;
  readonly github: string;
  readonly resumeLabel: string;
  readonly resumePath: string;
  readonly resumeFileName: string;
  /** Caption under the download button; update with the file. */
  readonly resumeMeta: string;
}

export interface SiteContent {
  readonly meta: SiteMeta;
  readonly nav: readonly NavItem[];
  readonly hero: HeroContent;
  readonly boot: readonly BootLine[];
  readonly howIWork: HowIWorkContent;
  readonly deployments: DeploymentsContent;
  readonly architecture: ArchitectureContent;
  readonly capabilities: CapabilitiesContent;
  readonly history: HistoryContent;
  readonly recognition: RecognitionContent;
  readonly contact: ContactContent;
  readonly footer: { readonly backToTop: string };
}

/* Architecture diagram model (traveldesk-architecture.ts) */

export type ArchNodeKind = 'frontend' | 'gateway' | 'domain' | 'integration' | 'integration-phase2';
export type ArchEdgeKind = 'call' | 'event' | 'phase2';
export type ArchStatus = 'proposed' | 'confirmed';

export interface ArchGroup {
  readonly id: string;
  readonly label: string;
  readonly kinds: readonly ArchNodeKind[];
}

export interface ArchNode {
  readonly id: string;
  readonly label: string;
  readonly kind: ArchNodeKind;
  readonly role: string;
}

export interface ArchEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: ArchEdgeKind;
}

export interface ArchitectureModel {
  readonly status: ArchStatus;
  readonly groups: readonly ArchGroup[];
  readonly nodes: readonly ArchNode[];
  readonly edges: readonly ArchEdge[];
}
