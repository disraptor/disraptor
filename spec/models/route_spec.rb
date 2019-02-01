require 'rails_helper'

describe Disraptor::Route do
  describe ".find_all()" do
    it "should return an Array" do
      expect(described_class.find_all().is_a?(Array)).to be true
    end

    it "should return an empty array" do
      expect(described_class.find_all()).to eq([])
    end

    it "should return an non-empty array" do
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

      expect(described_class.find_all()).to eq(routes.values)
    end
  end

  describe ".find_by_path(request_path)" do
    it "should return nil" do
      expect(described_class.find_by_path('/test')).to be nil
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

      expect(described_class.find_by_path('/test')).to eq(route)
    end
  end

  describe ".add(route_id, source_path, target_url, request_method)" do
    it "should add a new route" do
      route = {
        'id' => '1',
        'sourcePath' => '/test',
        'targetURL' => 'http://localhost:8080/test',
        'requestMethod' => 'get',
        'segments' => []
      }

      described_class.add('1', '/test', 'http://localhost:8080/test', 'get')

      expect(described_class.find_by_path('/test')).to eq(route)
    end
  end

  describe ".edit(route_id, source_path, target_url, request_method)" do
    it "should edit an existing route" do
      route = {
        'id' => '1',
        'sourcePath' => '/test',
        'targetURL' => 'http://localhost:8080/test',
        'requestMethod' => 'get',
        'segments' => []
      }

      route_edited = {
        'id' => '1',
        'sourcePath' => '/test',
        'targetURL' => 'http://localhost:8080/new-permalink',
        'requestMethod' => 'get',
        'segments' => []
      }

      described_class.add('1', '/test', 'http://localhost:8080/test', 'get')

      expect(described_class.find_by_path('/test')).to eq(route)

      described_class.edit('1', '/test', 'http://localhost:8080/new-permalink', 'get')

      expect(described_class.find_by_path('/test')).to eq(route_edited)
    end
  end

  describe ".remove(route_id)" do
    it "should not remove anything if the route doesn’t exist" do
      described_class.remove('1')

      expect(described_class.find_by_path('/test')).to be nil
    end

    it "should remove an existing route" do
      route = {
        'id' => '1',
        'sourcePath' => '/test',
        'targetURL' => 'http://localhost:8080/test',
        'requestMethod' => 'get',
        'segments' => []
      }

      described_class.add('1', '/test', 'http://localhost:8080/test', 'get')

      expect(described_class.find_by_path('/test')).to eq(route)

      described_class.remove('1')

      expect(described_class.find_by_path('/test')).to be nil
    end
  end
end
