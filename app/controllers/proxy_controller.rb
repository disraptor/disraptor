class ProxyController < ApplicationController
  # For Disraptor documents (i.e. request content type is HTML), don’t respond directly.
  # Instead, wait for an XHR request from the Discourse frontend.
  before_action :check_if_disraptor_enabled, :check_xhr_for_documents, :forgery_protection_for_documents
  # Generally, skip the XHR check and respond directly with this controller.
  skip_before_action :check_xhr, :verify_authenticity_token

  def resolve
    Rails.logger.info("👻 Disraptor: Routing '#{request.method} #{request.path}' ...")

    if SiteSetting.disraptor_app_secret_key.empty?
      render json: failed_json, status: 403
      return
    end

    target_url = determine_target_url(request.path, params)

    if target_url.nil?
      render json: failed_json, status: 500
      return
    end

    Rails.logger.info("👻 Disraptor: Preparing request '#{request.method} #{target_url} #{request.format.to_s}'")

    proxy_response = send_proxy_request(request, target_url)
    response.set_header('X-Disraptor-Proxy', 'yes')

    case proxy_response.code
      when '200'
        Rails.logger.info('👻 Disraptor: Status code 200. Responding with route content.')
        proxy_response.body.gsub!(/\<i class="(fa.{0,1})\sfa-([a-zA-Z0-9\-_]*)(.*?)"(.*?)><\/i>/, '<svg class="\1 d-icon d-icon-\2 svg-icon svg-node \3" \4><use xlink:href="#\2"></use></svg>')
      when '202'
        # because AJAX stuff seems to be escaped for some reason
        # TODO: Maybe just unescape \" to "
        proxy_response.body.gsub!(/<i class=\\"(fa.{0,1})\sfa-([a-zA-Z0-9\-_]*)(.*?)\\"(.*?)><\/i>/, '<svg class=\"\1 d-icon d-icon-\2 svg-icon svg-node \3\" \4><use xlink:href=\"#\2\"></use></svg>')
      when '302', '303'
        Rails.logger.info("👻 Disraptor: Status code #{proxy_response.code}. Requesting new location #{target_url}.")

        if proxy_response.key?('Set-Cookie')
          response.set_header('Set-Cookie', proxy_response['Set-Cookie'])
        end
        if proxy_response.key?('Location')
          # Don’t use the “Location” header directly because the front end won’t be able to perform
          # the redirect via Ember transitions otherwise.
          response.set_header('X-Disraptor-Location', proxy_response['Location'])
        end
      when '404'
        Rails.logger.info('👻 Disraptor: Status code 404.')
        Rails.logger.error("❌ Disraptor: #{proxy_response}")
      else
        Rails.logger.warn("❌ Disraptor: Warning: Unhandled status code '#{proxy_response.code}'")
      end

      if Integer(proxy_response.code) < 400
        render body: proxy_response.body, status: proxy_response.code, content_type: proxy_response.content_type
      else
        render json: failed_json, status: proxy_response.code
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
    if params[:segments].kind_of?(Array)
      params[:segments].each do |segment|
        segment_name = segment.sub(/^[:*]/, '')

        if params.has_key?(segment_name)
          segment_value = params[segment_name]
          segments_map[segment] = segment_value
          source_path.sub!(segment_value, segment)
        end
      end
    end

    Rails.logger.info("👻 Disraptor: Found source path '#{source_path}'")

    route = Disraptor::Route.find_by_path(source_path)

    if route.nil?
      error_message = "Couldn’t find route for source path '#{source_path}'."
      Rails.logger.error('❌ Disraptor: Error: ' + error_message)
      return nil
    end

    target_url = route['targetUrl']

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
    target_url = URI.parse(target_url)

    use_ssl = (target_url.scheme == 'https')
    proxy_request = build_proxy_request(request, target_url)

    return Net::HTTP.start(target_url.host, target_url.port, :use_ssl => use_ssl, :read_timeout => SiteSetting.disraptor_read_timeout) { |http| http.request(proxy_request) }
  end

  # Constructs a new request object to the +target_url+ based on the incoming +request+’s method.
  #
  # * *Args*:
  #   - +request+ -> the incoming request
  #   - +target_url+ -> the target URL for the proxy request
  # * *Returns*:
  #   - a newly constructed proxy request object
  def build_proxy_request(request, target_url)
    proxy_headers = {}

    if request.cookies.any?
      escaped_cookies = request.cookies.map { |k, v| "#{CGI::escape(k)}=#{CGI::escape(v)}" }
      proxy_headers['Cookie'] = escaped_cookies.join(';')
      # sets csrftoken cookie for django applications but only if not yet set (by form)
      # TODO: Check why the cookie is not set in the first place
      if not proxy_headers['Cookie'].include? 'csrftoken'
        proxy_headers['Cookie'] = proxy_headers['Cookie'] + ";csrftoken=#{request.headers['X-CSRFToken']}"
      end
    end

    proxy_headers = set_disraptor_headers(proxy_headers)

    case request.method
    when 'GET'
      return Net::HTTP::Get.new(target_url, proxy_headers)
    when 'HEAD'
      return Net::HTTP::Head.new(target_url, proxy_headers)
    when 'POST'
      proxy_request = Net::HTTP::Post.new(target_url, proxy_headers)
      proxy_request.content_type = request.headers['CONTENT_TYPE']
      proxy_request.set_form(request.request_parameters, enctype=request.headers['CONTENT_TYPE'].split(';').first())
      return proxy_request
    when 'PUT'
      proxy_request = Net::HTTP::Put.new(target_url, proxy_headers)
      proxy_request.content_type = request.headers['CONTENT_TYPE']
      proxy_request.set_form(request.request_parameters, enctype=request.headers['CONTENT_TYPE'].split(';').first())
      return proxy_request
    when 'DELETE'
      return Net::HTTP::Delete.new(target_url, proxy_headers)
    when 'OPTIONS'
      return Net::HTTP::Options.new(target_url, proxy_headers)
    when 'TRACE'
      return Net::HTTP::Trace.new(target_url, proxy_headers)
    else
      return nil
    end
  end

  # Sets the following headers if data for them is available:
  #
  # - X-Disraptor-App-Secret-Key
  # - X-Disraptor-User
  # - X-Disraptor-Groups
  #
  # * *Args*:
  #   - +proxy_headers+ -> header fields for the proxy request
  # * *Returns*:
  #   - the proxy request headers
  def set_disraptor_headers(proxy_headers)
    proxy_headers['x-disraptor-app-secret-key'] = SiteSetting.disraptor_app_secret_key

    if current_user&.id
      proxy_headers['x-disraptor-user-id'] = current_user.id.to_s
    end

    if current_user&.username
      proxy_headers['x-disraptor-user'] = current_user.username
    end

    if current_user&.groups and not current_user&.groups.empty?
      disraptor_groups = current_user.groups
        .map{ |group| group.name }
      proxy_headers['x-disraptor-groups'] = disraptor_groups.join(',')
    end

    return proxy_headers
  end

  # Stops this controller from handling non-AJAX requests for HTML documents. Instead, it requires
  # Discourse to send an AJAX request for that document. This is necessary for rendering Disraptor
  # documents inside the context of Discourse (e.g. with the top navigation bar).
  def check_xhr_for_documents
    if request.format.html? && request.get?
      check_xhr
    end
  end

  def forgery_protection_for_documents
    if request.format.html? && request.get?
      verify_authenticity_token
    end
  end

  def check_if_disraptor_enabled
    unless SiteSetting.disraptor_enabled
      raise I18n.t('disraptor.errors.not_enabled')
    end
  end
end
