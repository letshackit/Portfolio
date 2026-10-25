import { Component, type ReactNode } from 'react';

interface ThreeBoundaryProps {
  readonly onError: () => void;
  readonly children: ReactNode;
}

interface ThreeBoundaryState {
  readonly failed: boolean;
}

/** Catches a render-time throw from the 3D scene; the frame then falls back to the SVG with no message (FR-57). */
export class ThreeBoundary extends Component<ThreeBoundaryProps, ThreeBoundaryState> {
  state: ThreeBoundaryState = { failed: false };

  static getDerivedStateFromError(): ThreeBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    if (import.meta.env.DEV) console.warn('3D scene failed, using the fallback', error);
    this.props.onError();
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
