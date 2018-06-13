/**
 * Tells the Ember app to transition to `disraptor`. This instructs Ember to look for a file
 * `routes/disraptor.js.es6`.
 */
export default function () {
  this.route('disraptor', { path: '/:path' });
}
