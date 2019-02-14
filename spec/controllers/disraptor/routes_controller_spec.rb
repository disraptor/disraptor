require 'rails_helper'

describe Disraptor::RoutesController do
  routes { Disraptor::RoutesEngine.routes }

  before do
    SiteSetting.disraptor_enabled = true
  end

  describe 'index' do
    it 'returns status code 200' do
      get :index, format: :json
      expect(response.status).to eq(200)
    end

    it 'returns an empty payload' do
      get :index, format: :json
      expect(response.status).to eq(200)

      response_payload = ::JSON.parse(response.body)['disraptor/routes']
      expect(response_payload).to eq([])
    end
  end

  describe 'update' do
    it 'returns payload as JSON' do
      put :update, params: {
        'route_id' => '1',
        'disraptor/route' => {
          'sourcePath' => '/test',
          'targetURL' => 'http://localhost:8080/test',
          'requestMethod' => 'get'
        },
        'segments' => []
      }, format: :json

      expect(response.status).to eq(200)

      response_payload = ::JSON.parse(response.body)['disraptor/route']
      expect(response_payload['id']).to eq('1')
      expect(response_payload['sourcePath']).to eq('/test')
      expect(response_payload['targetURL']).to eq('http://localhost:8080/test')
      expect(response_payload['requestMethod']).to eq('get')

      get :index
      expect(response.status).to eq(200)
      expect(::JSON.parse(response.body)['disraptor/routes'].length).to eq(1)
    end
  end

  describe 'destroy' do
    it 'returns the failed JSON' do
      delete :destroy, params: {
        'route_id' => '1'
      }, format: :json

      expect(response.status).to eq(200)
      expect(::JSON.parse(response.body)).to eq({'failed' => 'FAILED'})
    end

    it 'returns the success JSON' do
      put :update, params: {
        'route_id' => '1',
        'disraptor/route' => {
          'sourcePath' => '/test',
          'targetURL' => 'http://localhost:8080/test',
          'requestMethod' => 'get'
        },
        'segments' => []
      }, format: :json

      expect(response.status).to eq(200)

      delete :destroy, params: {
        'route_id' => '1'
      }, format: :json

      expect(response.status).to eq(200)
      expect(::JSON.parse(response.body)).to eq({'success' => 'OK'})
    end
  end
end
