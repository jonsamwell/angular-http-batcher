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
      // do a very basic check to see if query strings are encoded as dev might
      // have just added them to the url and not passed them in via the params config param to $http
      if (relativeUrlParts.length > 1 && (/%[A-F0-9]{2}/gi).test(relativeUrlParts[1]) === false) {
        // chances are they are not encoded so encode them
        encodedRelativeUrl = encodeURI(urlInfo.relativeUrl);
      } else {
        encodedRelativeUrl = encodeURI(relativeUrlParts[0]) + (relativeUrlParts.length > 1 ? '?' + relativeUrlParts[1] : '');
      }

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
    return new global.ahb.HttpBatchResponseData(request, result.statusCode, result.statusText, result.data, result.headers);
  }
}

HttpBatchAdapter.$inject = [
  '$document',
  '$window',
  'httpBatchConfig'
];

angular.module(global.ahb.name).service('httpBatchAdapter', HttpBatchAdapter);
