import type { StatusStripItem } from '../data/content.types';
import { LiveDot } from '../ui/LiveDot';

export function StatusStrip({ items }: { readonly items: readonly StatusStripItem[] }) {
  return (
    <dl className="status-strip">
      {items.map((item) => (
        <div className="status-strip__row" key={item.id}>
          <dt className="status-strip__label mono-label">
            <LiveDot tone={item.tone} />
            {item.label}
          </dt>
          <dd className="status-strip__value mono-value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
