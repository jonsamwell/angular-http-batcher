function NodeJsMultiFetchAdapter() {
  var self = this;

  self.key = 'nodeJsMultiFetchAdapter';
  self.buildRequest = buildRequestFn;
  self.parseResponse = parseResponseFn;
  self.canBatchRequest = canBatchRequestFn;

  /**
   * Builds the single batch request from the given batch of pending requests.
   * Returns a standard angular httpConfig object that will be use to invoke the $http service.
   * See:
   * https://developers.google.com/storage/docs/json_api/v1/how-tos/batch
   * http://blogs.msdn.com/b/webdev/archive/2013/11/01/introducing-batch-support-in-web-api-and-web-api-odata.aspx
   *
   * @param requests - the collection of pending http request to build into a single http batch request.
   * @param config - the http batch config.
   * @returns {object} - a http config object.
   */
  function buildRequestFn(requests, config) {
    var httpConfig = {
        method: 'GET',
        url: config.batchEndpointUrl + '?',
        cache: false,
        headers: config.batchRequestHeaders || {}
      },
      encodedUrl, i, request,
      urlParts;

    for (i = 0; i < requests.length; i += 1) {
      request = requests[i];
      urlParts = request.url.split('?');

      encodedUrl = urlParts[0].replace(config.serviceUrl, '');
      if (urlParts.length > 1) {
        encodedUrl += '?' + encodeURIComponent(urlParts[1]);
      }

      if (i > 0) {
        httpConfig.url += '&';
      }

      httpConfig.url += i.toString() + '=' + encodedUrl;
    }

    return httpConfig;
  }

  /**
   * Parses the raw response into an array of HttpBatchResponseData objects.  If is this methods job
   * to parse the response and match it up with the orginal request object.
   * @param rawResponse
   * @param config
   * @returns {Array.HttpBatchResponseData[]}
   */
  function parseResponseFn(requests, rawResponse, config) {
    var batchResponses = [],
      i, request,
      responseData = rawResponse.data,
      dataPart;

    for (i = 0; i < requests.length; i += 1) {
      request = requests[i];
      dataPart = responseData[i.toString()];

      batchResponses.push(new window.ahb.HttpBatchResponseData(
        request,
        dataPart.statusCode,
        '',
        dataPart.body,
        dataPart.headers));
    }

    return batchResponses;
  }

  /**
   * Gaurd method to ensure the adapter supports this given request.
   * @param request
   * @param config
   * @returns {boolean} false to indicate the request type is not supported.
   */
  function canBatchRequestFn(request, config) {
    return request.method === 'GET';
  }
}

angular.module(window.ahb.name).service('nodeJsMultiFetchAdapter', NodeJsMultiFetchAdapter);
