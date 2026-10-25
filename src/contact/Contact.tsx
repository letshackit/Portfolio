import { content } from '../data/content';
import { Button } from '../ui/Button';
import { ExternalLink } from '../ui/ExternalLink';
import { Section } from '../ui/Section';
import { SectionHeading } from '../ui/SectionHeading';
import { StatusBadge } from '../ui/StatusBadge';
import './Contact.css';

/** "https://github.com/letshackit" shown as "github.com/letshackit". */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

export function Contact() {
  const { contact, ui } = content;
  return (
    <Section anchor="contact">
      <SectionHeading anchor="contact" heading={contact.heading} lead={contact.lead} />
      <div className="contact-panel corner-ticks">
        <div className="contact-panel__main">
          <StatusBadge variant="live" size="lg">
            {contact.badge}
          </StatusBadge>
          <dl className="contact-list">
            <div className="contact-list__row">
              <dt className="mono-label">{ui.contactEmail}</dt>
              <dd>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </dd>
            </div>
            <div className="contact-list__row">
              <dt className="mono-label">{ui.contactPhone}</dt>
              <dd>
                <a href={contact.phoneHref}>{contact.phone}</a>
              </dd>
            </div>
            <div className="contact-list__row">
              <dt className="mono-label">{ui.contactLocation}</dt>
              <dd>{contact.location}</dd>
            </div>
            <div className="contact-list__row">
              <dt className="mono-label">{ui.contactLinkedin}</dt>
              <dd>
                <ExternalLink href={contact.linkedin} icon>
                  {displayUrl(contact.linkedin)}
                </ExternalLink>
              </dd>
            </div>
            <div className="contact-list__row">
              <dt className="mono-label">{ui.contactGithub}</dt>
              <dd>
                <ExternalLink href={contact.github} icon>
                  {displayUrl(contact.github)}
                </ExternalLink>
              </dd>
            </div>
          </dl>
        </div>
        <div className="contact-panel__side">
          <Button variant="primary" href={contact.resumePath} download={contact.resumeFileName}>
            {contact.resumeLabel}
          </Button>
          <Button variant="secondary" href={contact.linkedin} external>
            {ui.openLinkedin}
          </Button>
          <p className="mono-caption">{contact.resumeMeta}</p>
        </div>
      </div>
    </Section>
  );
}
