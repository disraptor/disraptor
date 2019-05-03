import RestModel from 'discourse/models/rest';

/**
 * Has to be implemented for `../controllers/admin-plugins-disraptor.js.es6` in order to use
 * Discourse’s store properly.
 *
 * When extending `RestModel`, the methods `createProperties` and `updateProperties` need to be
 * implemented.
 *
 * `RestModel` is implemented in
 * `$discourseDir/app/assets/javascripts/discourse/models/rest.js.es6`.
 */
export default RestModel.extend({
  /**
   * Required when sending POST requests via Discourse’s store
   */
  createProperties() {
    return this.getProperties('sourcePath', 'targetUrl', 'requestMethod');
  },

  /**
   * Required when sending PUT requests via Discourse’s store
   */
  updateProperties() {
    return this.createProperties();
  }
});
