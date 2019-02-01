require 'rails_helper'

describe Disraptor::RouteStore do
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

  describe ".get_route(id)" do
    it "should return nil" do
      expect(described_class.get_route('1')).to be nil
    end

    it "should return the route" do
      route = {
        'id' => '1',
        'sourcePath' => '/test',
        'targetURL' => 'http://localhost:8080/test',
        'requestMethod' => 'get',
        'segments' => []
      }

      routes = {
        '1' => route
      }

      PluginStore.set(Disraptor::PLUGIN_NAME, 'routes', routes)

      expect(described_class.get_route('1')).to eq route
    end
  end

  describe ".has_route(id)" do
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

  describe ".add_route(id, route)" do
    it "should add the route" do
      route = {
        'id' => '1',
        'sourcePath' => '/test',
        'targetURL' => 'http://localhost:8080/test',
        'requestMethod' => 'get',
        'segments' => []
      }

      described_class.add_route('1', route)

      routes = {
        '1' => route
      }

      expect(described_class.get_routes()).to eq(routes)
    end
  end

  describe ".remove_route(id)" do
    it "should remove the route" do
      expect(described_class.get_routes()).to eq({})

      route = {
        'id' => '1',
        'sourcePath' => '/test',
        'targetURL' => 'http://localhost:8080/test',
        'requestMethod' => 'get',
        'segments' => []
      }

      described_class.add_route('1', route)

      routes = {
        '1' => route
      }

      expect(described_class.get_routes()).to eq(routes)

      described_class.remove_route('1')

      expect(described_class.get_routes()).to eq({})
    end
  end
end
