class DisraptorRoutesController < ApplicationController
  # For Disraptor documents (i.e. request content type is HTML), don’t respond directly.
  # Instead, wait for an XHR request from the Discourse frontend.
  before_action :check_if_disraptor_enabled, :check_xhr_for_documents, :forgery_protection_for_documents
  # Generally, skip the XHR check and respond directly with this controller.
  skip_before_action :check_xhr, :verify_authenticity_token

  # Handles requests for regular paths like /example for routes with a source path /example.
  def show
    Rails.logger.info("👻 Disraptor: Requesting path '#{request.path}'")

    target_url = determine_target_url(request.path, params)

    if target_url
      send_proxy_request(request, target_url)
    else
      render body: nil, status: 404
    end
  end

  private

  # Determines the outgoing target URL for the incoming +request+.
  #
  # * *Args*:
  #   - +request_path+ -> the incoming request path
  #   - +params+ -> the incoming request’s parameters
  # * *Returns*:
  #   - the target URL for the outgoing request
  def determine_target_url(request_path, params)
    source_path = request_path
    segments_map = {}

    # Construct the source path for lookup
    params[:segments].each do |segment|
      segment_name = segment.sub(/^[:*]/, '')

      if params.has_key?(segment_name)
        segment_value = params[segment_name]
        segments_map[segment] = segment_value
        source_path.sub!(segment_value, segment)
      end
    end

    Rails.logger.info("👻 Disraptor: Found source path '#{source_path}'")

    route = Disraptor::Route.find_by_path(source_path)

    if route.nil?
      error_message = "Couldn’t find route for source path '#{source_path}'."
      Rails.logger.error('❌ Disraptor: Error: ' + error_message)
      return
    end

    target_url = route['targetURL']

    segments_map.each do |segment_name, segment_value|
      target_url.sub!(segment_name, segment_value)
    end

    return target_url
  end

  # Sends a proxy request based on the incoming +request+.
  #
  # * *Args*:
  #   - +request+ -> the incoming request
  #   - +target_url+ -> the target URL for the proxy request
  def send_proxy_request(request, target_url)
    Rails.logger.info('👻 Disraptor: Routing to ' + target_url)
    url = URI.parse(target_url)
    proxy_request = Net::HTTP::Get.new(url.to_s, {'Content-Type' => request.format.to_s})
    proxy_response = Net::HTTP.start(url.host, url.port) { |http| http.request(proxy_request) }

    if proxy_response.code == '404'
      Rails.logger.info('👻 Disraptor: Target URL responds with status code 404.')
      render body: nil, status: 404
    else
      Rails.logger.info('👻 Disraptor: Responding with route content.')
      render body: proxy_response.body, content_type: proxy_response.content_type
    end
  end

  # Stops this controller from handling non-AJAX requests for HTML documents. Instead, it requires
  # Discourse to send an AJAX request for that document. This is necessary for rendering Disraptor
  # documents inside the context of Discourse (e.g. with the top navigation bar).
  def check_xhr_for_documents
    if request.format == 'text/html' && request.get?
      check_xhr
    end
  end

  def forgery_protection_for_documents
    if request.format == 'text/html' && request.get?
      verify_authenticity_token
    end
  end

  def check_if_disraptor_enabled
    unless SiteSetting.disraptor_enabled
      raise I18n.t('disraptor.errors.not_enabled')
    end
  end
end
