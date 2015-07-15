/*
 * angular-http-batcher - v1.10.0 - 2015-07-15
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

angular.module(window.ahb.name).provider('httpBatchConfig', [

    function () {
        'use strict';

        var allowedBatchDomains = [],
            defaultConfiguration = {
                maxBatchedRequestPerCall: 10,
                minimumBatchSize: 2,
                batchRequestCollectionDelay: 100,
                ignoredVerbs: ['head'],
                sendCookies: false,
                enabled: true
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
]);

angular.module(window.ahb.name).factory('httpBatcher', [
    '$injector',
    '$document',
    '$window',
    '$timeout',
    'httpBatchConfig',
    function ($injector, $document, $window, $timeout, httpBatchConfig) {
        'use strict';

        var constants = {
                httpVersion: 'HTTP/1.1',
                newline: '\r\n',
                emptyString: '',
                singleSpace: ' ',
                forwardSlash: '/',
                doubleDash: '--',
                colon: ':'
            },

            currentBatchedRequests = {},

            BatchRequestPartParser = function (part, request, boundaryToken) {
                this.part = part;
                this.request = request;
                this.boundaryToken = boundaryToken;
            },

            BatchRequestManager = function (config, sendCallback) {
                var self = this;
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
                        self.send();
                    }

                }, config.batchRequestCollectionDelay, false);
            },

            canBatchRequest = function (url, method) {
                return httpBatchConfig.canBatchCall(url, method);
            },

            batchRequest = function (request) {
                var batchConfig = httpBatchConfig.getBatchConfig(request.url),
                    batchRequestManager = currentBatchedRequests[batchConfig.batchEndpointUrl];

                if (batchRequestManager === undefined) {
                    batchRequestManager = new BatchRequestManager(batchConfig, function () {
                        // this removes the batch request that will be sent from the list of pending calls.
                        delete currentBatchedRequests[batchConfig.batchEndpointUrl];
                    });
                    currentBatchedRequests[batchConfig.batchEndpointUrl] = batchRequestManager;
                }

                batchRequestManager.addRequest(request);
            },

            flush = function (batchEndpointUrl) {
                angular.forEach(currentBatchedRequests, function (val, key) {
                    var shouldFlush = batchEndpointUrl === undefined || batchEndpointUrl && key.toLocaleLowerCase() === batchEndpointUrl.toLocaleLowerCase();
                    if (shouldFlush) {
                        val.flush();
                    }
                });
            };

        BatchRequestPartParser.prototype = (function () {
            var convertDataToCorrectType = function (contentType, dataStr) {
                    var data = dataStr;
                    contentType = contentType.toLowerCase();

                    // what other types should we support? XML maybe?
                    if (contentType.indexOf('json') > -1) {
                        data = angular.fromJson(dataStr);
                    }

                    return data;
                },

                // mainly here to polyfill ie8 :-(
                trim = function (data) {
                    if (data.trim) {
                        data = data.trim();
                    } else {
                        data = data.replace(/^\s+|\s+$/g, '');
                    }

                    return data;
                },

                convertHeadersToString = function (headers) {
                    var property,
                        result = '';
                    for (property in headers) {
                        result += property + ': ' + headers[property] + '\n';
                    }

                    return result;
                },

                process = function () {
                    var responseParts = this.part.split(constants.newline),
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
                            regex = new RegExp('--' + this.boundaryToken + '--', 'i');
                            while (regex.test(responsePart) === false && ((i + j) <= responseParts.length)) {
                                result.data += responsePart;
                                responsePart = responseParts[i + j];
                                j += 1;
                            }

                            result.data = convertDataToCorrectType(result.contentType, result.data);
                            break;
                        }
                    }

                    result.headers['Content-Type'] = result.contentType;
                    result.headerString = convertHeadersToString(result.headers);
                    this.request.callback(result.statusCode, result.data, result.headerString, result.statusText);
                };

            return {
                process: process
            };
        }());

        BatchRequestManager.prototype = (function () {
            var
            /**
             * https://developers.google.com/storage/docs/json_api/v1/how-tos/batch
             * http://blogs.msdn.com/b/webdev/archive/2013/11/01/introducing-batch-support-in-web-api-and-web-api-odata.aspx
             * @param request - the collection of http request to build into a http batch request.
             * @returns {object} - a http config object.
             */
                buildBatchRequest = function (requests, config) {
                    var boundary = httpBatchConfig.calculateBoundary(),
                        httpConfig = {
                            method: 'POST',
                            url: config.batchEndpointUrl,
                            cache: false,
                            headers: config.batchRequestHeaders || {}
                        },
                        batchBody = [],
                        urlInfo, i, request, header;

                    httpConfig.headers['Content-Type'] = 'multipart/mixed; boundary=' + boundary;

                    for (i = 0; i < requests.length; i += 1) {
                        request = requests[i];
                        urlInfo = getUrlInfo(request.url);

                        batchBody.push(constants.doubleDash + boundary);
                        if (config.batchPartRequestHeaders) {
                            for (header in config.batchPartRequestHeaders) {
                                batchBody.push(header + constants.colon + constants.singleSpace + config.batchPartRequestHeaders[header]);
                            }
                        }

                        batchBody.push('Content-Type: application/http; msgtype=request', constants.emptyString);

                        batchBody.push(request.method + ' ' + urlInfo.relativeUrl + ' ' + constants.httpVersion);
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
                },

                send = function () {
                    var self = this;
                    this.sendCallback();
                    $injector.get('$http')(buildBatchRequest(this.requests, this.config)).then(function (response) {
                        var boundaryToken = findResponseBoundary(response.headers()['content-type']),
                            parts = response.data.split(constants.doubleDash + boundaryToken + constants.newline),
                            i,
                            part,
                            responseParser,
                            responseCount = 0;

                        for (i = 0; i < parts.length; i += 1) {
                            part = parts[i];
                            if (part !== constants.emptyString) {
                                responseParser = new BatchRequestPartParser(part, self.requests[responseCount], boundaryToken);
                                responseParser.process();
                                responseCount += 1;
                            }
                        }
                    }, function (err) {
                        angular.forEach(self.requests, function (request) {
                            request.callback(err.statusCode, err.data, err.headers, err.statusText);
                        });
                    });
                },

                addRequest = function (request) {
                    this.requests.push(request);

                    if (this.requests.length >= this.config.maxBatchedRequestPerCall) {
                        this.flush();
                    }

                    return true;
                },

                flush = function () {
                    $timeout.cancel(this.currentTimeoutToken);
                    this.currentTimeoutToken = undefined;
                    this.send();
                },

                getUrlInfo = function (url) {
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
                },

                findResponseBoundary = function (contentType) {
                    var boundaryText = 'boundary=',
                        startIndex = contentType.indexOf(boundaryText),
                        boundary = contentType.substring(startIndex + boundaryText.length);

                    // the boundary might be quoted so remove the quotes
                    boundary = boundary.replace(/"/g, constants.emptyString);
                    return boundary;
                };

            return {
                addRequest: addRequest,
                send: send,
                flush: flush
            };
        }());

        return {
            canBatchRequest: canBatchRequest,
            batchRequest: batchRequest,
            flush: flush
        };
    }
]);

angular.module(window.ahb.name).config(['$provide',
    function ($provide) {
        'use strict';

        $provide.decorator('$httpBackend', [
            '$delegate',
            'httpBatcher',
            function ($delegate, httpBatcher) {
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
        ]);
    }
]);

}(window, angular));
