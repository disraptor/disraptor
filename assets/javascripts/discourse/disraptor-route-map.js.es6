import { initializeDefaultHomepage } from 'discourse/lib/utilities';
import { defaultHomepage } from 'discourse/lib/utilities';

/**
 * Maps all paths to Disraptor’s proxy route. This route map targets two routes which both export
 * the implementation of the actual route.
 *
 * This is a workaround for a Discourse plugin’s inability to have a catch-all route based only on a
 * wildcard path segment. Discourse already has such a route, and it takes precedence of that of a
 * plugin. For more information, see:
 *
 * - guides.emberjs.com: [“Defining Your Routes”][1]
 * - meta.discourse.org: [“Plugin with catch-all wildcard route map”][2]
 * - discuss.emberjs.com: [“Override existing catch-all wildcard route”][3]
 *
 * [1]: https://guides.emberjs.com/release/routing/defining-your-routes/
 * [2]: https://meta.discourse.org/t/plugin-with-catch-all-wildcard-route-map/100348
 * [3]: https://discuss.emberjs.com/t/override-existing-catch-all-wildcard-route/15717
 */
export default function () {
  /*
   * It seems that in some version Discourse changed in what order plugin and Discourse-scripts are executed (or loaded).
   * because of this now this script executes before the default homepage is set on loading a page.
   * Later on we run into problems if the homepage is not set and that's why we do it here in case it is not set yet.
   */ 
  if (!defaultHomepage()) {
    initializeDefaultHomepage(this.site.siteSettings);
  }
  const defaultHomeRoute = `/${defaultHomepage()}`;
  this.route('disraptor-proxy.homepage', { path: defaultHomeRoute });
  this.route('disraptor-proxy.single-segment', { path: '/:path' });
  this.route('disraptor-proxy.multi-segment', { path: '/:path/*wildcard' });
}
