require 'rails_helper'

describe Disraptor::RoutesController do
  routes { Disraptor::Engine.routes }

  it ':index returns status code 200' do
    get :index
    expect(response.status).to eq(200)
  end
end
