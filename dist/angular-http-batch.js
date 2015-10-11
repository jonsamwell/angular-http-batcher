/*
 * angular-http-batcher - v1.12.0 - 2015-10-12
 * https://github.com/jonsamwell/angular-http-batcher
 * Copyright (c) 2015 Jon Samwell
 */
(function (window, angular) {
    'use strict';

window.ahb = {
  name: 'jcs.angular-http-batch'
};

/**
 * @ngdoc overview
 * @name jcs.angular-http-batch
 *
 * @description
 * The main module which holds everything together.
 */
angular.module(window.ahb.name, []);

function HttpBatchConfigFn() {
  var allowedBatchDomains = [],
    defaultBatchAdapter = 'httpBatchAdapter',
    defaultConfiguration = {
      maxBatchedRequestPerCall: 10,
      minimumBatchSize: 2,
      batchRequestCollectionDelay: 100,
      ignoredVerbs: ['head'],
      sendCookies: false,
      enabled: true,
      adapter: defaultBatchAdapter,
      uniqueRequestName: null
    };

  /**
   * @ngdoc function
   * @name httpBatchConfig#setAllowedBatchEndpoint
   * @methodOf httpBatchConfig
   *
   * @description
   * Sets a service endpoint that is capable of accepting http batch requests.
   *
   * @Example
   * <pre>
   *  httpBatchConfig.setAllowedBatchEndpoint('https://www.mydomain.com/services/productservice', 'https://api.mydomain.com/batch', {
   *      maxBatchedRequestPerCall: 10,
   *      minimumBatchSize: 2,
   *      batchRequestCollectionDelay: 50,
   *      ignoredVerbs: ['HEAD']
   *  });
   * </pre>
   *
   * @param {string} serviceUrl The service url that is capable of receiving batch requests.
   * @param {string} batchEndpointUrl The url of an endpoint that accepts a batched request to the given service.
   * @param {Object=} config - (optional) The configuration of the batch request for this domain
   *  - **maxBatchedRequestPerCall** – `{int}` – The maximum number of single http request that are allow to be
   *      sent in one http batch request.
   *  - **minimumBatchSize** - `{int}` - Defaults to 1.  The smallest number of individual calls allowed in a batch request.
   * - **batchRequestCollectionDelay** - `{int}` - The default time in milliseconds the http batcher should wait to collection all request to this domain after
   *      the first http call that can be batched has been collect.  This defaults to 100ms.  Therefore if you send
   *      a HTTP GET call that can be batched the HTTP batcher will receive this call and wait a further 100ms before
   *      sending the call in order to wait for other calls to the same domain in order to add them to the current batch
   *      request.  If no other calls are collected the initial HTTP call will be allowed to continue as normal and will
   *      not be batched unless the config property - **minimumBatchSize** is set to one.
   *  - **ignoredVerbs** - The HTTP verbs that are ignored and not included in a batch request.  By default only HEAD request are ignored.
   *  - **sendCookies** - True indicates that cookies will be send within each request segment in the batch request.  Note
   *      only non HTTPOnly cookies can be sent as Javascript cannot access HTTPOnly cookies for security reasons.  This
   *      property is false by default to reduce request size.
   *  - **enabled** True indicates batching is enabled.  The default is true.  If the property is false the batcher will
   *      send request down the normal $http pipeline and request will not be batched.
   *  - **canBatchRequest** - An optional function which determines if the request can be batched.  It takes in the url
   *      and http method of a pending request and returns true if this request can be batched otherwise false.
   *  - **batchRequestHeaders** - An optional object of header keys and values that will be added to a batched request header's before
   *    sending to the server.
   */
  this.setAllowedBatchEndpoint = function (serviceUrl, batchEndpointUrl, config) {
    var mergedConfiguration = angular.copy(defaultConfiguration);
    if (config !== undefined) {
      angular.forEach(config, function (value, key) {
        mergedConfiguration[key] = value;
      });

      //ensure ignoreVerbs are all lowercase to avoid comparison mismatches
      angular.forEach(mergedConfiguration.ignoredVerbs, function (value, key) {
        mergedConfiguration.ignoredVerbs[key] = value.toLowerCase();
      });
    }

    mergedConfiguration.serviceUrl = serviceUrl;
    mergedConfiguration.batchEndpointUrl = batchEndpointUrl;
    mergedConfiguration.adapter = mergedConfiguration.adapter || defaultBatchAdapter;

    allowedBatchDomains.push(mergedConfiguration);
  };


  /**
   * @ngdoc function
   * @name httpBatchConfig#getBatchConfig
   * @methodOf httpBatchConfig
   *
   * @description
   * Returns the configuraiton of the batch call for the given request URL.
   * Note undefined will be returned if the request url has not be setup as a valid
   * batch endpoint in the setAllowedBatchEndpoint call.
   *
   * @param {string} url The **absolute** url of the request.
   */
  this.getBatchConfig = function (url) {
    var config, i;
    for (i = 0; i < allowedBatchDomains.length; i += 1) {
      config = allowedBatchDomains[i];
      if (url.indexOf(config.serviceUrl) > -1) {
        break;
      } else {
        config = undefined;
      }
    }

    return config;
  };


  /**
   * @ngdoc function
   * @name httpBatchConfig#canBatchCall
   * @methodOf httpBatchConfig
   *
   * @description
   * Determines if the given request is to a endpoint that accepts HTTP batch messages and the
   * HTTP verb is valid in the batch configuration of the endpoint given in the method 'setAllowedBatchEndpoint'.
   *
   * If the config property canBatchRequest is a function it is invoke here instead of the default library checks.
   *
   * @param {string} url The **absolute** url of the request.
   * @param {string} method The HTTP verb of the request i.e. POST
   */
  this.canBatchCall = function (url, method) {
    var config = this.getBatchConfig(url),
      canBatchRequestFn = config ? config.canBatchRequest : undefined,
      canBatch = false;

    if (config && config.enabled === true) {
      if (canBatchRequestFn) {
        canBatch = canBatchRequestFn(url, method);
      } else {
        canBatch = config.batchEndpointUrl !== url &&
          url.indexOf(config.batchEndpointUrl) === -1 &&
          config.ignoredVerbs.indexOf(method.toLowerCase()) === -1;
      }
    }

    return canBatch;
  };

  /**
   * @ngdoc function
   * @name httpBatchConfig#calculateBoundary
   * @methodOf httpBatchConfig
   *
   * @description
   * Returns a unique string that can be used to represent a HTTP Batch message boundary token.
   */
  this.calculateBoundary = function () {
    return new Date().getTime().toString();
  };

  this.$get = [
    function () {
      return this;
    }
  ];
}

angular.module(window.ahb.name).provider('httpBatchConfig', HttpBatchConfigFn);

/**
 *
 * @param request
 * @param statusCode
 * @param statusText
 * @param data
 * @param headers - object or string
 * @constructor
 */
function HttpBatchResponseData(request, statusCode, statusText, data, headers) {
  this.request = request;
  this.statusCode = statusCode;
  this.statusText = statusText;
  this.data = data;
  this.headers = headers;
}

window.ahb.HttpBatchResponseData = HttpBatchResponseData;

function HttpBatchAdapter($document, $window, httpBatchConfig) {
  var self = this,
    constants = {
      httpVersion: 'HTTP/1.1',
      contentType: 'Content-Type',
      newline: '\r\n',
      emptyString: '',
      singleSpace: ' ',
      forwardSlash: '/',
      doubleDash: '--',
      colon: ':',
      semiColon: ';',
      requestName: 'name='
    };

  self.key = 'httpBatchAdapter';
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
    var boundary = httpBatchConfig.calculateBoundary(),
      httpConfig = {
        method: 'POST',
        url: config.batchEndpointUrl,
        cache: false,
        headers: config.batchRequestHeaders || {}
      },
      batchBody = [],
      urlInfo, i, request, header, relativeUrlParts, encodedRelativeUrl;

    httpConfig.headers[constants.contentType] = 'multipart/mixed; boundary=' + boundary;

    for (i = 0; i < requests.length; i += 1) {
      request = requests[i];
      urlInfo = getUrlInfo(request.url);

      batchBody.push(constants.doubleDash + boundary);
      if (config.batchPartRequestHeaders) {
        for (header in config.batchPartRequestHeaders) {
          if (config.batchPartRequestHeaders.hasOwnProperty(header)) {
            var currHeader = header + constants.colon + constants.singleSpace + config.batchPartRequestHeaders[header];
            if (header.toLowerCase() === "content-disposition" && config.uniqueRequestName !== null && config.uniqueRequestName !== undefined) {
              currHeader += constants.semiColon + constants.singleSpace + constants.requestName + config.uniqueRequestName + i;
            }
            batchBody.push(currHeader);
          }
        }
      }

      batchBody.push('Content-Type: application/http; msgtype=request', constants.emptyString);

      // angular would have already encoded the parameters *if* the dev passed them in via the params parameter to $http
      // so we only need to url encode the url not the query string part
      relativeUrlParts = urlInfo.relativeUrl.split('?');
      encodedRelativeUrl = encodeURI(relativeUrlParts[0]) + (relativeUrlParts.length > 1 ? '?' + relativeUrlParts[1] : '');

      batchBody.push(request.method + ' ' + encodedRelativeUrl + ' ' + constants.httpVersion);
      batchBody.push('Host: ' + urlInfo.host);

      for (header in request.headers) {
        batchBody.push(header + constants.colon + constants.singleSpace + request.headers[header]);
      }

      if (config.sendCookies === true && $document[0].cookie && $document[0].cookie.length > 0) {
        batchBody.push('Cookie: ' + $document[0].cookie);
      }

      batchBody.push(constants.emptyString);

      if (request.data) {
        batchBody.push(request.data);
      }

      batchBody.push(constants.emptyString);
    }

    batchBody.push(constants.doubleDash + boundary + constants.doubleDash);
    httpConfig.data = batchBody.join(constants.newline);
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
      boundaryToken = findResponseBoundary(rawResponse.headers()['content-type']),
      parts = rawResponse.data.split(constants.doubleDash + boundaryToken + constants.newline),
      i,
      part,
      responseCount = 0;

    for (i = 0; i < parts.length; i += 1) {
      part = parts[i];
      if (part !== constants.emptyString) {
        batchResponses.push(processResponse(part, requests[responseCount], boundaryToken));
        responseCount += 1;
      }
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
    return true;
  }

  /**
   * mainly here to polyfill ie8 :-(
   */
  function trim(data) {
    if (data.trim) {
      data = data.trim();
    } else {
      data = data.replace(/^\s+|\s+$/g, '');
    }

    return data;
  }

  function getUrlInfo(url) {
    var protocol,
      host,
      relativeUrl,
      protocolEndIndex,
      urlParts;

    if (url.indexOf('./') > -1 || url.indexOf('../') > -1) {
      // we have a complex relative url i.e. './api/products' or '../api/products
      var parser = document.createElement('a');
      parser.href = url;
      url = parser.href;
    }

    if (url.indexOf('://') > -1) {
      protocolEndIndex = url.indexOf('://') + 3;
      urlParts = url.slice(protocolEndIndex).split(constants.forwardSlash);
      // we have an absolute url
      protocol = url.substring(0, protocolEndIndex);
      // Get the host portion of the url from '://' to the next'/'
      // [https://www.somedomain.com/]api/messages
      host = urlParts[0];
      relativeUrl = (function () {
        delete urlParts[0];
        return urlParts.join(constants.forwardSlash);
      }());
    } else {
      //we have a relative url
      relativeUrl = url;
      protocol = $window.location.protocol;
      host = $window.location.host;
    }

    return {
      protocol: protocol,
      host: host,
      relativeUrl: relativeUrl
    };
  }

  function findResponseBoundary(contentType) {
    var boundaryText = 'boundary=',
      startIndex = contentType.indexOf(boundaryText),
      endIndex = contentType.indexOf(';', startIndex),
      boundary = contentType.substring(startIndex + boundaryText.length, endIndex > 0 ? endIndex : contentType.length);

    // the boundary might be quoted so remove the quotes
    boundary = boundary.replace(/"/g, constants.emptyString);
    return boundary;
  }

  /**
   * see https://docs.angularjs.org/api/ng/service/$http#json-vulnerability-protection
   * @param data
   * @returns {*|void|string}
   */
  function trimJsonProtectionVulnerability(data) {
    return typeof (data) === 'string' ? data.replace(')]}\',\n', '') : data;
  }

  function convertDataToCorrectType(contentType, dataStr) {
    var data = dataStr;
    contentType = contentType.toLowerCase();

    if (contentType.indexOf('json') > -1) {
      // only remove json vulnerability prefix if we're parsing json
      dataStr = trimJsonProtectionVulnerability(dataStr);
      data = angular.fromJson(dataStr);
    }

    return data;
  }

  function processResponse(part, request, boundaryToken) {
    var responseParts = part.split(constants.newline),
      result = {
        headers: {}
      },
      responsePart,
      i, j, regex, lineParts, headerParts, parsedSpaceBetweenHeadersAndMessage = false;

    for (i = 0; i < responseParts.length; i += 1) {
      responsePart = responseParts[i];
      if (responsePart === constants.emptyString) {
        parsedSpaceBetweenHeadersAndMessage = result.contentType !== undefined;
        continue;
      }

      if (result.contentType === undefined && responsePart.indexOf('-Type') !== -1 && responsePart.indexOf('; msgtype=response') === -1) {
        result.contentType = responsePart.split(constants.forwardSlash)[1];
      } else if (result.contentType !== undefined && parsedSpaceBetweenHeadersAndMessage === false) {
        headerParts = responsePart.split(constants.colon);
        result.headers[headerParts[0]] = trim(headerParts[1]);
      } else if (result.statusCode === undefined && responsePart.indexOf(constants.httpVersion) !== -1) {
        lineParts = responsePart.split(constants.singleSpace);
        result.statusCode = parseInt(lineParts[1], 10);
        result.statusText = lineParts.slice(2).join(constants.singleSpace);
      } else if (result.data === undefined && parsedSpaceBetweenHeadersAndMessage) {
        // need to get all the lines left apart from the last multipart seperator.
        result.data = '';
        j = 1;
        regex = new RegExp('--' + boundaryToken + '--', 'i');
        while (regex.test(responsePart) === false && ((i + j) <= responseParts.length)) {
          result.data += responsePart;
          responsePart = responseParts[i + j];
          j += 1;
        }

        result.data = convertDataToCorrectType(result.contentType, result.data);
        break;
      }
    }

    result.headers[constants.contentType] = result.contentType;
    return new window.ahb.HttpBatchResponseData(request, result.statusCode, result.statusText, result.data, result.headers);
  }
}

HttpBatchAdapter.$inject = [
  '$document',
  '$window',
  'httpBatchConfig'
];

angular.module(window.ahb.name).service('httpBatchAdapter', HttpBatchAdapter);

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
   * @returns {Array.HttpBatchResponseData[]}
   */
  function parseResponseFn(requests, rawResponse) {
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
   * @returns {boolean} false to indicate the request type is not supported.
   */
  function canBatchRequestFn(request) {
    return request.method === 'GET';
  }
}

angular.module(window.ahb.name).service('nodeJsMultiFetchAdapter', NodeJsMultiFetchAdapter);

function convertHeadersToString(headers) {
  var property,
    result = '';
  for (property in headers) {
    result += property + ': ' + headers[property] + '\n';
  }

  return result;
}

function getAdapterFn() {
  var adapter = this.config.adapter;
  if (typeof adapter === 'object') {
    if (adapter.buildRequest === undefined || adapter.parseResponse === undefined) {
      throw new Error('A custom adapter must contain the methods "buildRequest" and "parseResponse" - please see the docs');
    }
  } else if (typeof adapter === 'string') {
    adapter = this.adapters[adapter];
    if (adapter === undefined) {
      throw new Error('Unknown type of http batch adapter: ' + this.config.adapter);
    }
  }

  return adapter;
}

function addRequestFn(request) {
  this.requests.push(request);

  if (this.requests.length >= this.config.maxBatchedRequestPerCall) {
    this.flush();
  }

  return true;
}

function sendFn() {
  var self = this,
    adapter = self.getAdapter(),
    httpBatchConfig = adapter.buildRequest(self.requests, self.config);

  self.sendCallback();
  self.$injector.get('$http')(httpBatchConfig).then(function (response) {
    var batchResponses = adapter.parseResponse(self.requests, response, self.config);

    angular.forEach(batchResponses, function (batchResponse) {
      batchResponse.request.callback(
        batchResponse.statusCode,
        batchResponse.data,
        convertHeadersToString(batchResponse.headers),
        batchResponse.statusText);
    });
  }, function (err) {
    angular.forEach(self.requests, function (request) {
      request.callback(err.statusCode, err.data, err.headers, err.statusText);
    });
  });
}

function flushFn() {
  this.$timeout.cancel(this.currentTimeoutToken);
  this.currentTimeoutToken = undefined;
  this.send();
}

function BatchRequestManager($injector, $timeout, adapters, config, sendCallback) {
  var self = this;
  this.$injector = $injector;
  this.$timeout = $timeout;
  this.adapters = adapters;
  this.config = config;
  this.sendCallback = sendCallback;
  this.requests = [];

  this.currentTimeoutToken = $timeout(function () {
    self.currentTimeoutToken = undefined;
    if (self.requests.length < self.config.minimumBatchSize) {
      self.sendCallback();
      // should let the request continue normally
      angular.forEach(self.requests, function (request) {
        request.continueDownNormalPipeline();
      });
    } else {
      self.send($injector);
    }

  }, config.batchRequestCollectionDelay, false);
}

BatchRequestManager.prototype.getAdapter = getAdapterFn;
BatchRequestManager.prototype.send = sendFn;
BatchRequestManager.prototype.addRequest = addRequestFn;
BatchRequestManager.prototype.flush = flushFn;

function HttpBatcherFn($injector, $timeout, httpBatchConfig, httpBatchAdapter, nodeJsMultiFetchAdapter) {
  var self = this,
    currentBatchedRequests = {},
    adapters = {
      httpBatchAdapter: httpBatchAdapter,
      nodeJsMultiFetchAdapter: nodeJsMultiFetchAdapter
    };

  self.canBatchRequest = canBatchRequestFn;
  self.batchRequest = batchRequestFn;
  self.flush = flushInternalFn;

  function canBatchRequestFn(url, method) {
    return httpBatchConfig.canBatchCall(url, method);
  }

  function batchRequestFn(request) {
    var batchConfig = httpBatchConfig.getBatchConfig(request.url),
      batchRequestManager = currentBatchedRequests[batchConfig.batchEndpointUrl];

    if (batchRequestManager === undefined) {
      batchRequestManager = new BatchRequestManager($injector, $timeout, adapters, batchConfig, function () {
        // this removes the batch request that will be sent from the list of pending calls.
        delete currentBatchedRequests[batchConfig.batchEndpointUrl];
      });

      currentBatchedRequests[batchConfig.batchEndpointUrl] = batchRequestManager;
    }

    batchRequestManager.addRequest(request);
  }

  function flushInternalFn(batchEndpointUrl) {
    angular.forEach(currentBatchedRequests, function (val, key) {
      var shouldFlush = batchEndpointUrl === undefined || batchEndpointUrl && key.toLocaleLowerCase() === batchEndpointUrl.toLocaleLowerCase();
      if (shouldFlush) {
        val.flush();
      }
    });
  }
}

HttpBatcherFn.$inject = [
  '$injector',
  '$timeout',
  'httpBatchConfig',
  'httpBatchAdapter',
  'nodeJsMultiFetchAdapter'
];

angular.module(window.ahb.name).service('httpBatcher', HttpBatcherFn);

function HttpBackendDecorator($delegate, httpBatcher) {
  var $httpBackendFn = function (method, url, post, callback, headers, timeout, withCredentials, responseType) {
    var self = this,
      callArgs = arguments;
    if (httpBatcher.canBatchRequest(url, method)) {
      httpBatcher.batchRequest({
        method: method,
        url: url,
        data: post,
        callback: callback,
        headers: headers,
        timeout: timeout,
        withCredentials: withCredentials,
        responseType: responseType,
        continueDownNormalPipeline: function () {
          $delegate.apply(self, callArgs);
        }
      });
    } else {
      // could use '.call' here as it is quicker but using apply enables us to pass param array
      // and be forward/backward compatible with all the Angular versions.
      return $delegate.apply(this, arguments);
    }
  };

  // If we are testing using angular-mocks we need to provide their special methods
  // on the function we are returning otherwise your tests won't work :-(.
  if (angular.mock) {
    angular.forEach($delegate, function (fn, key) {
      $httpBackendFn[key] = fn;
    });
  }

  return $httpBackendFn;
}

HttpBackendDecorator.$inject = [
  '$delegate',
  'httpBatcher'
];

function ProviderDecoratorFn($provide) {
  $provide.decorator('$httpBackend', HttpBackendDecorator);
}

ProviderDecoratorFn.$inject = [
  '$provide'
];

angular.module(window.ahb.name).config(ProviderDecoratorFn);

}(window, angular));
