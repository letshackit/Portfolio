import { Shell } from './app/Shell';
import { PrefsProvider } from './app/providers/PrefsProvider';
import { UiProvider } from './app/providers/UiProvider';

export function App() {
  return (
    <PrefsProvider>
      <UiProvider>
        <Shell />
      </UiProvider>
    </PrefsProvider>
  );
}
