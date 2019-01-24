# Disraptor

Disraptor is a plugin for Discourse. It aims at offering Discourse’s core functionality (e.g. user management, authentication, etc.) to web applications so they don’t have to implement these features themselves.



## Content

- [Development](#development)
  - [Start Discourse](#start-discourse)
  - [Run Tests](#run-tests)
- [Documentation](#documentation)
  - [Introduction](#introduction)
  - [Current status](#current-status)
  - [Limitations for Disraptor documents and resources](#limitations-for-disraptor-documents-and-resources)
    - [URL references in documents and resources](#url-references-in-documents-and-resources)
    - [Conflict-free naming of HTML IDs, classes and custom attributes](#conflict-free-naming-of-html-ids-classes-and-custom-attributes)
    - [Selecting and querying DOM nodes](#selecting-and-querying-dom-nodes)
  - [Configuring Routes](#configuring-routes)
  - [Server-side-only Routes](#server-side-only-routes)
- [To Do](#to-do)



## Development

### Setup Discourse & Disraptor

The Disraptor wiki has a guide for setting up a Discourse development environment along with Disraptor: [Discourse Development Setup (Ubuntu)](https://github.com/disraptor/disraptor/wiki/Discourse-Development-Setup-(Ubuntu))

### Start Discourse

**Local Development Server**:

```sh
RAILS_ENV=development bundle exec rails server
```

### Run Tests

- Frontend tests: Start the development server and go to [localhost:3000/qunit?module=Acceptance%3A%20Disraptor](http://localhost:3000/qunit?module=Acceptance%3A%20Disraptor)



## Documentation

### Introduction

At its core, the plugin allows an administrator of a Discourse forum to configure routes in the form of `source-path → target-url`:

```
/test → http://localhost:8080/
```

With the Discourse forum running on `example.org` and having a route configured as shown above, opening `example.org/test` would be a match for that route. Disraptor will load the document at `http://localhost:8080/` with all its styles and scripts if possible (see [Limitations](#limitations) for more information).

The above example would be a route for a document. In the same way, one can setup routes for resources like CSS or images:

```
/css/styles.css → http://localhost:8080/css/styles.css
```

Now, opening `example.org/css/styles.css` would result in loading the resource at `http://localhost:8080/css/styles.css`. Doing this for a lot resources (e.g. a lot of CSS files) would be tedious. This is why Disraptor allows to setup routes as wildcard routes.

```
/css/*wildcard → http://localhost:8080/css/*wildcard
```

Disraptor uses Rails’ route syntax; thus, it’s possible to use [dynamic path segments](https://guides.rubyonrails.org/routing.html#dynamic-segments) and [wildcard path segments](https://guides.rubyonrails.org/routing.html#route-globbing-and-wildcard-segments).

The wildcard route above will match all request paths under the `example.org/css/` prefix (e.g. `example.org/css/styles.css`, `example.org/css/logo.png`).

### Current status

The current prototype has the following features:

- Render a web application document inside a Discourse document. The Disraptor document’s `link`, `style` and `script` tags are injected into the Discourse document’s `head`. This leads to a flash of unstyled content.
- Navigate between pages via Ember transitions. Previously injected `link`, `style` and `script` tags are removed on transition.
- Authenticate with the web application. Form submits are intercepted and sent to the server via asynchronous JavaScript. This allows Disraptor to handle the response with Ember transitions which in turn ensures that a Disraptor document is still rendered inside the Discourse document.

  Successful authentication requets often respond with a “303 See Other” status, indicating which document to request in the response’s `Location` header. Disraptor keeps track of `Set-Cookie` headers from “303 See Other” responses and includes them in subsequent requests. This allows Disraptor’s backend to set the correct cookies when sending proxy requests to the web application server.
- Disraptor sends the following information to the web application in its requests:
  - `x-disraptor-app-secret-key`: A signal indicating that the Discourse instance is allowed to send requests to the web application server. If it is not set, no proxy requests will be send.
  - `x-disraptor-user`: The username of the currently logged-in Discourse user.
  - `x-disraptor-groups`: Disraptor-specific groups (groups starting with the string `disraptor`) of the currently logged-in Discourse user.



### Limitations for Disraptor documents and resources

Disraptor can only operate reliably while imposing restrictions on its documents and resources.

- URLs **must not** be file-relative. Instead, root-relative (i.e. URLs starting with a slash) or absolute URLs **must** be used. Explanation: [URL references in documents and resources](#url-references-in-documents-and-resources).
- HTML IDs, classes and custom attributes **should not** conflict with Discourse. Instead, HTML ID, class and custom attribute names **should** be prefixed. Explanation: [Conflict-free naming of HTML IDs, classes and custom attributes](#conflict-free-naming-of-html-ids-classes-and-custom-attributes)
- Stylesheets and scripts **must not** select or query DOM nodes outside of a Disraptor document. Instead, only DOM nodes inside a Disraptor document **must** be selected/queried. Explanation: [Selecting and querying DOM nodes](#selecting-and-querying-dom-nodes)

#### Experimental document embedding with shadow DOM

We’re currently evaluating the [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM) API for embedding documents in a Discourse context. This is an experimental feature and can be turned on in the Discourse settings under “disraptor shadow dom”.

**Advantages**:

- Style isolation (and therefor no more selector restrictions for stylesheets).
- Full document markup including `html`, `head`, and `body` elements.

**Known issues**:

- [Mousetrap.js doesn’t properly stop callbacks for events originating from a shadow DOM](https://meta.discourse.org/t/mousetrap-js-doesn-t-properly-stop-callbacks-for-events-originating-from-a-shadow-dom/102757): Can be fixed in mousetrap.js (upstream) or in Discourse’s fork of mousetrap.
- [Shadow tree navigation doesn’t go through Ember router](https://meta.discourse.org/t/shadow-tree-navigation-doesn-t-go-through-ember-router/103712): Fixed in the plugin; can be fixed in Discourse.
- [Firefox] Unstyled document: Occasionally, a document will appear completely unstyled until the user opens or closes the developer tools. That’s potentially a browser bug.
- [`@font-face`]: Loading fonts with the CSS `@font-face` at rule doesn’t work when the rule is inside the shadow DOM.



#### URL references in documents and resources

URL references in Disraptor documents and resources must either be absolute or root-relative. The correct context of file-relative URLs cannot be recovered; hence, they’re forbidden.

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

The third style (a file-relative URL) causes an issue. This will not match any Disraptor route because a Disraptor route has to begin with a slash: It’s always root-relative to the Discourse instance. Therefor, the last reference will resolve to a `typography.css` file on the Discourse instance if it exists. It’s not possible to recover the original context of this reference without looking at the content of each document or resource at the language level.

For this reason, file-relative URLs are forbidden in Disraptor applications. Every URL reference in your stylesheets and scripts has to be absolute or root-relative.

#### Conflict-free naming of HTML IDs, classes and custom attributes

In order to make sure that as little as possible Discourse styles and scripts affect Disraptor documents, you should prefix your HTML IDs, class names and custom attribute names and update all references (e.g. in CSS or JavaScript selectors) to these identifiers and names accordingly. One exception to this rule is reusing Discourse styles for your own components (e.g. reusing `<button>` styles).

#### Selecting and querying DOM nodes

In order to avoid side-effects of stylesheets and scripts of a Disraptor document on Discourse’s parent document, only DOM nodes of the Disraptor document must be selected/queried by these styles and scripts.



### Configuring Routes

The Disraptor plugin allows you to configure routes via Discourse’s plugin pages ([localhost:3000/admin/plugins/disraptor](http://localhost:3000/admin/plugins/disraptor)). Routes created there will be transferred to the server and stored in Discourse’s PluginStore. A couple of components are required for this data exchange to work.

Also, one must pay close attention to the naming conventions that are used in the world of Ruby/Rails/Discourse. For this example, I deliberately use a two-word HTTP endpoint (`/favorite_pets`) to illustrate common pitfalls; issues that might not be obvious with an endpoint like `/pets`.

#### Client-side Controller

**`assets/javascripts/discourse/controllers/admin-plugins-disraptor.js.es6`**

This file contains the JavaScript code that transfers data to the server via asynchronous HTTP request. For this, Discourse’s store interface (see [store.js.es6](https://github.com/discourse/discourse/blob/master/app/assets/javascripts/discourse/models/store.js.es6)) is used. For a short introduction see [Upgrading our front end models to use a store](https://meta.discourse.org/t/upgrading-our-front-end-models-to-use-a-store/27837) by Robin Ward.

For example, the following will send a POST request to `/favorite_pets`:

```js
const pet = this.store.createRecord('favorite-pet', { name: 'Relojero Pajaro' });
pet.save()
  .then(console.log)
  .catch(console.error);
```

When providing an ID with the record’s properties, a PUT request to `/favorite_pets/135` will be send instead:

```js
const pet = this.store.createRecord('favorite-pet', {
  id: 135,
  name: 'Relojero Pajaro'
});
pet.save()
  .then(console.log)
  .catch(console.error);
```

To be precise, the call `pet.save()` will trigger the request. The method `createRecord` will just create the record that is to be transferred.

There is a catch, though. In order for this to actually send out a request, a model for the HTTP endpoint (`favorite-pet` in this case) has to be created. The base class for the model is [rest.js.es6](https://github.com/discourse/discourse/blob/master/app/assets/javascripts/discourse/models/rest.js.es6).

**`assets/javascripts/discourse/models/favorite-pet.js.es6`**

```js
import RestModel from 'discourse/models/rest';

export default RestModel.extend({
  createProperties() {
    return this.getProperties('name');
  },

  updateProperties() {
    return this.createProperties();
  }
});
```

The two methods `createProperties` (for POST requests) and `updateProperties` (for PUT requests) need to be implemented in that model. At the moment, I’m unsure what the purpose of these methods is. However, I can tell that they need to return an object with all the properties that are supposed to be transferred to the server when calling `pet.save()`. Therefor, the two implementations can often be identical.

#### Server-side Controller

With the client being properly setup, the requests will be send out, but they should be answered with a “404 Not Found” error as the server doesn’t handle requests to the route `/favorite_pets`, yet.

First, we will tell Discourse what kinds of requests it should expect.

**`plugin.rb`**

```ruby
Discourse::Application.routes.append do
  get '/favorite_pets' => 'favorite_pets#index'
  post '/favorite_pets' => 'favorite_pets#create'
  put '/favorite_pets/:pet_id' => 'favorite_pets#update'
  delete '/favorite_pets/:pet_id' => 'favorite_pets#destroy'
end
```

This piece of code will direct GET requests to `/favorite_pets` to the `index` method of the “favorite pets controller”. We don’t have a server-side controller, yet. Let’s create it.

**`app/controllers/favorite_pets_controller.rb`**

```ruby
class FavoritePetsController < ApplicationController
  def index
    # Get a list of pets from a hypothetical PetApp class
    pets = PetApp.get_pets()

    # Discoure’s store expects collection resources to return an object
    # containing a property named just like the HTTP endpoint.
    # This property holds the list of pets in our case.
    render json: { favorite_pets: pets }
  end
end
```

Pay attention to the name of the file and the class itself. If you declared a route to `favorite_pets#index`, it will look for a `FavoritePetsController`, not a `FavoritePetController` (note the missing “s”) or a `PetsController`.

Plus, in order to handle the routes declared in `plugin.rb`, the controller needs the methods we declared, too: `index`, `create`, `update` and `destroy`.



### Server-side-only Routes

By default, Discourse’s server-side controllers expect routes to be called via AJAX from the Discourse front end. However, you may want to have a server-side-only route (e.g. for requesting resources or data). It’s not immediately obvious how to implement these. Below, I will document my findings because I struggled with this (also documented on [meta.discourse.org: Get server-side controller method to be called via plugin route](https://meta.discourse.org/t/get-server-side-controller-method-to-be-called-via-plugin-route)).

---

First of all, adding a route like this to `plugin.rb` doesn’t always call `FavoritePetsController#show` method as one would expect:

```ruby
get '/css/bird.css' => 'favorite_pets#show'
```

Requesting `/css/bird.css` *will* call a method named `show` in a class called `FavoritePetsController`. Let’s set this up:

**`./app/controllers/favorite_pets_controller.rb`**:

```ruby
class FavoritePetsController < ApplicationController
  def show
    Rails.logger.info 'Here we go! 🚂'
  end
end
```

Trying this out by requesting `/css/bird.css` won’t work. The lines containing the “Here we go! 🚂” won’t show up. This is confusing as the following can be found in the logger output:

```
I, [2018-07-12T16:45:17.108958 #30583]  INFO -- : Processing by FavoritePetsController#show as CSS
```

So `FavoritePetsController#show` has been called but also it hasn’t? It turns out that Discourse’s controllers have an implicit *before action* called `check_xhr`. Such an action is triggered whenever a controller action is about to be invoked. Let’s have a look at it.

[**`discourse/app/controllers/application_controller.rb`**](https://github.com/discourse/discourse/blob/master/app/controllers/application_controller.rb#L602-L606):
```ruby
def check_xhr
  # bypass xhr check on PUT / POST / DELETE provided api key is there, otherwise calling api is annoying
  return if !request.get? && (is_api? || is_user_api?)
  raise RenderEmpty.new unless ((request.format && request.format.json?) || request.xhr?)
end
```

The baseline here is the check for `request.xhr?`. If the request was made via AJAX (i.e. an XMLHttpRequest or XHR for short), everything’s fine. Otherwise (ignoring the other conditions for now), an error is thrown. We can skip before actions like this:

```ruby
class FavoritePetsController < ApplicationController
  skip_before_action :check_xhr

  def show
    Rails.logger.info 'Here we go! 🚂'
  end
end
```

Now this will finally produce the desired logging output. In other words, the other `FavoritePetsController` example acts as if we declared `before_action :check_xhr`.



## To Do

- Figure out if we should store `path` and `origin_host` instead of `source_path` and `target_url`.
  - `path` would serve the same purpose as `source_path`
  - `target_url` would be constructed by concatenating `origin_host` and `path`
- [Low Priority] [Discourse Integration] Add *role* property to routes. This allows the Discourse instance to not send proxy requests if the current user lacks certain permissions.
