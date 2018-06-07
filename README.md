# Disraptor

Disraptor is a plugin for Discourse. It aims at offering Discourse’s core functionality (e.g. user management, authentication, etc.) to web applications so they don’t have to implement these features themselves.

## Development

### Configuring Routes

The Disraptor plugin allows you to configure routes via Discourse’s plugin pages (`/admin/plugins/disraptor`). Routes created there will be transferred to the server and stored in Discourse’s PluginStore. A couple of components are required for this data exchange to work.

#### Client-side Controller

**`assets/javascripts/discourse/controllers/admin-plugins-disraptor.js.es6`**

This file contains the JavaScript code that transfers data to the server via asynchronous HTTP request. For this, Discourse’s store interface (see [store.js.es6](https://github.com/discourse/discourse/blob/master/app/assets/javascripts/discourse/models/store.js.es6)) is used. For a short introduction see [Upgrading our front end models to use a store](https://meta.discourse.org/t/upgrading-our-front-end-models-to-use-a-store/27837) by Robin Ward.

For example, the following will send a POST request to `/pets`:

```js
const pet = this.store.createRecord('pet', { name: 'Relojero Pajaro' });
pet.save()
  .then(result => {
    console.log(result)
  })
  .catch(error => {
    console.error(error);
  });
```

To be precise, the call `pet.save()` will trigger the request. The method `createRecord` will just create the record that is to be transferred.

There is a catch, though. In order for this to actually send out a request, a model for the HTTP endpoint (`pet` in this case) has to be created. The base class for the model is [rest.js.es6](https://github.com/discourse/discourse/blob/master/app/assets/javascripts/discourse/models/rest.js.es6).

**`assets/javascripts/discourse/models/pet.js.es6`**

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

With the client being properly setup, the requests will be send out, but they should be answered with a “404 Not Found” error as the server doesn’t handle requests to the route `/pets`, yet.

First, we will tell Discourse what kinds of requests it should expect.

**`plugin.rb`**

```ruby
Discourse::Application.routes.append do
  get '/pets' => 'pets#index'
  post '/pets' => 'pets#create'
  put '/pets/:pet_id' => 'pets#update'
  delete '/pets/:pet_id' => 'pets#destroy'
end
```

This piece of code will direct GET requests to `/pets` to the `index` method of the “pets controller”. We don’t have a server-side controller, yet. Let’s create it.

**`app/controllers/pets_controller.rb`**

```ruby
class PetsController < ApplicationController
  def index
    # Get a list of pets from your hypothetical PetApp
    pets = PetApp.get_pets()

    render json: pets
  end
end
```

Pay attention to the name of the file and the class itself. If you declared a route to `pets#index`, it will look for a `PetsController`, not a `PetController` or a `AnimalController`.

Plus, in order to handle the routes declared in `plugin.rb`, the controller needs the methods we declared, too: `index`, `create`, `update` and `destroy`.
