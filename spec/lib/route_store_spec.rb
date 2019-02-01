require 'rails_helper'

describe Disraptor::RouteStore do
  before do
    # PluginStore.set(Disraptor::PLUGIN_NAME, 'routes', {})
  end

  describe ".get_routes()" do
    it "should return a Hash" do
      expect(described_class.get_routes().is_a?(Hash)).to be true
    end

    it "should return an empty hash" do
      expect(described_class.get_routes()).to eq({})
    end

    it "should return an non-empty hash" do
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

      expect(described_class.get_routes()).to eq(routes)
    end
  end

  describe ".has_route('1')" do
    it "should return false" do
      expect(described_class.has_route('1')).to be false
    end

    it "should return true" do
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

      expect(described_class.has_route('1')).to be true
    end
  end
end
