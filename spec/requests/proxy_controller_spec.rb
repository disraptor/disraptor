require 'rails_helper'

# Important note:
# All requests here need to come with `xhr` set to `true` because otherwise, Discourse won’t call
# the correct controller action. In fact, the action it will call instead always returns a status
# code 200.
describe ProxyController do
  before do
    SiteSetting.disraptor_enabled = true

    @routes.draw do
      get '/test' => 'proxy#resolve', format: false
    end
  end

  describe 'resolve' do
    it 'responds with status code 404 for non-existing route' do
      # This ensures that the second condition for a 404 isn’t true.
      SiteSetting.disraptor_app_secret_key = 'x'

      get '/test', headers: { 'X-Requested-With' => 'XMLHttpRequest' }

      expect(response.status).to eq(404)
      expect(::JSON.parse(response.body)).to eq({'failed' => 'FAILED'})
    end

    it 'responds with status code 404 when secret key is missing' do
      SiteSetting.disraptor_app_secret_key = ''

      routes = {
        '1' => {
          'id' => '1',
          'sourcePath' => '/test',
          'targetURL' => 'http://localhost:8080/test',
          'requestMethod' => 'get',
          'segments' => []
        }
      }

      PluginStore.set(Disraptor::PLUGIN_NAME, 'routes', routes)

      get '/test', headers: { 'X-Requested-With' => 'XMLHttpRequest' }

      expect(response.status).to eq(404)
    end
  end
end
