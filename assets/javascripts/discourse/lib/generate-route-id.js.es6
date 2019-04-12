import { hashString } from 'discourse/lib/hash';

/**
 * The algorithm for generating a route’s database ID based on its defining properties.
 *
 * @param {string} routeRequestMethod
 * @param {string} routeSourcePath
 * @returns {number} a route’s ID.
 */
export function generateRouteId(routeRequestMethod, routeSourcePath) {
  return hashString(routeSourcePath + routeRequestMethod) >>> 0;
}
