require 'rails_helper'

# Important note:
#
# All test requests in here need to explictly set the following header:
#
# X-Requested-With: XMLHttpRequest
#
# Without it, some kind of default controller and action will be used instead of the intended
# controller. This is a hard-to-debug problem because the logger output will wrongfully state that
# `ProxyController#resolve` is used which is not really true.
#
# To make matters worse, this default version of `ProxyController#resolve` will always respond with
# a status code 200. ¯\_(ツ)_/¯
describe ProxyController do
  before do
    SiteSetting.disraptor_enabled = true

    @routes.draw do
      get '/test' => 'proxy#resolve', format: false
    end

    stub_request(:get, 'http://localhost:8090/test').
      with(
        headers: {
          'Accept' => '*/*',
          'Accept-Encoding' => 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
          'User-Agent' => 'Ruby',
          'X-Disraptor-App-Secret-Key' => 'x'
        }).
      to_return(status: 404, body: '', headers: {})
  end

  describe 'resolve' do
    it 'responds with status code 404 for non-existing route' do
      # This ensures that the second condition for the initial 404 check isn’t true.
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

    it 'responds with status code 404 when targetURL produces a status code 404' do
      SiteSetting.disraptor_app_secret_key = 'x'

      routes = {
        '1' => {
          'id' => '1',
          'sourcePath' => '/test',
          'targetURL' => 'http://localhost:8090/test',
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
