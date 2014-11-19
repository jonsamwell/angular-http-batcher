angular.module(window.ahb.name).factory('httpBatcher', [
    '$injector',
    '$window',
    '$timeout',
    'httpBatchConfig',
    function ($injector, $window, $timeout, httpBatchConfig) {
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

            BatchRequestPartParser = function (part, request) {
                this.part = part;
                this.request = request;
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
                            regex = new RegExp('--.*--', 'i');
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
                            headers: {
                                'Content-Type': 'multipart/mixed; boundary=' + boundary
                            }
                        },
                        batchBody = [],
                        urlInfo, i, request, header;

                    for (i = 0; i < requests.length; i += 1) {
                        request = requests[i];
                        urlInfo = getUrlInfo(request.url);

                        batchBody.push(constants.doubleDash + boundary);
                        batchBody.push('Content-Type: application/http; msgtype=request', constants.emptyString);

                        batchBody.push(request.method + ' ' + urlInfo.relativeUrl + ' ' + constants.httpVersion);
                        batchBody.push('Host: ' + urlInfo.host);

                        for (header in request.headers) {
                            batchBody.push(header + ': ' + request.headers[header]);
                        }

                        batchBody.push(constants.emptyString);

                        if (request.data) {
                            batchBody.push(angular.toJson(request.data));
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
                                responseParser = new BatchRequestPartParser(part, self.requests[responseCount]);
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

                    if (this.requests.length > this.config.maxBatchedRequestPerCall) {
                        $timeout.cancel(this.currentTimeoutToken);
                        this.currentTimeoutToken = undefined;
                        this.send();
                    }

                    return true;
                },

                getUrlInfo = function (url) {
                    var protocol,
                        host,
                        relativeUrl,
                        protocolEndIndex,
                        urlParts;

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
                send: send
            };
        }());

        return {
            canBatchRequest: canBatchRequest,
            batchRequest: batchRequest
        };
    }
]);
