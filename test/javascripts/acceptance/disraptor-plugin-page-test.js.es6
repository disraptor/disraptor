import { acceptance } from 'helpers/qunit-helpers';

/**
 * Runs Disraptor acceptance tests as a logged-in administrator.
 *
 * Run tests:
 *
 * 127.0.0.1:3000/qunit?qunit_single_plugin=disraptor&qunit_skip_core=1
 *
 * Or run:
 *
 * LOAD_PLUGINS=1 QUNIT_SKIP_CORE=1 QUNIT_SINGLE_PLUGIN='disraptor' rake qunit:test
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

  await fillIn('#route-source-path', '/test2');
  await fillIn('#route-target-url', `${targetHost}test2`);
  await click('#submit-route');

  assert.ok(exists('[data-route-id="3180226165"]'), 'Route /test exists.');
  assert.ok(exists('[data-route-id="4096153253"]'), 'Route /test2 exists.');
});
