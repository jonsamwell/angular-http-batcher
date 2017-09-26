(function() {
  'use strict';

  var adapterKey = 'npmBatchRequestAdapter';
  var HttpBatchResponseData = window.ahb.HttpBatchResponseData;

  /**
   * HTTP Adapter for angular-http-batcher for converting multiple requests into a single
   * request using the batch-request format.
   */
  function NpmBatchRequestAdapter() {
    this.key = adapterKey;
  }

  /**
   * Transforms a GET request to the format expected by batch-request and attaches it to
   * the httpConfig Object.
   *
   * @param requestIndex (Integer) - the index of the request in the pool of requests
   * @param request (Object) - the Angular $http config Object for the request
   * @param httpConfig (Object) - the Angular $http config Object for the batched request
   */
  function transformGETRequest(requestIndex, request, httpConfig) {
    var paramSerializer;

    httpConfig.data[requestIndex] = {
      method:   request.method,
      uri:      request.url,
      headers:  request.headers
    };
  }

  /**
   * Transforms any request with a body to the format expected by batch-request and attaches
   * it to the httpConfig Object.
   *
   * @param requestIndex (Integer) - the index of the request in the pool of requests
   * @param request (Object) - the Angular $http config Object for the request
   * @param httpConfig (Object) - the Angular $http config Object for the batched request
   */
  function transformRequestWithBody(requestIndex, request, httpConfig) {
    httpConfig.data[requestIndex] = {
      method:   request.method,
      uri:      request.url,
      headers:  request.headers,
      body:     request.data
    };
  }

  /**
   * Builds the single batch request from the given batch of pending requests.
   *
   * @throws (Error) If the requests do not use the same HTTP method
   *
   * @param requests (Object[]) - the collection of standard Angular $http config Objects
   *  that should be bundled into a single batch request
   * @param config (Object) - the http-batch configuration Object
   *
   * @return (Object) a standard Angular $http config Object for a batch request that
   *  represents all the provided requests
   */
  NpmBatchRequestAdapter.prototype.buildRequest = function buildRequest(requests, config) {
    var requestIndex;
    var transformRequest;
    var httpConfig = {
      method:   'POST',
      url:      config.batchEndpointUrl,
      headers:  config.batchRequestHeaders || {},
      data:     {}
    };

    for(requestIndex = 0; requestIndex < requests.length; requestIndex++) {
      switch(requests[requestIndex].method) {
        case 'GET':
          transformRequest = transformGETRequest;

          break;
        default:
          transformRequest = transformRequestWithBody;
      }

      transformRequest(requestIndex, requests[requestIndex], httpConfig);
    }

    return httpConfig;
  };

  /**
   * Parses the raw response from the server and maps each response to the request to which
   * the server is responding.
   *
   * @param requests (Object[]) - the collection of standard Angular $http config Objects
   *  originally provided when generating the batch request
   * @param rawResponse (Object) - the raw response returned from the server
   *
   * @return (HttpBatchResponseData[]) an array of the HttpBatchResponseData generated from
   *  the rawResponse
   */
  NpmBatchRequestAdapter.prototype.parseResponse = function parseResponse(requests, rawResponse) {
    var requestIndex;
    var batchResponses = [];
    var response;

    for(requestIndex = 0; requestIndex < requests.length; requestIndex++) {
      response = rawResponse.data[requestIndex];

      batchResponses.push(new HttpBatchResponseData(
        requests[requestIndex],
        response.statusCode,
        '',
        response.body,
        response.headers
      ));
    }

    return batchResponses;
  };

  /**
   * Guard method.  Always returns true.
   *
   * @param request (Object) - the standard Angular $http config Object for the request that
   *  might be pooled with other requests
   *
   * @return (Boolean) true iff the request can be batched with other requests; false
   *  otherwise
   */
  NpmBatchRequestAdapter.prototype.canBatchRequest = function canBatchRequest(request) {
    return true;
  };

  angular.module(window.ahb.name).service(adapterKey, NpmBatchRequestAdapter);
})();
