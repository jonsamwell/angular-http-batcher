(function (angular, sinon) {
  'use strict';

  describe('nodeJsMultiFetchAdapter', function () {
    var sandbox, adapter;

    beforeEach(module(window.ahb.name));

    describe('nodeJsMultiFetchAdapter', function () {
      beforeEach(inject(function ($injector) {
        sandbox = sinon.sandbox.create();
        adapter = $injector.get('nodeJsMultiFetchAdapter');
      }));

      afterEach(function () {
        sandbox.restore();
      });

      it('should be defined', function () {
        expect(adapter).to.exist;
      });

      describe('buildRequest', function () {
        it('should build the correct request for a single GET request', function () {
          var rawRequest = {
              url: 'api/some-method?params=123',
              method: 'GET'
            },
            config = {
              batchEndpointUrl: 'batchEndpointUrl'
            };

          var result = adapter.buildRequest([rawRequest], config);

          expect(result.method).to.equal('GET');
          expect(result.url).to.equal(config.batchEndpointUrl + '?0=api/some-method?params%3D123');
          expect(result.cache).to.equal(false);
        });

        it('should build the correct request for a multiple GET request', function () {
          var rawRequestOne = {
              url: 'api/some-method?params=123',
              method: 'GET'
            },
            rawRequestTwo = {
              url: 'api/some-other-method/123',
              method: 'GET'
            },
            config = {
              batchEndpointUrl: 'batchEndpointUrl'
            };

          var result = adapter.buildRequest([rawRequestOne, rawRequestTwo], config);

          expect(result.method).to.equal('GET');
          expect(result.url).to.equal(config.batchEndpointUrl + '?0=api/some-method?params%3D123&1=api/some-other-method/123');
          expect(result.cache).to.equal(false);
        });

        it('should build the correct request that includes custom headers', function () {
          var rawRequest = {
              url: 'api/some-method?params=123',
              method: 'GET'
            },
            config = {
              batchEndpointUrl: 'batchEndpointUrl',
              batchRequestHeaders: {
                'Content-disposition': 'form-data'
              }
            };

          var result = adapter.buildRequest([rawRequest], config);

          expect(result.method).to.equal('GET');
          expect(result.url).to.equal(config.batchEndpointUrl + '?0=api/some-method?params%3D123');
          expect(result.cache).to.equal(false);
          expect(result.headers['Content-disposition']).to.equal('form-data');
        });
      });

      describe('parseResponse', function () {
        it('should parse a single response', function () {
          var rawRequest = {
              url: 'api/some-method?params=123',
              method: 'GET'
            },
            config = {
              batchEndpointUrl: 'batchEndpointUrl'
            },
            response = {
              data: {
                0: {
                  statusCode: 200,
                  body: [{
                    id: 1
                  }, {
                    id: 2
                  }, {
                    id: 3
                  }],
                  headers: {
                    headerOne: '1'
                  }
                }
              }
            };

          var results = adapter.parseResponse([rawRequest], response, config);

          expect(results.length).to.equal(1);
          expect(results[0].request).to.deep.equal(rawRequest);
          expect(results[0].statusCode).to.equal(200);
          expect(results[0].statusText).to.equal('');
          expect(results[0].data.length).to.equal(3);
          expect(results[0].data[0].id).to.equal(1);
          expect(results[0].data[1].id).to.equal(2);
          expect(results[0].data[2].id).to.equal(3);
          expect(results[0].headers.headerOne).to.equal('1');
        });
      });

      describe('canBatchRequest', function () {
        it('should return true', function () {
          expect(adapter.canBatchRequest({
            method: 'GET'
          })).to.equal(true);
        });

        it('should return false', function () {
          expect(adapter.canBatchRequest({
            method: 'POST'
          })).to.equal(false);
        });
      });
    });
  });
}(angular, sinon));
