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

    @test_route = {
      'id' => '1',
      'sourcePath' => '/test',
      'targetURL' => 'http://localhost:8080/test',
      'requestMethod' => 'get',
      'segments' => []
    }

    @routes.draw do
      get '/test' => 'proxy#resolve', format: false
    end

    stub_request(:get, 'http://localhost:8080/test-404')
      .with(headers: {
        'X-Disraptor-App-Secret-Key' => 'x'
      })
      .to_return(status: 404, body: '')

    stub_request(:get, 'http://localhost:8080/test-200')
      .with(headers: {
        'X-Disraptor-App-Secret-Key' => 'x'
      })
      .to_return(status: 200, body: 'Actual content')

    stub_request(:get, 'http://localhost:8080/test-303')
      .with(headers: {
        'X-Disraptor-App-Secret-Key' => 'x'
      })
      .to_return(status: 303, body: 'Actual content', headers: {
        'Location' => 'http://localhost:8080/test-200'
      })
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

      @test_route['targetURL'] = 'http://localhost:8080/test-doesnt-exist'
      PluginStore.set(Disraptor::PLUGIN_NAME, 'routes', { '1' => @test_route })

      get '/test', headers: { 'X-Requested-With' => 'XMLHttpRequest' }

      expect(response.status).to eq(404)
      expect(::JSON.parse(response.body)).to eq({'failed' => 'FAILED'})
    end

    it 'responds with status code 404 when targetURL produces a status code 404' do
      SiteSetting.disraptor_app_secret_key = 'x'

      @test_route['targetURL'] = 'http://localhost:8080/test-404'
      PluginStore.set(Disraptor::PLUGIN_NAME, 'routes', { '1' => @test_route })

      get '/test', headers: { 'X-Requested-With' => 'XMLHttpRequest' }

      expect(response.status).to eq(404)
      expect(::JSON.parse(response.body)).to eq({'failed' => 'FAILED'})
    end

    it 'responds with status code 200 when targetURL produces a status code 200' do
      SiteSetting.disraptor_app_secret_key = 'x'

      @test_route['targetURL'] = 'http://localhost:8080/test-200'
      PluginStore.set(Disraptor::PLUGIN_NAME, 'routes', { '1' => @test_route })

      get '/test', headers: { 'X-Requested-With' => 'XMLHttpRequest' }

      expect(response.status).to eq(200)
      expect(response.body).to eq('Actual content')
    end

    it 'responds with status code 303 when targetURL produces a status code 303' do
      SiteSetting.disraptor_app_secret_key = 'x'

      @test_route['targetURL'] = 'http://localhost:8080/test-303'
      PluginStore.set(Disraptor::PLUGIN_NAME, 'routes', { '1' => @test_route })

      get '/test', headers: { 'X-Requested-With' => 'XMLHttpRequest' }

      expect(response.status).to eq(303)
      expect(response.body).to eq('Actual content')
      expect(response.headers['x-disraptor-location']).to eq('http://localhost:8080/test-200')
    end
  end
end
