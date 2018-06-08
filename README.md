# Disraptor

Disraptor is a plugin for Discourse. It aims at offering Discourse’s core functionality (e.g. user management, authentication, etc.) to web applications so they don’t have to implement these features themselves.

## Development

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
    return this.getProperties('name');
  }
});
```

The two methods `createProperties` and `updateProperties` need to be implemented in that model. At the moment, I’m unsure what the purpose of these methods is. However, I can tell that they need to return an object with all the properties that are supposed to be transferred to the server when calling `pet.save()`.

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
