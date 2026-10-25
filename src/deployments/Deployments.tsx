import { content } from '../data/content';
import { SectionIntro } from '../how/SplitTitle';
import { Section } from '../ui/Section';
import { DeploymentCard } from './DeploymentCard';
import './Deployments.css';

export function Deployments() {
  const { deployments } = content;
  return (
    <Section anchor="deployments" className="stage-world deploy">
      <SectionIntro anchor="deployments" heading={deployments.heading} lead={deployments.lead} />
      <div className="deploy-grid">
        {deployments.items.map((item, index) => (
          <DeploymentCard key={item.id} deployment={item} index={index} primary={index === 0} />
        ))}
      </div>
    </Section>
  );
}
