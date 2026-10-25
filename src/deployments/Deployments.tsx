import { content } from '../data/content';
import { Section } from '../ui/Section';
import { SectionHeading } from '../ui/SectionHeading';
import { DeploymentCard } from './DeploymentCard';
import './Deployments.css';

export function Deployments() {
  const { deployments } = content;
  return (
    <Section anchor="deployments">
      <SectionHeading anchor="deployments" heading={deployments.heading} lead={deployments.lead} />
      <div className="deploy-grid">
        {deployments.items.map((item, index) => (
          <DeploymentCard key={item.id} deployment={item} index={index} primary={index === 0} />
        ))}
      </div>
    </Section>
  );
}
