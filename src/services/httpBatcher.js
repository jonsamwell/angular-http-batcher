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
                emptyString: ''
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

        BatchRequestManager.prototype = (function () {
            var
                /**
                 * https://developers.google.com/storage/docs/json_api/v1/how-tos/batch
                 * http://blogs.msdn.com/b/webdev/archive/2013/11/01/introducing-batch-support-in-web-api-and-web-api-odata.aspx
                 * @param request - the collection of http request to build into a http batch request.
                 * @returns {object} - a http config object.
                 */
                buildBatchRequest = function (requests, config) {
                    var host = 'fsatnav:8080',
                        protocol = 'http://',
                        boundary = httpBatchConfig.calculateBoundary(),
                        config = {
                            method: 'POST',
                            url: config.batchEndpointUrl,
                            cache: false,
                            headers: {
                                "Content-Type": 'multipart/mixed; boundary="' + boundary + '"'
                            }
                        },
                        batchBody = [],
                        i,
                        request;

                    for (i = 0; i < requests.length; i += 1) {
                        request = requests[i];

                        batchBody.push('--' + boundary);
                        batchBody.push('Content-Type: application/http; msgtype=request', constants.emptyString);

                        batchBody.push(request.method + ' ' + request.url.replace(host, constants.emptyString).replace(protocol, '') + ' ' + constants.httpVersion);
                        batchBody.push('HOST: ' + host, '');

                        if (request.method !== 'GET' && request.method != 'DELETE') {
                            batchBody.push('Content-Type: ' + request.contentType, constants.emptyString);
                        }

                        if (request.data) {
                            batchBody.push(angular.toJson(request.data));
                        }

                        batchBody.push(constants.emptyString);
                        batchBody.push('--' + boundary + '--');
                    }

                    config.data = batchBody.join(constants.newline);
                    return config;
                },

                send = function () {
                    var self = this;
                    this.sendCallback();
                    $injector.get('$http')(buildBatchRequest(this.requests, this.config)).then(function (response) {
                        debugger;
                        var boundaryToken = findResponseBoundary(response.headers()['content-type']),
                            parts = response.data.split('--' + boundaryToken + '\n'),
                            i, request;

                        for (i = 0; i < self.requests.length; i += 1) {
                            request = self.requests[i];
                            request.callback();
                        }
                    }, function (err) {
                        //alert(err);
                    });
                },

                addRequest = function (request) {
                    this.requests.push(request);
                    return true;
                },

                findResponseBoundary = function (contentType) {
                    debugger;
                    var boundaryText = 'boundary=',
                        startIndex = contentType.indexOf(boundaryText),
                        boundary = contentType.substring(startIndex + boundaryText.length);

                    // the boundary might be quoted so remove the quotes
                    boundary = boundary.replace(/"/g, constants.emptyString);

                    // response.data.substring(0, response.data.indexOf('\n')
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
                var batchConfig = httpBatchConfig.getBatchConfig(request.url);
                var batchRequestManager = currentBatchedRequests[batchConfig.batchEndpointUrl];
                if (batchRequestManager === undefined) {
                    batchRequestManager = new BatchRequestManager(batchConfig, function () {
                        // this removes the batch request that will be sent from the list of
                        // pending calls.
                        delete currentBatchedRequests[request.key];
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
