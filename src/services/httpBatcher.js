angular.module(window.ahb.name).factory('httpBatcher', [
    '$injector',
    '$location',
    '$timeout',
    'httpBatchConfig',
    function ($injector, $location, $timeout, httpBatchConfig) {
        'use strict';

        var constants = {
                httpVersion: 'HTTP/1.1',
                newline: '\r\n',
                emptyString: '',
                singleSpace: ' ',
                forwardSlash: '/',
                doubleDash: '--'
            },

            BatchRequestPartParser = function (part, request) {
                this.part = part;
                this.request = request;
            },

            BatchRequestManager = function (config, sendCallback) {
                var self = this;
                this.config = config;
                this.sendCallback = sendCallback;
                this.requests = [];

                $timeout(function () {
                    self.send();
                }, config.batchRequestCollectionDelay, false);
            };

        BatchRequestPartParser.prototype = (function () {
            var process = function () {
                var responseParts = this.part.split(constants.newline),
                    result = {},
                    responsePart,
                    i;

                debugger;
                for (i = 0; i < responseParts.length; i += 1) {
                    responsePart = responseParts[i];
                    if (result.contentType === undefined && responsePart.indexOf('-type') !== -1) {

                    } else if (result.statusCode === undefined && responsePart.indexOf(constants.httpVersion) !== -1) {
                        var lineParts = responsePart.split(constants.singleSpace);
                        result.statusCode = lineParts[1];
                        result.statusText = lineParts[2];
                    }
                }

                this.request.callback();
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
                            headers: {
                                'Content-Type': 'multipart/mixed; boundary=' + boundary
                            }
                        },
                        batchBody = [],
                        urlInfo, i, request;

                    for (i = 0; i < requests.length; i += 1) {
                        request = requests[i];
                        urlInfo = getUrlInfo(request.url);

                        batchBody.push(constants.doubleDash + boundary);
                        batchBody.push('Content-Type: application/http; msgtype=request', constants.emptyString);

                        batchBody.push(request.method + ' ' + urlInfo.relativeUrl + ' ' + constants.httpVersion);
                        batchBody.push('Host: ' + urlInfo.host, '');

                        if (request.method !== 'GET' && request.method !== 'DELETE') {
                            batchBody.push('Content-Type: ' + request.contentType, constants.emptyString);
                        }

                        if (request.data) {
                            batchBody.push(angular.toJson(request.data));
                        }

                        batchBody.push(constants.emptyString);
                        batchBody.push(constants.doubleDash + boundary + constants.doubleDash);
                    }

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
                                responseParser = new BatchRequestPartParser(part, self.requests[responseCount]);
                                responseParser.process();
                                responseCount += 1;
                            }
                        }
                    }, function (err) {
                        //alert(err);
                    });
                },

                addRequest = function (request) {
                    this.requests.push(request);
                    return true;
                },

                getUrlInfo = function (url) {
                    var protocolEndIndex = url.indexOf('://') + 3,
                        urlParts = url.slice(protocolEndIndex).split(constants.forwardSlash);
                    return {
                        protocol: url.substring(0, protocolEndIndex),
                        // Get the host portion of the url from '://' to the next'/'
                        // [https://www.somedomain.com/]api/messages
                        host: urlParts[0],
                        relativeUrl: (function () {
                            delete urlParts[0];
                            return urlParts.join(constants.forwardSlash);
                        }())
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
                send: send
            };
        }());

        var currentBatchedRequests = {},

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
            };

        return {
            canBatchRequest: canBatchRequest,
            batchRequest: batchRequest
        };
    }
]);
