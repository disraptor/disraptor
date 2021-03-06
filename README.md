# Disraptor

Disraptor is a plugin for Discourse. It aims at offering Discourse’s core functionality (e.g. user management, authentication, etc.) to web applications so they don’t have to implement these features themselves.



## Content

- [Documentation](#documentation)
- [Development](#development)
  - [Setup Discourse & Disraptor](setup-discourse--disraptor)
  - [Update Discourse](#update-discourse)
  - [Tests](#tests)
- [To do](#to-do)



## Documentation

Disraptor’s documentation is available at [disraptor.org/docs](https://www.disraptor.org/docs).



## Development

If you plan to develop Disraptor, the tutorial [“How to create a Discourse plugin”](https://kleinfreund.de/how-to-create-a-discourse-plugin/) might be helpful in getting to know some of Rails’ and Discourse’s conventions.

### Setup Discourse & Disraptor

To develop your web application with Disraptor, [setup a Discourse development environment (Ubuntu)](https://www.disraptor.org/docs/setup-a-discourse-development-environment-ubuntu.html) first.

After this is done, you can start Discourse in development mode:

```sh
cd discourse
RAILS_ENV=development bundle exec rails server
```

### Update Discourse

```sh
cd discourse
git pull
bundle install
RAILS_ENV=development bundle exec rake db:migrate
```

### Tests

#### Frontend tests

1. Start the development server:

   ```sh
   cd discourse
   RAILS_ENV=development bundle exec rails server
   ```

2. Go to [127.0.0.1:3000/qunit?qunit_single_plugin=disraptor&qunit_skip_core=1](http://127.0.0.1:3000/qunit?qunit_single_plugin=disraptor&qunit_skip_core=1).

#### Backend tests

```sh
cd discourse
bundle exec rake plugin:spec["disraptor"]
```



## To do

- Test whether a Disraptor user can override Discourse routes such as `/admin` or `/latest` if the client-side code doesn’t block it.
- Document how a Disraptor user can see a list of Discourse routes.
- Change semantics of routes to have “targetDomain” and “URL path” instead of “source path” and “target URL”:

  ```
  http://example.org + /tira9-client-web
  ```

  instead of

  ```
  /tira9-client-web + http://example.org/tira9-client-web
  ```

- Add user-specific meta data (needs clear specification and use cases → meeting)


- Add body-styling of proxy to "disraptor-content"-div to prevent styling loss
    - at `disraptor/assets/javascripts/discourse/routes/disraptor-proxy.js.es6:95`
