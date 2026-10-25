import { content } from '../data/content';
import { Section } from '../ui/Section';
import { SectionHeading } from '../ui/SectionHeading';
import { QuoteCard } from './QuoteCard';
import './Recognition.css';

export function Recognition() {
  const { recognition } = content;
  return (
    <Section anchor="recognition">
      <SectionHeading anchor="recognition" heading={recognition.heading} lead={recognition.lead} />
      <div className="quote-grid">
        {recognition.quotes.map((quote) => (
          <QuoteCard key={quote.id} quote={quote} />
        ))}
      </div>
    </Section>
  );
}
