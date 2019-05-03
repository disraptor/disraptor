import { popupAjaxError } from 'discourse/lib/ajax-error';
import { generateRouteId } from '../lib/generate-route-id';

/**
 * Disraptor front end controller.
 *
 * Responsible for configuring Disraptor routes and transferring them to the back end.
 */
export default Ember.Controller.extend({
  /**
   * Needs to match the filename of `assets/javascripts/discourse/models/disraptor/route.js.es6`.
   *
   * Determines the HTTP end point to which AJAX requests will me made. Note that the endpoint
   * will have any dashes (i.e. `-`) replaced with underscores (i.e. `_`) and that it will be
   * pluralized: `disraptor/route` becomes `disraptor/routes`.
   *
   * **Example HTTP requests**:
   *
   * - GET /disraptor/routes
   * - GET /disraptor/routes/:route_id
   * - PUT /disraptor/routes/:route_id
   * - DELETE /disraptor/routes/:route_id
   */
  endPoint: 'disraptor/route',

  requestMethods: ['get', 'head', 'post', 'put', 'delete', 'options', 'trace'],
  routeRequestMethod: 'get',
  routeSourcePath: '',
  routeTargetUrl: '',
  routeCreatedMessage: '',

  normalizedRequestMethod: Ember.computed('routeRequestMethod', function () {
    return this.get('routeRequestMethod').trim().toLowerCase();
  }),

  normalizedSourcePath: Ember.computed('routeSourcePath', function () {
    return this.normalizePath(this.get('routeSourcePath').trim());
  }),

  normalizedTargetUrl: Ember.computed('routeTargetUrl', function () {
    const targetUrl = this.get('routeTargetUrl').trim();

    try {
      const url = new URL(targetUrl);
      return url.href + (url.pathname.endsWith('/') ? '' : '/');
    } catch (_) {
      return '';
    }
  }),

  routeId: Ember.computed('normalizedRequestMethod', 'normalizedSourcePath', function () {
    // Hash the source path (e.g. /example) to obtain a number that can be
    // used as an ID for the store. This intentionally creates a conflict when
    // attemtping to create a route for the same path twice.
    const requestMethod = this.get('normalizedRequestMethod');
    const sourcePath = this.get('normalizedSourcePath');

    return generateRouteId(requestMethod, sourcePath);
  }),

  sourcePathIsInvalid: Ember.computed('normalizedSourcePath', function () {
    const path = this.get('normalizedSourcePath');

    return path.startsWith('/latest') || path.startsWith('/admin');
  }),

  normalizePath(path) {
    const sourcePath = path.replace(/\/+/g, '/');

    const pathSegments = [];
    for (const segment of sourcePath.split('/')) {
      if (segment === '..') {
        pathSegments.pop();
      } else if (segment !== '') {
        pathSegments.push(segment);
      }
    }

    if (pathSegments.length === 0) {
      return '/';
    }

    return '/' + pathSegments.join('/').replace(/\/$/, '');
  },

  init() {
    this._super();

    this.set('routesLoading', true);
    this.set('routes', []);

    // Populates the list of active routes
    this.store.findAll(this.endPoint)
      .then(response => {
        this.set('routesLoading', false);

        for (const record of response.content) {
          this.routes.pushObject({
            id: record.id,
            record: record,
            isBeingEdited: false
          });
        }
      })
      .catch(console.error);
  },

  /**
   * Adds a route to the user interface. Also removes a potentially existing route with the same
   * `sourcePath` property.
   *
   * @param {Object} route Route to add to the UI
   */
  addRoute(route) {
    const existingRoute = this.routes.findBy('id', route.record.id);
    if (existingRoute !== undefined) {
      this.routes.removeObject(existingRoute);
    }

    this.routes.pushObject(route);
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
    createRoute() {
      const id = this.get('routeId');
      const sourcePath = this.get('normalizedSourcePath');
      const targetUrl = this.get('normalizedTargetUrl');
      const requestMethod = this.get('normalizedRequestMethod');

      this.store
        .createRecord(this.endPoint, { id, sourcePath, targetUrl, requestMethod })
        .save()
        .then(result => {
          this.addRoute({
            id: result.payload.id,
            record: result.target,
            isBeingEdited: false
          });

          const successMessage = `Saved route: ${result.payload.sourcePath} → ${result.payload.targetUrl}`;
          this.set('routeCreatedMessage', successMessage);
        })
        .catch(popupAjaxError)
        .catch(() => {
          this.set('routeCreatedMessage', '');
        });
    },

    /**
     * Updates a route in the store.
     *
     * @param {*} routeRecord Record of the route to update
     */
    updateRouteRecord(routeRecord) {
      const recordProperties = {
        sourcePath: routeRecord.sourcePath,
        targetUrl: routeRecord.targetUrl,
        requestMethod: routeRecord.requestMethod
      };

      routeRecord
        .update(recordProperties)
        .then(result => {
          this.addRoute({
            id: result.payload.id,
            record: result.target,
            isBeingEdited: false
          });

          console.log('Updated route', result.payload.sourcePath, '→', result.payload.targetUrl);
        })
        .catch(error => {
          console.error('Failed to update route:', error);
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
        .destroyRecord(this.endPoint, route.record)
        .then(() => {
          this.routes.removeObject(route);
          console.log('Deleted route record', route.record.sourcePath);
        })
        .catch(error => {
          console.error('Failed to delete route record', error);
        });
    },

    /**
     * Toggles the editing state of a route.
     *
     * @param {*} route Route to toggle the editing state for
     */
    toggleEditingRoute(route) {
      Ember.set(route, 'isBeingEdited', !route.isBeingEdited);
    }
  }
});
