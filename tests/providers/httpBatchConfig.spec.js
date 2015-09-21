(function (angular, sinon) {
  'use strict';
  describe('httpBatchConfig', function () {
    var sandbox, httpBatchConfig;

    beforeEach(module(window.ahb.name));

    describe('httpBatchConfig', function () {
      beforeEach(inject(function ($injector) {
        sandbox = sinon.sandbox.create();
        httpBatchConfig = $injector.get('httpBatchConfig');
      }));

      afterEach(function () {
        sandbox.restore();
      });

      it('should be defined', function () {
        expect(httpBatchConfig).to.exist;
      });

      describe('calculateBoundary', function () {
        it('should return a string', function () {
          var boundary = httpBatchConfig.calculateBoundary();
          expect(typeof boundary === 'string').to.equal(true);
        });
      });

      describe('setAllowedBatchEndpoint', function () {
        it('should add the service and batch endpoint url to the config object', function () {
          var config,
            serviceUrl = 'http://www.google.com/someservice/',
            batchEndpointUrl = 'http://www.google.com/someservice/batch';
          httpBatchConfig.setAllowedBatchEndpoint(serviceUrl, batchEndpointUrl, {}),
            config = httpBatchConfig.getBatchConfig('http://www.google.com/someservice/someresource');
          expect(config.serviceUrl).to.equal(serviceUrl);
          expect(config.batchEndpointUrl).to.equal(batchEndpointUrl);
        });

        it('should populate defaults on the config object if they are not present', function () {
          var config,
            serviceUrl = 'http://www.google.com/someservice/',
            batchEndpointUrl = 'http://www.google.com/someservice/batch';
          httpBatchConfig.setAllowedBatchEndpoint(serviceUrl, batchEndpointUrl, {}),
            config = httpBatchConfig.getBatchConfig('http://www.google.com/someservice/someresource');
          expect(config).to.deep.equal({
            maxBatchedRequestPerCall: 10,
            minimumBatchSize: 2,
            batchRequestCollectionDelay: 100,
            ignoredVerbs: ['head'],
            serviceUrl: serviceUrl,
            batchEndpointUrl: batchEndpointUrl,
            enabled: true,
            sendCookies: false,
            adapter: 'httpBatchAdapter',
            uniqueRequestName: null
          });
        });

        it('should populate defaults on the config object if a config object is not provided', function () {
          var config,
            serviceUrl = 'http://www.google.com/someservice/',
            batchEndpointUrl = 'http://www.google.com/someservice/batch';
          httpBatchConfig.setAllowedBatchEndpoint(serviceUrl, batchEndpointUrl),
            config = httpBatchConfig.getBatchConfig('http://www.google.com/someservice/someresource');
          expect(config).to.deep.equal({
            maxBatchedRequestPerCall: 10,
            minimumBatchSize: 2,
            batchRequestCollectionDelay: 100,
            ignoredVerbs: ['head'],
            serviceUrl: serviceUrl,
            batchEndpointUrl: batchEndpointUrl,
            enabled: true,
            sendCookies: false,
            adapter: 'httpBatchAdapter',
            uniqueRequestName: null
          });
        });

        it('should not overwrite properties on the config object with the defaults', function () {
          var config,
            serviceUrl = 'http://www.google.com/someservice/',
            batchEndpointUrl = 'http://www.google.com/someservice/batch';
          httpBatchConfig.setAllowedBatchEndpoint(serviceUrl, batchEndpointUrl, {
              maxBatchedRequestPerCall: 2
            }),
            config = httpBatchConfig.getBatchConfig('http://www.google.com/someservice/someresource');

          expect(config.maxBatchedRequestPerCall).to.equal(2);
        });
      });

      describe('canBatchCall', function () {
        it('should return true url is a derivative of the registered batch endpoint', function () {
          httpBatchConfig.setAllowedBatchEndpoint('http://www.google.com/someservice/', 'http://www.google.com/someservice/batch');
          var canCall = httpBatchConfig.canBatchCall('http://www.google.com/someservice/someresource/1', 'GET');
          expect(canCall).to.equal(true);
        });

        it('should return false if no endpoints have been configured as batch endpoints', function () {
          var canCall = httpBatchConfig.canBatchCall('http://www.google.com/someservice/something', 'GET');
          expect(canCall).to.equal(false);
        });

        it('should return false if the given url is the url of the batch endpoint', function () {
          var canCall;
          httpBatchConfig.setAllowedBatchEndpoint('http://www.google.com/someservice/', 'http://www.google.com/someservice/batch');
          canCall = httpBatchConfig.canBatchCall('http://www.google.com/someservice/batch', 'GET');

          expect(canCall).to.equal(false);
        });

        it('should return false if the given http verb is not allowed to be batched', function () {
          var canCall;
          httpBatchConfig.setAllowedBatchEndpoint('http://www.google.com/someservice/', 'http://www.google.com/someservice/batch', {
            ignoredVerbs: ['GET']
          });
          canCall = httpBatchConfig.canBatchCall('http://www.google.com/someservice/some-resource', 'GET');

          expect(canCall).to.equal(false);
        });

        it('should return false if batching is not enabled', function () {
          var canCall;
          httpBatchConfig.setAllowedBatchEndpoint('http://www.google.com/someservice/', 'http://www.google.com/someservice/batch', {
            enabled: false
          });
          canCall = httpBatchConfig.canBatchCall('http://www.google.com/someservice/some-resource', 'GET');

          expect(canCall).to.equal(false);
        });

        it('should return true if the canBatchRequest function returns true on the config object', function () {
          var canCall;
          httpBatchConfig.setAllowedBatchEndpoint('http://www.google.com/someservice/', 'http://www.google.com/someservice/batch', {
            ignoredVerbs: ['GET'],
            canBatchRequest: function (url, method) {
              return true;
            }
          });
          canCall = httpBatchConfig.canBatchCall('http://www.google.com/someservice/some-resource', 'GET');

          expect(canCall).to.equal(true);
        });
      });

      describe('getBatchConfig', function () {
        it('should return undefined if no matching batch endpoint have been configured', function () {
          var config = httpBatchConfig.getBatchConfig('http://www.google.com/someservice/something');
          expect(config).to.equal(undefined);
        });

        it('should return undefined if the given url has no matching batch endpoint configured', function () {
          var config;
          httpBatchConfig.setAllowedBatchEndpoint('serviceUrl', 'serviceUrl/batch');
          config = httpBatchConfig.getBatchConfig('http://www.google.com/someservice/something');
          expect(config).to.equal(undefined);
        });
      });
    });
  });
}(angular, sinon));
