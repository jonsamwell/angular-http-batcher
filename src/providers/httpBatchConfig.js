angular.module(window.ahb.name).provider('httpBatchConfig', [

    function () {
        'use strict';

        var allowedBatchDomains = [],
            defaultConfiguration = {
                maxBatchedRequestPerCall: 10,
                minimumBatchSize: 2,
                batchRequestCollectionDelay: 100,
                ignoredVerbs: ['head'],
				allowRelativeURLs: false,
				urlMustContain: []
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
		 *  - **allowRelativeURLs** - This config will be applied to relative URL's. By default this is false
		 *  - **urlMustContain** - Elements of this array will be checked for partial match in request url. This will allow to only batch some api calls, with this configuration
		 *		you can prevent batching of static file requests.If this array is empty it will be omitted.
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
				//no way to check relative url's for matching url - but we will check urlMustContain parameter later
                if (url.indexOf(config.serviceUrl) > -1 || (config.allowRelativeURLs === true && url.indexOf('http') === -1 && url.indexOf('www') === -1)) {
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
         * @param {string} url The **absolute** url of the request.
         * @param {string} method The HTTP verb of the request i.e. POST
         */
        this.canBatchCall = function (url, method) {
            var config = this.getBatchConfig(url);
            var canBatch = config !== undefined &&
                config.batchEndpointUrl !== url &&
                config.ignoredVerbs.indexOf(method.toLowerCase()) === -1;
				
			if(canBatch && config.urlMustContain.length > 0){
				var foundMatch = false;
				for(var i = 0, ii = config.urlMustContain.length; i < ii; i++){
					if(url.indexOf(config.urlMustContain[i]) > -1){
						foundMatch = true;
						break;
					}
				}
				
				if(!foundMatch){
					canBatch = false;
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
