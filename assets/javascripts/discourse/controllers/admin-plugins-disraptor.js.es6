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
   * - GET /disraptor_route
   * - PUT /disraptor_route/:route_id
   * - DELETE /disraptor_route/:route_id
   */
  endPoint: 'disraptor-route',

  init() {
    this._super();
    this.set('routesLoading', true);
    this.set('routes', []);

    this.store.findAll(this.endPoint)
      .then(result => {
        this.set('routesLoading', false);
        for (const routeRecord of result.content) {
          this.routes.pushObject({
            sourcePath: routeRecord.sourcePath,
            record: routeRecord,
            isBeingEdited: false
          });
        }
        this.notifyPropertyChange('routes');
      })
      .catch(error => {
        console.error(error);
      });
  },

  addRoute(route) {
    const existingRoute = this.routes.findBy('sourcePath', route.record.sourcePath);
    if (existingRoute) {
      this.routes.removeObject(existingRoute);
    }

    this.routes.pushObject(route);

    // Triggers Ember to rerender
    this.notifyPropertyChange('routes');
  },

  removeRoute(route) {
    this.routes.removeObject(route);

    // Triggers Ember to rerender
    this.notifyPropertyChange('routes');
  },

  saveRecord(routeRecord) {
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

        this.addRoute({
          sourcePath: routeRecord.sourcePath,
          record: routeRecord,
          isBeingEdited: false
        });
        console.log('Saved route record', routeRecord.sourcePath, '→', routeRecord.targetURL);
      })
      .catch(error => {
        console.error('Failed to save route record', error);
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
      this.saveRecord(routeRecord);
    },

    saveRoute(route) {
      this.saveRecord(route.record);
    },

    /**
     * Deletes an existing route.
     *
     * @param {*} route Record of the route to delete
     */
    deleteRoute(route) {
      // Sends a DELETE request to the HTTP end point
      this.store.destroyRecord(this.endPoint, route.record)
        .then(() => {
          this.removeRoute(route);
          console.log('Deleted route record', route.record.sourcePath);
        })
        .catch(error => {
          console.error('Failed to delete route record', error);
        });
    },

    toggleEditingRoute(route) {
      Ember.set(route, 'isBeingEdited', !route.isBeingEdited);
    },

    startEditingRoute(route) {
      Ember.set(route, 'isBeingEdited', true);
      this.notifyPropertyChange('routes');
    },

    stopEditingRoute(route) {
      Ember.set(route, 'isBeingEdited', false);
      this.notifyPropertyChange('routes');
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
