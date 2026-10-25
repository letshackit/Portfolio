import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { content } from '../data/content';
import { DeploymentCard } from '../deployments/DeploymentCard';

describe('DeploymentCard', () => {
  it('toggles aria-expanded and the controlled region on click', () => {
    render(<DeploymentCard deployment={content.deployments.items[0]} index={0} />);
    const btn = screen.getByRole('button', { name: content.deployments.detailsLabel });
    const region = document.getElementById(btn.getAttribute('aria-controls') ?? '');
    expect(region).not.toBeNull();
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(region).toHaveAttribute('hidden');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(region).not.toHaveAttribute('hidden');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows no metrics list for a card without metrics', () => {
    const none = content.deployments.items[4];
    render(<DeploymentCard deployment={none} index={4} />);
    expect(screen.queryByRole('list', { name: content.ui.metricsLabel })).toBeNull();
  });
});
