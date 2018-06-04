/**
 * Disraptor front end controller.
 *
 * Responsible for configuring Disraptor routes and transferring them to the back end.
 */
export default Ember.Controller.extend({
  /**
   * Needs to match the filename of `assets/javascripts/discourse/models/route.js.es6`.
   * This determines the HTTP endpoint to which AJAX requests will me made.
   *
   * **Examples** (note the automatic plural form):
   *
   * - GET /routes
   * - PUT /routes/:route_id
   * - DELETE /routes/:route_id
   */
  endPoint: 'route',

  init() {
    this._super();
    this.set('routesLoading', true);
    this.set('routes', []);

    this.store.findAll(this.endPoint)
      .then(result => {
        this.set('routesLoading', false);
        this.set('routes', result.content);
        this.notifyPropertyChange('routes');
      })
      .catch(error => {
        console.error(error);
      });
  },

  actions: {
    /**
     * Creates a new route and stores it in the so-called store (see
     * [meta.discourse.org: Upgrading our front end models to use a store][1]).
     *
     * [1]: https://meta.discourse.org/t/upgrading-our-front-end-models-to-use-a-store/27837
     */
    createRoute() {
      const sourcePath = this.get('routeSourcePath');
      // Hash the source path (e.g. /example) to obtain a number that can be
      // used as an ID for the store. This intentionally create a conflict when
      // attemtping to create a route for the same path twice.
      const routeId = hashCode(sourcePath);

      const recordProperties = {
        id: routeId,
        sourcePath,
        targetURL: this.get('routeTargetURL')
      };

      const routeRecord = this.store.createRecord(this.endPoint, recordProperties);
      console.log('Creating route', routeRecord.sourcePath, '→', routeRecord.targetURL);

      // Sends a PUT request to the HTTP end point
      routeRecord.save()
        .then(result => {
          // The RestModel doesn’t always return a result object including a
          // reference to the record.
          if (result.target) {
            // Once the record was successfully saved, set its isNew property to false.
            // This is crucial if it should be deleted afterwards.
            result.target.set('isNew', false);
          }

          this.routes.pushObject(routeRecord);
          // Triggers Ember to rerender
          this.notifyPropertyChange('routes');
          console.log('Created route', routeRecord.sourcePath, '→', routeRecord.targetURL);
        })
        .catch(error => {
          console.error('Failed to create route', error);
        });
    },

    /**
     * Deletes an existing route.
     *
     * @param {*} routeRecord Record of the route to delete
     */
    deleteRoute(routeRecord) {
      console.log('Deleting route', routeRecord.sourcePath);

      // Sends a DELETE request to the HTTP end point
      this.store.destroyRecord(this.endPoint, routeRecord)
        .then(() => {
          // this.set('routes', this.routes.filter(record => record !== routeRecord));
          this.routes.removeObject(routeRecord);
          // Triggers Ember to rerender
          this.notifyPropertyChange('routes');
          console.log('Deleted route', routeRecord.sourcePath);
        })
        .catch(error => {
          console.error('Failed to delete route', error);
        });
    }
  }
});

/**
 * Basic, non-cryptographic hash function.
 *
 * @param {String} input
 */
function hashCode(input) {
  let hash = 0;

  if (input.length === 0) {
    return hash;
  }

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    // Convert to 32bit integer
    hash = hash & hash;
  }

  return hash;
}
