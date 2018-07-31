# Disraptor

Disraptor is a plugin for Discourse. It aims at offering Discourse’s core functionality (e.g. user management, authentication, etc.) to web applications so they don’t have to implement these features themselves.



## Content

- [Development](#development)
- [Documentation](#documentation)
  - [Introduction](#introduction)
  - [Limitations](#limitations)
  - [URL references in target documents](#url-references-in-target-documents)
  - [Configuring Routes](#configuring-routes)
  - [Server-side-only Routes](#server-side-only-routes)
- [Notes](#notes)



## Development


```sh
bundle exec rails server --binding=0.0.0.0
```

Occasionally, it’s necessary to clear the cache.

```sh
rm -rf tmp/cache
```


## Documentation

### Introduction

At its core, the plugin allows an administrator of a Discourse forum to configure routes in the form of `source-path → target-url`:

```
/test → http://127.0.0.1:8080/
```

With the Discourse forum running on `example.org` and having a route configured as shown above, opening `example.org/test` would be a match for that route. Disraptor will load the document at `http://127.0.0.1:8080/` with all its styles and scripts if possible (see [Limitations](#limitations) for more information).

The above example would be a route for a document. In the same way, one can setup routes for resources like CSS or images:

```
/css/styles.css → http://127.0.0.1:8080/css/styles.css
```

Now, opening `example.org/css/styles.css` would result in loading the resource at `http://127.0.0.1:8080/css/styles.css`. Doing this for a lot resources (e.g. a lot of CSS files) would be tedious. This is why Disraptor allows to setup routes as wildcard routes.

```
/css → http://127.0.0.1:8080/css
```

Assuming the *wildcard route* option was selected when creating that route, all requests for paths *starting* with the specified source path (i.e. `/css`) will match. This route would cover the example from before (i.e. `example.org/css/styles.css`), but also all other paths starting with `/css` after the domain (e.g. `example.org/css/colors.css` or `example.org/css/tricked.html`).

**(!) Note**: Disraptor doesn’t really distinquish between documents and resources. They’re treated exactly the same when configured the same way.



### Limitations

Disraptor can only operate reliably while imposing restrictions on the target documents that are to be loaded.

- No file-relative URLs (i.e. URLs have to start with a slash). This is explained in the section on [URL references in target documents](#url-references-in-target-documents).



### URL references in target documents

For a Disraptor document that is registered via the route `/example → http://127.0.0.1:8080/`, all resources of that document have to be handled via Disraptor. This opens up a wide variety of issues.

Let’s take CSS as a general example. Assume that the example document in this section loads a CSS file like this:

**`http://127.0.0.1:8080`**:

```html
<link rel="stylesheet" href="/css/styles.css">
```

However, CSS files are not self-contained. They can have `@import` rules or property declarations referencing external URLs. These references can be absolute or relative.

**`http://127.0.0.1:8080/css/styles.css`**:

```css
@import '/css/colors.css';
@import 'base.css';
```

What now? This refers to `http://127.0.0.1:8080/css/colors.css` and `http://127.0.0.1:8080/css/base.css` in the original context of the example document. In a Disraptor context, that’s no longer true. URLs relative to the document can be covered by the same technique mentioned above, but what about URLs like `'base.css'` (or `url('base.css')`)? They wouldn’t automatically be covered.

For this reason, file-relative URLs are forbidden in Disraptor applications. Every URL in your CSS has to start with a slash character.



### Configuring Routes

The Disraptor plugin allows you to configure routes via Discourse’s plugin pages (`/admin/plugins/disraptor`). Routes created there will be transferred to the server and stored in Discourse’s PluginStore. A couple of components are required for this data exchange to work.

Also, one must pay close attention to the naming conventions that are used in the world of Ruby/Rails/Discourse. For this example, I deliberately use a two-word HTTP endpoint (`/favorite_pets`) to illustrate common pitfalls; issues that might not be obvious with an endpoint like `/pets`.

#### Client-side Controller

**`assets/javascripts/discourse/controllers/admin-plugins-disraptor.js.es6`**

This file contains the JavaScript code that transfers data to the server via asynchronous HTTP request. For this, Discourse’s store interface (see [store.js.es6](https://github.com/discourse/discourse/blob/master/app/assets/javascripts/discourse/models/store.js.es6)) is used. For a short introduction see [Upgrading our front end models to use a store](https://meta.discourse.org/t/upgrading-our-front-end-models-to-use-a-store/27837) by Robin Ward.

For example, the following will send a POST request to `/favorite_pets`:

```js
const pet = this.store.createRecord('favorite-pet', { name: 'Relojero Pajaro' });
pet.save()
  .then(result => {
    console.log(result)
  })
  .catch(error => {
    console.error(error);
  });
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

The two methods `createProperties` and `updateProperties` need to be implemented in that model. At the moment, I’m unsure what the purpose of these methods is. However, I can tell that they need to return an object with all the properties that are supposed to be transferred to the server when calling `pet.save()`. Therefor, the to implementations can often be identical.

### Server-side Controller

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
    # Get a list of pets from your hypothetical PetApp
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

I struggled creating server-side-only routes (see [meta.discourse.org: Get server-side controller method to be called via plugin route](https://meta.discourse.org/t/get-server-side-controller-method-to-be-called-via-plugin-route)). Below, I will document my findings.

---

Adding a route like this to `plugin.rb` doesn’t always call `FavoritePetsController#show` method as one would expect:

```ruby
get '/css/bird.css' => 'favorite_pets#show'
```

Requesting `/css/bird.css` *will* call a method named `show` in a class called `FavoritePetsController`.

**`./app/controllers/favorite_pets_controller.rb`**:

```ruby
class FavoritePetsController < ApplicationController
  def show
    Rails.logger.info '┌────────────┐'
    Rails.logger.info '│ Here we go │'
    Rails.logger.info '└────────────┘'
  end
end
```

However, if the controller is defined like this, the lines containing the “Here we go” won’t show up. This is confusing as the following can be found in the logger output:

```
I, [2018-07-12T16:45:17.108958 #30583]  INFO -- : Processing by FavoritePetsController#show as CSS
```

So `FavoritePetsController#show` has been called but also it hasn’t?

I don’t fully understand it, yet, but there is a clue:

```ruby
class FavoritePetsController < ApplicationController
  skip_before_action :check_xhr

  def show
    Rails.logger.info '┌────────────┐'
    Rails.logger.info '│ Here we go │'
    Rails.logger.info '└────────────┘'
  end
end
```

Now this will finally produce the desired logging output. Without this, Discourse expects requests to the server-side controller to come from the client-side via AJAX (or XHR, short for XMLHttpRequest). `check_xhr` seems to be an implicit `before_action` that needs to be skipped in order to avoid this behavior.


## Notes

- Can a target document attack the route server by using file-relative URLs; thus, potentially gaining access to Discourse APIs?
