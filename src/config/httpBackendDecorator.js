angular.module(window.ahb.name).config(['$provide',
    function ($provide) {
        'use strict';

        $provide.decorator('$httpBackend', [
            '$delegate',
            'httpBatcher',
            function ($delegate, httpBatcher) {
                return function (method, url, post, callback, headers, timeout, withCredentials, responseType) {
                    if (httpBatcher.canBatchRequest(url, method)) {
                        httpBatcher.batchRequest({
                            method: method,
                            url: url,
                            data: post,
                            callback: callback,
                            headers: headers,
                            timeout: timeout,
                            withCredentials: withCredentials,
                            responseType: responseType
                        });
                    } else {
                        // could us '.call' here as it is quicker but using apply enables us to pass param array
                        // and be forward/backward compatible
                        return $delegate.apply(this, arguments);
                    }
                };
            }
        ]);
    }
]);
