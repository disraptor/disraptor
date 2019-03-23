# Discourse: Setting up client side and server side routes

(**Note**: This document deals with the concept of routes in terms of Ember and Rails applications, not with Disraptor routes.)

---

The Disraptor plugin allows you to configure routes via Discourse’s plugin pages ([localhost:3000/admin/plugins/disraptor](http://localhost:3000/admin/plugins/disraptor)). Routes created there will be transferred to the server and stored in Discourse’s PluginStore. A couple of components are required for this data exchange to work.

Also, one must pay close attention to the naming conventions that are used in the world of Ruby/Rails/Discourse. For this example, I deliberately use a two-word HTTP endpoint (`/favorite_pets`) to illustrate common pitfalls; issues that might not be obvious with an endpoint like `/pets`.

## Client-side Controller

**`assets/javascripts/discourse/controllers/admin-plugins-disraptor.js.es6`**

This file contains the JavaScript code that transfers data to the server via asynchronous HTTP requests. For this, Discourse’s store interface (see [store.js.es6](https://github.com/discourse/discourse/blob/master/app/assets/javascripts/discourse/models/store.js.es6)) is used. For a short introduction see [Upgrading our front end models to use a store](https://meta.discourse.org/t/upgrading-our-front-end-models-to-use-a-store/27837) by Robin Ward.

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

## Server-side Controller

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



## Server-side-only Routes

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
