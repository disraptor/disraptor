# Disraptor

Disraptor is a plugin for Discourse. It aims at offering Discourse’s core functionality (e.g. user management, authentication, etc.) to web applications so they don’t have to implement these features themselves.



## Content

- [Development](#development)
  - [Setup Discourse & Disraptor](setup-discourse--disraptor)
  - [Tests](#tests)
- [Production](#production)
  - [Getting started](#getting-started)
- [Documentation](#documentation)
  - [Introduction](#introduction)
  - [Authentication](#authentication)
  - [App secret key](#app-secret-key)
  - [Rendering modes](#rendering-modes)
- [To do](#to-do)



## Development

### Setup Discourse & Disraptor

To develop your web application with Disraptor, [setup a Discourse development environment (Ubuntu)](docs/setup-a-discourse-development-environment-ubuntu.md) first.

After this is done, you can start Discourse in development mode:

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



## Production

First, you have to [deploy Discourse with Disraptor](docs/deploy-discourse-with-disraptor.md).



### Getting started

Next, after deploying Discourse and installing the Disraptor plugin, the following steps need to be performed for Disraptor to operate reliably:

1. Open Discourse’s settings and configure the value for “disraptor app secret key”.

   Use this secret key in your web application as a signal that the Discourse instance is properly set up and allowed to communicate with the server your web application is running on. Only if the key is correct can you be sure that requests made to the server are legitimately coming from the Discourse instance.

2. Open Discourse’s “Plugins” page. From there, open the Disraptor plugin page.

   Configure all routes that your web application needs to expose. You can use Rails’ route syntax to configure wildcard routes like `/static/*wildcard`. See Rails’ documentation on [dynamic path segments](https://guides.rubyonrails.org/routing.html#dynamic-segments) and [wildcard path segments](https://guides.rubyonrails.org/routing.html#route-globbing-and-wildcard-segments) for more examples.

Any Disraptor application is subject to a set of limitations that are necessary for Discourse and Disraptor to interact nicely: [Disraptor: Limitations for documents and resources](https://github.com/disraptor/disraptor/wiki/Disraptor:-Limitations-for-documents-and-resources#url-paths-must-not-be-file-relative)



## Documentation

### Introduction

The plugin does two things. *One*, it allows an administrator of a Discourse forum to configure routes from the Discourse instance to your web application. *Two*, it hooks into Discourse’s routing mechanism and redirects all requests to the configured source paths to their target URLs. Disraptor will render documents obtained with such a redirection inside the Discourse instance. In other words, Disraptor effectively turns Discourse into a reverse proxy for your web application.

Here are a few examples of possible route configurations:

- `/` → `http://192.168.1.1/`
- `/tasks` → `http://192.168.1.1/tasks/`
- `/static/*wildcard` → `http://192.168.1.1/static/*wildcard`

Disraptor uses Rails’ route syntax; thus, it’s possible to use [dynamic path segments](https://guides.rubyonrails.org/routing.html#dynamic-segments) and [wildcard path segments](https://guides.rubyonrails.org/routing.html#route-globbing-and-wildcard-segments) when setting up routes as shown in the third route configuration.



### Authentication

Your web application can make use of Discourse’s own authentication infrastructure. If a user is logged in via Discourse, Disraptor sends an `X-Disraptor-User` header with their user name to your web application. Similarly, the `X-Disraptor-Groups` header contains a list of associated groups. For now, only groups with the prefix `disraptor` are sent.

Since Disraptor will only populate these header fields if there is any information to send, you can use the presence of the `X-Disraptor-User` header as the signal that the user is logged in.

Note that Disraptor will also allow authentication via POST requests. Any responses with status “303 See Other” will redirect to the URL in the `Location` header.



### App secret key

Disraptor requires a secret key in order to communicate with your web application. In essence, the secret key is really just a signal that *allows the Discourse instance to send requests to your web application*. Without it, Disraptor will not send requests to your web application. If set up, Disraptor will always send an `X-Disraptor-App-Secret-Key` header with its requests to your web application. **Your web application has to evaluate whether the secret key is correct**.



### Rendering modes

Disraptor has two rendering modes for HTML. The current default mode is the legacy mode. The shadow DOM mode can be enabled in the Discourse settings under “disraptor shadow dom”.

#### Legacy mode

The legacy mode parses your web application’s HTML and injects the contents of the `<body>` tag into a Discourse page. All `<link>`, `<style>`, and `<script>` tags are injected into the `head` element of the Discourse page.

#### Shadow DOM mode

The experimental shadow DOM mode parses the HTML and hooks it into the host document as a shadow tree.

This way, no `head` content needs to be transferred to the host document. Also, style isolation between Discourse and Disraptor documents is achieved without the need for prefixing, etc.

Known issues with the shadow DOM mode:

- [Shadow tree navigation doesn’t go through Ember router](https://meta.discourse.org/t/shadow-tree-navigation-doesn-t-go-through-ember-router/103712): Fixed in the plugin; can be fixed in Discourse.
- Unstyled document: Occasionally, a document will appear completely unstyled in Firefox until the user opens or closes the developer tools. That’s potentially a browser bug in Firefox.
- @font-face issue: Loading fonts with the CSS `@font-face` at-rule doesn’t work when the rule is inside the shadow DOM. This should be evaluated again in the future.




## To do

- Change semantics of routes to have “targetDomain” and “URL path” instead of “source path” and “target URL”:

  ```
  http://localhost:8080 + /tira9-client-web
  ```

  instead of

  ```
  /tira9-client-web + http://localhost:8080/tira9-client-web
  ```

- Add user-specific meta data (needs clear specification and use cases → meeting)
