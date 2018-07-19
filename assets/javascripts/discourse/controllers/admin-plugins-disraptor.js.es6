import { hashString } from 'discourse/lib/hash';

/**
 * Disraptor front end controller.
 *
 * Responsible for configuring Disraptor routes and transferring them to the back end.
 */
export default Ember.Controller.extend({
  /**
   * Needs to match the filename of `assets/javascripts/discourse/models/disraptor-route.js.es6`.
   * This determines the HTTP endpoint to which AJAX requests will me made. Note that the endpoint
   * will have any dashes (i.e. `-`) replaced with underscores (i.e. `_`) and that it will be
   * pluralized:
   * `disraptor-route` becomes `disraptor_routes`.
   *
   * **Examples**:
   *
   * - GET /disraptor_routes
   * - GET /disraptor_routes/:route_id
   * - PUT /disraptor_routes/:route_id
   * - DELETE /disraptor_routes/:route_id
   */
  storeType: 'disraptor-route',

  init() {
    this._super();
    this.set('routesLoading', true);
    this.set('routes', []);

    this.store.findAll(this.storeType)
      .then(result => {
        this.set('routesLoading', false);
        for (const record of result.content) {
          this.routes.pushObject({
            sourcePath: record.sourcePath,
            record: record,
            isBeingEdited: false
          });
        }
        this.notifyPropertyChange('routes');
      })
      .catch(error => {
        console.error(error);
      });
  },

  /**
   * Adds a route to the user interface. Also removes a potentially existing route with the same
   * `sourcePath` property.
   *
   * @param {object} route
   */
  addRoute(route) {
    const existingRoute = this.routes.findBy('sourcePath', route.record.sourcePath);
    if (existingRoute) {
      this.routes.removeObject(existingRoute);
    }

    this.routes.pushObject(route);

    // Triggers Ember to rerender
    this.notifyPropertyChange('routes');
  },

  /**
   * Removes a route from the user interface.
   *
   * @param {object} route
   */
  removeRouteFromUI(route) {
    this.routes.removeObject(route);

    // Triggers Ember to rerender
    this.notifyPropertyChange('routes');
  },

  actions: {
    /**
     * Saves a record in Discourse’s store (see
     * [meta.discourse.org: Upgrading our front end models to use a store][1]) by sending either a
     * POST or PUT request depending on whether the record has an `id` property.
     *
     * If `routeRecord` has a property `id`, a PUT request will be send to the server, signifying
     * that an existing record should be updated. Otherwise, a POST request will be send, signifying
     * that a new record should be created. This is an implementation detail of Discourse’s store.
     * Note that one can create a new record even when the record contains an ID already. This is
     * necessary as we need to be able to identify routes by a common property.
     *
     * [1]: https://meta.discourse.org/t/upgrading-our-front-end-models-to-use-a-store/27837
     */
    createRoute(sourcePath, targetURL) {
      // Hash the source path (e.g. /example) to obtain a number that can be
      // used as an ID for the store. This intentionally creates a conflict when
      // attemtping to create a route for the same path twice.
      const id = hashString(sourcePath) >>> 0;

      this.store
        .createRecord(this.storeType, { id, sourcePath, targetURL })
        .save()
        .then(result => {
          this.addRoute({
            sourcePath: result.payload.sourcePath,
            record: result.target,
            isBeingEdited: false
          });

          console.log('Saved route', result.payload.sourcePath, '→', result.payload.targetURL);
        })
        .catch(error => {
          console.error('Failed to save route', error);
        });
    },

    /**
     * Updates a route in the store.
     *
     * @param {*} routeRecord
     */
    updateRouteRecord(routeRecord) {
      const recordProperties = {
        sourcePath: routeRecord.sourcePath,
        targetURL: routeRecord.targetURL
      };

      routeRecord
        .update(recordProperties)
        .then(result => {
          this.addRoute({
            sourcePath: result.payload.sourcePath,
            record: result.target,
            isBeingEdited: false
          });

          console.log('Updated route', result.payload.sourcePath, '→', result.payload.targetURL);
        })
        .catch(error => {
          console.error('Failed to update route', error);
        });
    },

    /**
     * Deletes an existing route.
     *
     * @param {*} route Route to delete
     */
    deleteRoute(route) {
      // Sends a DELETE request to the HTTP end point
      this.store
        .destroyRecord(this.storeType, route.record)
        .then(() => {
          this.removeRouteFromUI(route);
          console.log('Deleted route record', route.record.sourcePath);
        })
        .catch(error => {
          console.error('Failed to delete route record', error);
        });
    },

    /**
     * Toggles the editing state of a route.
     *
     * @param {*} route
     */
    toggleEditingRoute(route) {
      Ember.set(route, 'isBeingEdited', !route.isBeingEdited);
    }
  }
});
