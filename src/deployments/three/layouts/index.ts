import type { Bay } from '../../../data/deployment-bays';
import type { SceneSpec } from '../spec';
import { aiToComLayout } from './aiToCom';
import { cloudCommerceLayout } from './cloudCommerce';
import { hrmsLayout } from './hrms';
import { travelDeskLayout } from './travelDesk';

/** The scene for a bay, in the landscape or the phone arrangement. */
export function layoutFor(bay: Bay, portrait: boolean): SceneSpec {
  const opts = { portrait };
  switch (bay.id) {
    case 'traveldesk':
      return travelDeskLayout(bay.architecture, opts);
    case 'hrms':
      return hrmsLayout(bay.architecture, opts);
    case 'cloud-commerce':
      return cloudCommerceLayout(bay.architecture, opts);
    case 'ai-to-com':
      return aiToComLayout(bay.architecture, opts);
  }
}
