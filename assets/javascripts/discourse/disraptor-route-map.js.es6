/**
 * Instructs Ember to render the “disraptor” template (i.e. `routes/disraptor.js.es6`) for all
 * paths.
 *
 * Note: A plain wildcard route will not work here as Discourse already has a wildcard route that
 * seems to take precedence. For more information, see [“Defining Your Routes”][1].
 *
 * [1]: https://guides.emberjs.com/release/routing/defining-your-routes/
 */
export default function () {
  // Workaround for simple catch-all `*path` not working
  this.route('disraptor', { path: '/:path' }, function () {
    this.route('disraptor', { path: '*wildcard' });
  });
}
