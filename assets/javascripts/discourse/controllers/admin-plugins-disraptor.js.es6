import Controller from '@ember/controller';
import { computed, set, action } from '@ember/object';
/** Keeping this here for now maybe this should be used instead of computed? */
// import discourseComputed from "discourse-common/utils/decorators";


import { popupAjaxError } from 'discourse/lib/ajax-error';
import { generateRouteId } from '../lib/generate-route-id';

/**
 * Disraptor front end controller.
 *
 * Responsible for configuring Disraptor routes and transferring them to the back end.
 */
export default class FrontendController extends Controller {
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
  endPoint = 'disraptor/route'

  requestMethods = [
    { name: 'get' },
    { name: 'head' },
    { name: 'post' },
    { name: 'put' },
    { name: 'delete' },
    { name: 'options' },
    { name: 'trace' }
  ]
  routeRequestMethod = 'get'
  routeSourcePath = ''
  routeTargetUrl = ''
  routeCreatedMessage = ''

  @computed("routeRequestMethod")
  get normalizedRequestMethod() {
    return this.get('routeRequestMethod').trim().toLowerCase();
  }

  @computed('routeSourcePath')
  get normalizedSourcePath() {
    return this.normalizePath(this.get('routeSourcePath').trim());
  }

  @computed('routeTargetUrl')
  get normalizedTargetUrl() {
    const targetUrl = this.get('routeTargetUrl').trim();

    try {
      const url = new URL(targetUrl);
      return url.href;
    } catch (_) {
      return '';
    }
  }

  @computed('normalizedRequestMethod', 'normalizedSourcePath')
  get routeId() {
    // Hash the source path (e.g. /example) to obtain a number that can be
    // used as an ID for the store. This intentionally creates a conflict when
    // attemtping to create a route for the same path twice.
    const requestMethod = this.get('normalizedRequestMethod');
    const sourcePath = this.get('normalizedSourcePath');

    return generateRouteId(requestMethod, sourcePath);
  }

  @computed('normalizedSourcePath')
  get sourcePathIsInvalid() {
    const path = this.get('normalizedSourcePath');

    if (path.startsWith('/admin')) {
      return true;
    }

    for (const homePagePath of this.siteSettings.top_menu.split('|')) {
      if (path.startsWith(`/${homePagePath}`)) {
        return true;
      }
    }

    return false;
  }

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
  }

  init() {
    super.init();

    this.set('routesLoading', true);
    this.set('routes', []);

    const sourcePathInvalidStart = I18n.t('disraptor.new_route.source_path.invalid')
    const sourcePathInvalidEnd = this.siteSettings.top_menu.split('|').join(', ') + ', or admin.'
    this.set('sourcePathInvalidMessage', `${sourcePathInvalidStart} ${sourcePathInvalidEnd}`)

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
  }

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
  }

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
  @action
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
  }

  /**
   * Updates a route in the store.
   *
   * @param {*} routeRecord Record of the route to update
   */
  @action
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
  }

  /**
   * Deletes an existing route.
   *
   * @param {*} route Route to delete
   */
  @action
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
  }

  /**
   * Toggles the editing state of a route.
   *
   * @param {*} route Route to toggle the editing state for
   */
  @action
  toggleEditingRoute(route) {
    set(route, 'isBeingEdited', !route.isBeingEdited);
  }

}
