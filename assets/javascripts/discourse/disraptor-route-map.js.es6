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
  This check to see whether the plugin is enabled might not be necessary in the future.
  For any updates on this, check:
  https://meta.discourse.org/t/plugin-route-map-loaded-even-when-it-s-disabled/114725

  In particular, the following PR needs to be merged (scheduled for Discourse 2.4):
  https://github.com/discourse/discourse/pull/7566
  */
  if (this.site.siteSettings['disraptor_enabled']) {
    const defaultHomeRoute = `/${defaultHomepage()}`;
    this.route('disraptor-proxy.homepage', { path: defaultHomeRoute });
    this.route('disraptor-proxy.single-segment', { path: '/:path' });
    this.route('disraptor-proxy.multi-segment', { path: '/:path/*wildcard' });
  }
}
