(function (angular, sinon) {
  'use strict';

  describe('httpAdapter', function () {
    var sandbox, httpBatchConfig, httpAdapter,
      boundaryText = 'boundary123';

    beforeEach(module(window.ahb.name));

    describe('httpAdapter', function () {
      beforeEach(inject(function ($injector) {
        sandbox = sinon.sandbox.create();
        httpAdapter = $injector.get('httpBatchAdapter');
        httpBatchConfig = $injector.get('httpBatchConfig');

        sandbox.stub(httpBatchConfig, 'calculateBoundary').returns(boundaryText);
      }));

      afterEach(function () {
        sandbox.restore();
      });

      it('should be defined', function () {
        expect(httpAdapter).to.exist;
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

          var result = httpAdapter.buildRequest([rawRequest], config);

          expect(result.method).to.equal('POST');
          expect(result.url).to.equal(config.batchEndpointUrl);
          expect(result.cache).to.equal(false);
          expect(result.data).to.equal('--boundary123\r\nContent-Type: application/http; msgtype=request\r\n\r\n' +
            'GET api/some-method?params=123 HTTP/1.1\r\nHost: localhost:9876\r\n\r\n\r\n--boundary123--');
        });

        it('should build the correct request for a single POST request', function () {
          var rawRequest = {
              url: 'api/some-method?params=123',
              method: 'POST',
              data: angular.toJson({
                id: 1,
                name: 'jon'
              })
            },
            config = {
              batchEndpointUrl: 'batchEndpointUrl'
            };

          var result = httpAdapter.buildRequest([rawRequest], config);

          expect(result.method).to.equal('POST');
          expect(result.url).to.equal(config.batchEndpointUrl);
          expect(result.cache).to.equal(false);
          expect(result.data).to.equal('--boundary123\r\nContent-Type: application/http; msgtype=request\r\n\r\n' +
            'POST api/some-method?params=123 HTTP/1.1\r\nHost: localhost:9876\r\n\r\n' +
            '{"id":1,"name":"jon"}\r\n\r\n--boundary123--');
        });

        it('should build the correct request for a multiple requests', function () {
          var rawRequestOne = {
              url: 'api/some-method?params=123',
              method: 'POST',
              data: angular.toJson({
                id: 1,
                name: 'jon'
              })
            },
            rawRequestTwo = {
              url: 'api/some-method?params=123',
              method: 'GET'
            },
            config = {
              batchEndpointUrl: 'batchEndpointUrl'
            };

          var result = httpAdapter.buildRequest([rawRequestOne, rawRequestTwo], config);

          expect(result.method).to.equal('POST');
          expect(result.url).to.equal(config.batchEndpointUrl);
          expect(result.cache).to.equal(false);
          expect(result.data).to.equal('--boundary123\r\nContent-Type: application/http; msgtype=request\r\n\r\n' +
            'POST api/some-method?params=123 HTTP/1.1\r\nHost: localhost:9876\r\n\r\n{"id":1,"name":"jon"}\r\n\r\n' +
            '--boundary123\r\nContent-Type: application/http; msgtype=request\r\n\r\n' +
            'GET api/some-method?params=123 HTTP/1.1\r\nHost: localhost:9876\r\n\r\n\r\n--boundary123--');
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
              },
              batchPartRequestHeaders: {
                'Content-disposition': 'form-data'
              }
            };

          var result = httpAdapter.buildRequest([rawRequest], config);

          expect(result.method).to.equal('POST');
          expect(result.url).to.equal(config.batchEndpointUrl);
          expect(result.cache).to.equal(false);
          expect(result.headers['Content-Type']).to.equal('multipart/mixed; boundary=boundary123');
          expect(result.headers['Content-disposition']).to.equal('form-data');
          expect(result.data).to.equal('--boundary123\r\nContent-disposition: form-data\r\nContent-Type: application/http; msgtype=request\r\n\r\n' +
            'GET api/some-method?params=123 HTTP/1.1\r\nHost: localhost:9876\r\n\r\n\r\n--boundary123--');
        });

        it('should build the correct request that includes custom headers and a unique request name', function () {
          var rawRequest = {
              url: 'api/some-method?params=123',
              method: 'GET'
            },
            config = {
              batchEndpointUrl: 'batchEndpointUrl',
              batchRequestHeaders: {
                'Content-disposition': 'form-data'
              },
              batchPartRequestHeaders: {
                'Content-disposition': 'form-data'
              },
              uniqueRequestName: "veryUniqueRequestName"
            };

          var result = httpAdapter.buildRequest([rawRequest], config);

          expect(result.method).to.equal('POST');
          expect(result.url).to.equal(config.batchEndpointUrl);
          expect(result.cache).to.equal(false);
          expect(result.headers['Content-Type']).to.equal('multipart/mixed; boundary=boundary123');
          expect(result.headers['Content-disposition']).to.equal('form-data');
          expect(result.data).to.equal('--boundary123\r\nContent-disposition: form-data; name=veryUniqueRequestName0\r\nContent-Type: application/http; msgtype=request\r\n\r\n' +
            'GET api/some-method?params=123 HTTP/1.1\r\nHost: localhost:9876\r\n\r\n\r\n--boundary123--');
        });

        it('should ignore unique request name if content disposition is not sent', function () {
          var rawRequest = {
              url: 'api/some-method?params=123',
              method: 'GET'
            },
            config = {
              batchEndpointUrl: 'batchEndpointUrl',
              batchRequestHeaders: {
                'Custom-Header': 'sweet'
              },
              batchPartRequestHeaders: {
                'Custom-Header': 'sweet'
              },
              uniqueRequestName: "veryUniqueRequestName"
            };

          var result = httpAdapter.buildRequest([rawRequest], config);

          expect(result.method).to.equal('POST');
          expect(result.url).to.equal(config.batchEndpointUrl);
          expect(result.cache).to.equal(false);
          expect(result.headers['Content-Type']).to.equal('multipart/mixed; boundary=boundary123');
          expect(result.headers['Custom-Header']).to.equal('sweet');
          expect(result.data).to.equal('--boundary123\r\nCustom-Header: sweet\r\nContent-Type: application/http; msgtype=request\r\n\r\n' +
            'GET api/some-method?params=123 HTTP/1.1\r\nHost: localhost:9876\r\n\r\n\r\n--boundary123--');
        });

        it('should build the correct request that includes uri ecoding the urls', function () {
          var rawRequest = {
              url: 'api/some method?params=123',
              method: 'GET'
            },
            config = {
              batchEndpointUrl: 'batchEndpointUrl',
              batchRequestHeaders: {
                'Content-disposition': 'form-data'
              },
              batchPartRequestHeaders: {
                'Content-disposition': 'form-data'
              }
            };

          var result = httpAdapter.buildRequest([rawRequest], config);

          expect(result.method).to.equal('POST');
          expect(result.url).to.equal(config.batchEndpointUrl);
          expect(result.cache).to.equal(false);
          expect(result.headers['Content-Type']).to.equal('multipart/mixed; boundary=boundary123');
          expect(result.headers['Content-disposition']).to.equal('form-data');
          expect(result.data).to.equal('--boundary123\r\nContent-disposition: form-data\r\nContent-Type: application/http; msgtype=request\r\n\r\n' +
            'GET api/some%20method?params=123 HTTP/1.1\r\nHost: localhost:9876\r\n\r\n\r\n--boundary123--');
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
            responseData = '--boundary123\r\nContent-Type: application/http; msgtype=response\r\n\r\n' +
            'HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\n\r\n' +
            '[{"Name":"Product 1","Id":1,"StockQuantity":100},{"Name":"Product 2","Id":2,"StockQuantity":2},{"Name":"Product 3","Id":3,"StockQuantity":32432}]' +
            '\r\n--boundary123--\r\n',
            response = {
              data: responseData,
              headers: function () {
                return {
                  'content-type': 'multipart/mixed; boundary="boundary123"'
                };
              }
            };

          var results = httpAdapter.parseResponse([rawRequest], response, config);

          expect(results.length).to.equal(1);
          expect(results[0].request).to.deep.equal(rawRequest);
          expect(results[0].statusCode).to.equal(200);
          expect(results[0].statusText).to.equal('OK');
          expect(results[0].headers['Content-Type']).to.equal('json; charset=utf-8');
          expect(results[0].data.length).to.equal(3);
          expect(results[0].data[0].Id).to.equal(1);
          expect(results[0].data[1].Id).to.equal(2);
          expect(results[0].data[2].Id).to.equal(3);
        });
      });

      describe('canBatchRequest', function () {
        it('should return true', function () {
          expect(httpAdapter.canBatchRequest()).to.equal(true);
        });
      });
    });
  });
}(angular, sinon));
