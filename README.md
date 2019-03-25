# Disraptor

Disraptor is a plugin for Discourse. It aims at offering Discourse’s core functionality (e.g. user management, authentication, etc.) to web applications so they don’t have to implement these features themselves.



## Content

- [Development](#development)
  - [Start Discourse](#start-discourse)
  - [Tests](#tests)
- [Getting started](#getting-started)
- [Documentation](#documentation)
  - [Introduction](#introduction)
  - [Rendering modes](#rendering-modes)
  - [Features](#features)
- [To do](#to-do)



## Development

### Setup Discourse & Disraptor

Follow [Discourse: Setup development environment (Ubuntu)](https://github.com/disraptor/disraptor/wiki/Discourse:-Setup-development-environment-(Ubuntu)) to setup a Discourse development environment.

### Start Discourse in development mode

```sh
cd discourse
RAILS_ENV=development bundle exec rails server
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



## Getting started

After deploying Discourse and installing the Disraptor plugin, the following steps need to be performed for Disraptor to operate reliably:

1. Open Discourse’s settings and configure the value for “disraptor app secret key”.

   Use this secret key in your web application as a signal that the Discourse instance is properly set up and allowed to communicate with the server your web application is running on. Only if the key is correct can you be sure that requests made to the server are legitimately coming from the Discourse instance.

2. Open Discourse’s “Plugins” page. From there, open the Disraptor plugin page.

   Configure all routes that your web application needs to expose. You can use Rails’ route syntax to configure wildcard routes like `/static/*wildcard`. See Rails’ documentation on [dynamic path segments](https://guides.rubyonrails.org/routing.html#dynamic-segments) and [wildcard path segments](https://guides.rubyonrails.org/routing.html#route-globbing-and-wildcard-segments) for more examples.

Any Disraptor application is subject to a set of limitations that are necessary for Discourse and Disraptor to interact nicely: [Disraptor: Limitations for documents and resources](https://github.com/disraptor/disraptor/wiki/Disraptor:-Limitations-for-documents-and-resources#url-paths-must-not-be-file-relative)



## Documentation



### Introduction

At its core, the plugin allows an administrator of a Discourse forum to configure routes in the form of `source-path → target-url`:

```
/test → http://localhost:8080/
```

Requests to matching source paths are then resolved to their target URL from which the resources like HTML documents, CSS files, or images are retrieved. In other words, Disraptor effectively turns Discourse in a reverse proxy for your web application.

Disraptor uses Rails’ route syntax; thus, it’s possible to use [dynamic path segments](https://guides.rubyonrails.org/routing.html#dynamic-segments) and [wildcard path segments](https://guides.rubyonrails.org/routing.html#route-globbing-and-wildcard-segments) when setting up routes on the plugin page. For example, a route can be configured like this:

```
/static/*wildcard → http://localhost:8080/static/*wildcard
```



### Rendering modes

Disraptor has two rendering modes for HTML. The current default mode is the legacy mode. The shadow DOM mode can be enabled in the Discourse settings under “disraptor shadow dom”.

#### Legacy mode

The legacy mode parses your web application’s HTML and injects the contents of the `<body>` tag into a Discourse page. All `<link>`, `<style>`, and `<script>` tags are injected into the `head` element of the Discourse page.

#### Shadow DOM mode

The experimental shadow DOM mode parses the HTML and hooks it into the host document as a shadow tree.

This way, no `head` content needs to be transferred to the host document manually. Also, style isolation between Discourse and Disraptor documents is achieved without the need for prefixing, etc.

Known issues with the shadow DOM mode:

- [Mousetrap.js doesn’t properly stop callbacks for events originating from a shadow DOM](https://meta.discourse.org/t/mousetrap-js-doesn-t-properly-stop-callbacks-for-events-originating-from-a-shadow-dom/102757): This was fixed in [mousetrap.js](https://github.com/ccampbell/mousetrap), but Discourse currently maintains and uses [a fork of mousetrap.js](https://github.com/discourse/mousetrap) and therefor doesn’t have this fix, yet.
- [Shadow tree navigation doesn’t go through Ember router](https://meta.discourse.org/t/shadow-tree-navigation-doesn-t-go-through-ember-router/103712): Fixed in the plugin; can be fixed in Discourse.
- Unstyled document: Occasionally, a document will appear completely unstyled in Firefox until the user opens or closes the developer tools. That’s potentially a browser bug in Firefox.
- @font-face issue: Loading fonts with the CSS `@font-face` at rule doesn’t work when the rule is inside the shadow DOM. This should be evaluated again in the future.



### Features

Disraptor is able to render your web application’s HTML documents inside a Discourse page. Requests to assets (stylesheets, scripts, fonts, images, etc.) that are my made by that document are handled accordingly. You only need to configure routes mapping from requests to the Discourse instance to your web application server.

Any form submits in your documents are intercepted in order to resolve them via asynchronous requests. This allows Disraptor to handle things like “303 See Other” statusses and redirect to the URL in the “Location” header via Ember transitions.

Disraptor sends the following information to the web application in its requests:

- `x-disraptor-app-secret-key`: A signal indicating that the Discourse instance is allowed to send requests to the web application server. If it is not set, no proxy requests will be send.
- `x-disraptor-user`: The username of the currently logged-in Discourse user.
- `x-disraptor-groups`: Disraptor-specific groups (groups starting with the string `disraptor`) of the currently logged-in Discourse user.




## To do

- Changing plugin GUI to set “targetDomain” and “URL path” instead of “source path” and “target URL”:

  ```
  http://localhost:8080 + /tira9-client-web
  ```

  instead of

  ```
  /tira9-client-web + http://localhost:8080/tira9-client-web
  ```

- Deploy Discourse with Disraptor
- Add user-specific meta data (needs clear specification and use cases → meeting)
