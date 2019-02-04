import { acceptance } from 'helpers/qunit-helpers';

/**
 * Runs Disraptor acceptance tests as a logged-in administrator.
 */
acceptance('Disraptor’s plugin page works', {
  loggedIn: true,
  pretend(server, helper) {
    server.get('/disraptor_routes', () => {
      return helper.response({
        disraptor_routes: [
          {
            'id': '3180226165',
            'sourcePath': '/test',
            'targetURL': targetHost,
            'requestMethod': 'get'
          }
        ]
      });
    });
  }
});

const targetHost = 'http://127.0.0.1:2000/';

QUnit.test('Creating a route', async assert => {
  // Visit the plugin page
  await visit('/admin/plugins/disraptor');

  // With the initial GET request, the following active routes should exist.
  assert.ok(exists('[data-route-id="3180226165"]'), 'Route /test exists.');
  assert.ok(!exists('[data-route-id="4096153253"]'), 'Route /test2 does not exist.');

  server.put('/disraptor_routes/4096153253', () => {
    return [
      200,
      { 'Content-Type': 'application/json' },
      {
        disraptor_route: {
          'id': '4096153253',
          'sourcePath': '/test2',
          'targetURL': `${targetHost}test2`,
          'requestMethod': 'get'
        }
      }
    ];
  });

  await fillIn('.dr-new-route__source-path input', '/test2');
  await fillIn('.dr-new-route__target-url input', `${targetHost}test2`);
  await click('.dr-new-route__submit');

  assert.ok(exists('[data-route-id="3180226165"]'), 'Route /test exists.');
  assert.ok(exists('[data-route-id="4096153253"]'), 'Route /test2 exists.');
});
