# Disraptor

Disraptor is a plugin for Discourse. It aims at offering Discourse’s core functionality (e.g. user management, authentication, etc.) to web applications so they don’t have to implement these features themselves.



## Content

- [Development](#development)
  - [Start Discourse](#start-discourse)
  - [Tests](#tests)
- [Getting started](#getting-started)
- [Documentation](#documentation)
  - [Introduction](#introduction)
  - [Current status](#current-status)
  - [Limitations for Disraptor documents and resources](#limitations-for-disraptor-documents-and-resources)
    - [URL references in documents and resources](#url-references-in-documents-and-resources)
    - [Conflict-free naming of HTML IDs, classes and custom attributes](#conflict-free-naming-of-html-ids-classes-and-custom-attributes)
    - [Selecting and querying DOM nodes](#selecting-and-querying-dom-nodes)
- [To Do](#to-do)



## Development

### Setup Discourse & Disraptor

The Disraptor wiki has a guide for setting up a Discourse development environment along with Disraptor: [Discourse development: Setup (Ubuntu)](https://github.com/disraptor/disraptor/wiki/Discourse-development:-Setup-(Ubuntu))

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



## Documentation

### Introduction

At its core, the plugin allows an administrator of a Discourse forum to configure routes in the form of `source-path → target-url`:

```
/test → http://localhost:8080/
```

Requests to matching source paths are then resolved to their target URL from which the resources like HTML documents, CSS files, or images are retrieved. In other words, Disraptor effectively turns Discourse in a reverse proxy for your web application.

Disraptor uses Rails’ route syntax; thus, it’s possible to use [dynamic path segments](https://guides.rubyonrails.org/routing.html#dynamic-segments) and [wildcard path segments](https://guides.rubyonrails.org/routing.html#route-globbing-and-wildcard-segments) when setting up routes on the plugin page.

### Current status

Disraptor is able to render your web application’s HTML documents inside a Discourse page. Requests to assets (stylesheets, scripts, fonts, images, etc.) that are my made by that document are handled accordingly. You only need to configure routes mapping from requests to the Discourse instance to your web application server.

Any form submits in your documents are intercepted in order to resolve them via asynchronous requests. This allows Disraptor to handle things like “303 See Other” statusses and redirect to the URL in the “Location” header via Ember transitions.

Disraptor sends the following information to the web application in its requests:

- `x-disraptor-app-secret-key`: A signal indicating that the Discourse instance is allowed to send requests to the web application server. If it is not set, no proxy requests will be send.
- `x-disraptor-user`: The username of the currently logged-in Discourse user.
- `x-disraptor-groups`: Disraptor-specific groups (groups starting with the string `disraptor`) of the currently logged-in Discourse user.

### Rendering modes

Disraptor has two rendering modes for HTML.

The legacy mode (the current default) parses your web application’s HTML and injects the contents of the `<body>` tag into a Discourse page. All `<link>`, `<style>`, and `<script>` tags are injected into the `head` element of the Discourse page.

The experimental shadow DOM mode parses the HTML and hooks it into the host document as a shadow tree. This way, no `head` content needs to be transferred to the host document manually.



### Limitations for Disraptor documents and resources

Disraptor can only operate reliably while imposing restrictions on its documents and resources.

- URLs **must not** be file-relative. Instead, root-relative (i.e. URLs starting with a slash) or absolute URLs **must** be used. This rule applies to all rendering modes. Explanation: [URL references in documents and resources](#url-references-in-documents-and-resources).
- HTML IDs, classes and custom attributes **should not** conflict with Discourse. Instead, HTML ID, class and custom attribute names **should** be prefixed. This rule applies to the legacy rendering mode in particular. The shadow DOM rendering mode does not have the potential for conflicts in most cases. Explanation: [Conflict-free naming of HTML IDs, classes and custom attributes](#conflict-free-naming-of-html-ids-classes-and-custom-attributes)
- Stylesheets and scripts **must not** select or query DOM nodes outside of a Disraptor document. Instead, only DOM nodes inside a Disraptor document **must** be selected/queried. This rule applies to both rendering modes. Explanation: [Selecting and querying DOM nodes](#selecting-and-querying-dom-nodes)

#### Experimental document embedding with shadow DOM

We’re currently evaluating the [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM) API for embedding documents in a Discourse context. This is an experimental feature and can be turned on in the Discourse settings under “disraptor shadow dom”.

**Advantages**:

- Style isolation (and therefor no more selector restrictions for stylesheets).
- Full document markup including `html`, `head`, and `body` elements.

**Known issues**:

- [Mousetrap.js doesn’t properly stop callbacks for events originating from a shadow DOM](https://meta.discourse.org/t/mousetrap-js-doesn-t-properly-stop-callbacks-for-events-originating-from-a-shadow-dom/102757): Can be fixed in mousetrap.js (upstream, a [pull request](https://github.com/ccampbell/mousetrap/pull/445) was submitted) or in Discourse’s fork of mousetrap (The Discourse folks prefer a fix upstream).
- [Shadow tree navigation doesn’t go through Ember router](https://meta.discourse.org/t/shadow-tree-navigation-doesn-t-go-through-ember-router/103712): Fixed in the plugin; can be fixed in Discourse.
- [Firefox] Unstyled document: Occasionally, a document will appear completely unstyled until the user opens or closes the developer tools. That’s potentially a browser bug in Firefox.
- [`@font-face`]: Loading fonts with the CSS `@font-face` at rule doesn’t work when the rule is inside the shadow DOM. This should be evaluated again in the future.



#### URL references in documents and resources

URL references in Disraptor documents and resources must either be absolute or root-relative. The correct context of file-relative URLs cannot be recovered; hence, they should be avoided.

In the following example, two routes are specified. One for a document (`/example → http://localhost:8080/`) and a wildcard route for stylesheets (`/css → http://localhost:8080/css`). In the example document, there is a reference to a stylesheet at `/css/styles.css`:

**`http://localhost:8080/`**:

```html
<link rel="stylesheet" href="/css/styles.css">
```

The stylesheet contains the following styles of URL references: absolute, root-relative and file-relative.

**`http://localhost:8080/css/styles.css`**:

```css
@import 'http://localhost:8080/css/base.css';
@import '/css/colors.css';
@import 'typography.css';
```

The first two styles (absolute and root-relative URLs) can always be handled. The root-relative URL will recover its context via the wildcard route and resolve to `http://localhost:8080/css/colors.css`.

The third style (a file-relative URL) causes an issue. This will not match any Disraptor route because a Disraptor route has to begin with a slash: It’s always root-relative to the Discourse instance. Therefore, the last reference will resolve to `typography.css` (note the missing `http://localhost:8080/), potentially a file on the Discourse instance. It’s not possible for us to recover the original context of this reference without looking at the content of each document or resource at the language level.

For this reason, file-relative URLs should not be used in Disraptor applications. Every URL reference in your stylesheets and scripts has to be absolute or root-relative.

#### Conflict-free naming of HTML IDs, classes and custom attributes

In order to make sure that as little as possible styles and scripts of Discourse affect Disraptor documents, you should prefix your HTML IDs, class names and custom attribute names and update all references (e.g. in CSS or JavaScript selectors) to these identifiers and names accordingly. One exception to this rule is reusing Discourse styles for your own components (e.g. reusing `<button>` styles).

#### Selecting and querying DOM nodes

In order to avoid side-effects of stylesheets and scripts of a Disraptor document on Discourse’s host document, only DOM nodes of the Disraptor document must be selected/queried by these styles and scripts.



## To Do

- Add user-specific meta data (needs clear specification and use cases → meeting)
