angular.module(window.ahb.name).provider('httpBatchConfig', [

    function () {
        'use strict';

        var allowedBatchDomains = [],
            defaultConfiguration = {
                maxBatchedRequestPerCall: 10,
                minimumBatchSize: 2,
                batchRequestCollectionDelay: 100,
                ignoredVerbs: ['head']
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
         *  - **minimumBatchSize** - `{int}` - Defaults to 1.  The small number of individual calls allowed in a batch request.
         * - **batchRequestCollectionDelay** - `{}` - The default time in milliseconds the http batcher should wait to collection all request to this domain after
         *      the first http call that can be batched has been collect.  This defaults to 100ms.  Therefore if you send
         *      a HTTP GET call that can be batched the HTTP batcher will receive this call and wait a further 100ms before
         *      sending the call in order to wait for other calls to the same domain in order to add them to the current batch
         *      request.  If no other calls are collected the initial HTTP call will be allowed to continue as normal and will
         *      not be batched unless the config property - **minimumBatchSize** is set to one.
         *  - **ignoredVerbs** - The HTTP verbs that are ignored and not included in a batch request.  By default only HEAD request are ignored.
         */
        this.setAllowedBatchEndpoint = function (serviceUrl, batchEndpointUrl, config) {
            var mergedConfiguration = angular.copy(defaultConfiguration);
            if (config !== undefined) {
                angular.forEach(config, function (value, key) {
                    mergedConfiguration[key] = value;
                });
            }

            mergedConfiguration.serviceUrl = serviceUrl;
            mergedConfiguration.batchEndpointUrl = batchEndpointUrl;
            allowedBatchDomains.push(mergedConfiguration);

        };

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

        this.canBatchCall = function (url, method) {
            var config = this.getBatchConfig(url);
            return config !== undefined &&
                config.batchEndpointUrl !== url &&
                config.ignoredVerbs.indexOf(method.toLowerCase()) === -1;
        };

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
