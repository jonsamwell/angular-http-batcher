(function (angular, sinon) {
  'use strict';
  describe('httpBatcher', function () {
    var sandbox, $httpBackend, $timeout, httpBatchConfig, httpBatcher,
      defaultBatchAdapter = 'httpBatchAdapter',
      host = 'www.google.com.au',
      $window = {
        location: {
          host: host
        }
      },
      parseHeaders = function (headers) {
        var parsed = {},
          key, val, i;

        if (!headers) {
          return parsed;
        }

        headers.split('\n').forEach(function (line) {
          i = line.indexOf(':');
          key = line.substr(0, i).trim().toLowerCase();
          val = line.substr(i + 1).trim();

          if (key) {
            if (parsed[key]) {
              parsed[key] += ', ' + val;
            } else {
              parsed[key] = val;
            }
          }
        });

        return parsed;
      };


    beforeEach(module(function ($provide) {
      $provide.value('$window', $window);
    }));
    beforeEach(module(window.ahb.name));

    describe('httpBatcher', function () {
      beforeEach(inject(function ($injector) {
        sandbox = sinon.sandbox.create();
        $httpBackend = $injector.get('$httpBackend');
        $timeout = $injector.get('$timeout');

        httpBatchConfig = $injector.get('httpBatchConfig');
        httpBatcher = $injector.get('httpBatcher');
      }));

      afterEach(function () {
        sandbox.restore();
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
      });

      it('should be defined', function () {
        expect(httpBatcher).to.exist;
      });

      describe('canBatchRequest', function () {
        it('should call canBatchCall on httpBatchConfig', function () {
          sandbox.stub(httpBatchConfig, 'canBatchCall').returns(false);

          httpBatcher.canBatchRequest('http://www.gogle.com/resource', 'GET');

          expect(httpBatchConfig.canBatchCall.calledOnce).to.equal(true);
        });
      });

      describe('batchRequest request creation', function () {
        it('should call getBatchConfig on httpBatchConfig', function () {
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns({
            batchEndpointUrl: 'http://www.someservice.com/batch'
          });

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'GET',
            callback: angular.noop
          });

          expect(httpBatchConfig.getBatchConfig.calledOnce).to.equal(true);
        });

        it('should call batchEndpointUrl after batchRequestCollectionDelay timeout has passed', function () {
          $httpBackend.expectPOST('http://www.someservice.com/batch').respond(404);
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns({
            batchEndpointUrl: 'http://www.someservice.com/batch',
            batchRequestCollectionDelay: 200,
            minimumBatchSize: 1,
            adapter: defaultBatchAdapter
          });

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'GET',
            callback: angular.noop
          });

          $timeout.flush();
          $httpBackend.flush();
        });

        it('should create the correct http post data for a single GET request', function () {
          var batchConfig = {
              batchEndpointUrl: 'http://www.someservice.com/batch',
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 1,
              adapter: defaultBatchAdapter
            },
            postData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=request\r\n\r\nGET /resource HTTP/1.1\r\nHost: www.gogle.com\r\n\r\n\r\n--some_boundary_mocked--',
            responseData = '';

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData).respond(404, responseData);
          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('some_boundary_mocked');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'GET',
            callback: angular.noop
          });

          $timeout.flush();
          $httpBackend.flush();
        });


        it('should create the correct http post data for a complex relative url GET request', function () {
          var batchConfig = {
              batchEndpointUrl: 'api/batch',
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 1,
              adapter: defaultBatchAdapter
            },
            postData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=request\r\n\r\nGET /resource HTTP/1.1\r\nHost: localhost:9876\r\n\r\n\r\n--some_boundary_mocked--',
            responseData = '';

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData).respond(404, responseData);
          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('some_boundary_mocked');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: './resource',
            method: 'GET',
            callback: angular.noop
          });

          $timeout.flush();
          $httpBackend.flush();
        });

        it('should add additional headers to the batch request as defined in the config object', function () {
          var batchConfig = {
              batchEndpointUrl: 'http://www.someservice.com/batch',
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 1,
              adapter: defaultBatchAdapter,
              batchRequestHeaders: {
                'Content-disposition': 'form-data'
              }
            },
            responseData = '';

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl, undefined, function (headers) {
            return headers['Content-disposition'] === 'form-data';
          }).respond(404, responseData);

          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('some_boundary_mocked');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'GET',
            callback: angular.noop
          });

          $timeout.flush();
          $httpBackend.flush();
        });

        it('should create the correct http post data for a single GET request with additional headers', function () {
          var batchConfig = {
              batchEndpointUrl: 'http://www.someservice.com/batch',
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 1,
              adapter: defaultBatchAdapter,
              batchRequestHeaders: {
                'Content-disposition': 'form-data'
              },
              batchPartRequestHeaders: {
                'Content-disposition': 'form-data'
              }
            },
            postData = '--some_boundary_mocked\r\nContent-disposition: form-data\r\nContent-Type: application/http; msgtype=request\r\n\r\nGET /resource HTTP/1.1\r\nHost: www.gogle.com\r\n\r\n\r\n--some_boundary_mocked--',
            responseData = '';

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData, function (headers) {
            return headers['Content-disposition'] === 'form-data';
          }).respond(404, responseData);
          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('some_boundary_mocked');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'GET',
            callback: angular.noop
          });

          $timeout.flush();
          $httpBackend.flush();
        });

        it('should create the correct http post data for a single POST request', function () {
          var batchConfig = {
              batchEndpointUrl: 'http://www.someservice.com/batch',
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 1,
              adapter: defaultBatchAdapter
            },
            postData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=request\r\n\r\nPOST /resource HTTP/1.1\r\n' +
            'Host: www.gogle.com\r\n\r\n{"propOne":1,"propTwo":"two","propThree":3,"propFour":true}\r\n\r\n--some_boundary_mocked--',
            responseData = '';

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData).respond(404, responseData);
          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('some_boundary_mocked');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'POST',
            data: angular.toJson({
              propOne: 1,
              propTwo: 'two',
              propThree: 3.00,
              propFour: true
            }),
            callback: angular.noop
          });

          $timeout.flush();
          $httpBackend.flush();
        });

        it('should create the correct http post data for a single GET request with custom headers', function () {
          var batchConfig = {
              batchEndpointUrl: 'http://www.someservice.com/batch',
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 1,
              adapter: defaultBatchAdapter
            },
            postData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=request\r\n\r\nGET /resource HTTP/1.1\r\nHost: www.gogle.com\r\nx-custom: data123\r\nAuthentication: 1234567890\r\n\r\n\r\n--some_boundary_mocked--',
            responseData = '';

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData).respond(404, responseData);
          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('some_boundary_mocked');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'GET',
            headers: {
              'x-custom': 'data123',
              Authentication: '1234567890'
            },
            callback: angular.noop
          });

          $timeout.flush();
          $httpBackend.flush();
        });

        it('should create the correct http post data for a multiple requests', function () {
          var batchConfig = {
              batchEndpointUrl: 'http://www.someservice.com/batch',
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 1,
              adapter: defaultBatchAdapter
            },
            postData = '--some_boundary_mocked' +
            '\r\nContent-Type: application/http; msgtype=request\r\n\r\nPOST /resource-two HTTP/1.1\r\nHost: www.gogle.com\r\nAuthentication: 123987\r\n\r\n{"propOne":1,"propTwo":"two","propThree":3,"propFour":true}' +
            '\r\n\r\n--some_boundary_mocked' +
            '\r\nContent-Type: application/http; msgtype=request\r\n\r\nGET /resource HTTP/1.1\r\nHost: www.gogle.com\r\nx-custom: data123\r\nAuthentication: 1234567890' +
            '\r\n\r\n\r\n--some_boundary_mocked--',
            responseData = '';

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData).respond(404, responseData);
          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('some_boundary_mocked');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource-two',
            method: 'POST',
            headers: {
              Authentication: '123987'
            },
            data: angular.toJson({
              propOne: 1,
              propTwo: 'two',
              propThree: 3.00,
              propFour: true
            }),
            callback: angular.noop
          });
          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'GET',
            headers: {
              'x-custom': 'data123',
              Authentication: '1234567890'
            },
            callback: angular.noop
          });

          $timeout.flush();
          $httpBackend.flush();
        });

        it('should not create a batch request but let the request continue normally if the min batch size is not met', function () {
          var normalRouteCalled = 0,
            batchConfig = {
              batchEndpointUrl: 'http://www.someservice.com/batch',
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 2,
              adapter: defaultBatchAdapter
            };

          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource-two',
            method: 'GET',
            headers: {
              Authentication: '123987'
            },
            callback: angular.noop,
            continueDownNormalPipeline: function () {
              normalRouteCalled += 1;
            }
          });

          $timeout.flush();

          expect(normalRouteCalled).to.equal(1);
        });
      });

      describe('batchRequest request creation with relative url', function () {
        it('should create the correct http post data for a single GET request with a relative url', function () {
          var batchConfig = {
              batchEndpointUrl: '/api/batch',
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 1,
              adapter: defaultBatchAdapter
            },
            postData = '--some_boundary_mocked\r\nContent-Type: application/http; ' +
            'msgtype=request\r\n\r\n' +
            'GET /api/resource HTTP/1.1\r\n' +
            'Host: www.google.com.au\r\n\r\n\r\n' +
            '--some_boundary_mocked--',
            responseData = '';

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData).respond(404, responseData);
          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('some_boundary_mocked');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: '/api/resource',
            method: 'GET',
            callback: angular.noop
          });

          $timeout.flush();
          $httpBackend.flush();
        });
      });

      describe('batchRequest response parsing', function () {
        it('should parse the response of a single batch request', function (done) {
          var batchConfig = {
              batchEndpointUrl: 'http://www.someservice.com/batch',
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 1,
              adapter: defaultBatchAdapter
            },
            postData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=request\r\n\r\nGET /resource HTTP/1.1\r\nHost: www.gogle.com\r\n\r\n\r\n--some_boundary_mocked--',
            responseData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=response\r\n\r\n' +
            'HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\n\r\n' +
            '[{"Name":"Product 1","Id":1,"StockQuantity":100},{"Name":"Product 2","Id":2,"StockQuantity":2},{"Name":"Product 3","Id":3,"StockQuantity":32432}]' +
            '\r\n--some_boundary_mocked--\r\n';

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData).respond(200, responseData, {
            'content-type': 'multipart/mixed; boundary="some_boundary_mocked"'
          }, 'OK');

          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('some_boundary_mocked');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'GET',
            callback: function (statusCode, data, headers, statusText) {
              var headerObj = parseHeaders(headers);
              expect(statusCode).to.equal(200);
              expect(statusText).to.equal('OK');

              expect(headerObj['content-type']).to.equal('json; charset=utf-8');
              expect(data).to.deep.equal([{
                Name: 'Product 1',
                Id: 1,
                StockQuantity: 100
              }, {
                Name: 'Product 2',
                Id: 2,
                StockQuantity: 2
              }, {
                Name: 'Product 3',
                Id: 3,
                StockQuantity: 32432
              }]);
              done();
            }
          });

          $timeout.flush();
          $httpBackend.flush();
        });

        it('should parse the response of a single batch request which contains --', function (done) {
          var batchConfig = {
              batchEndpointUrl: 'http://www.someservice.com/batch',
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 1,
              adapter: defaultBatchAdapter
            },
            postData = '--31fcc127-a593-4e1d-86f3-57e45375848f\r\nContent-Type: application/http; msgtype=request\r\n\r\nGET /resource HTTP/1.1\r\nHost: www.gogle.com\r\n\r\n\r\n--31fcc127-a593-4e1d-86f3-57e45375848f--',
            responseData = '--31fcc127-a593-4e1d-86f3-57e45375848f\r\nContent-Type: application/http; msgtype=response\r\n\r\n' +
            'HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8;\r\n\r\n' +
            '{"results":[{"BusinessDescription":"Some text here\r\n-------------------"}],"inlineCount":35}' +
            '\r\n--31fcc127-a593-4e1d-86f3-57e45375848f--\r\n';

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData).respond(200, responseData, {
            'content-type': 'multipart/mixed; boundary="31fcc127-a593-4e1d-86f3-57e45375848f"'
          }, 'OK');

          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('31fcc127-a593-4e1d-86f3-57e45375848f');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'GET',
            callback: function (statusCode, data) {
              expect(data).to.deep.equal({
                results: [{
                  BusinessDescription: 'Some text here-------------------'
                }],
                inlineCount: 35
              });
              done();
            }
          });

          $timeout.flush();
          $httpBackend.flush();
        });

        it('should parse the response of a single batch request where the data is on multilines', function (done) {
          var batchConfig = {
              batchEndpointUrl: 'http://www.someservice.com/batch',
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 1,
              adapter: defaultBatchAdapter
            },
            postData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=request\r\n\r\nGET /resource HTTP/1.1\r\nHost: www.gogle.com\r\n\r\n\r\n--some_boundary_mocked--',
            responseData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=response\r\n\r\n' +
            'HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\n\r\n' +
            '[\r\n{\r\n"Name":\r\n"Product 1",\r\n"Id":\r\n1},\r\n{\r\n"Name":\r\n"Product 2",\r\n"Id":\r\n2}\r\n]' +
            '\r\n--some_boundary_mocked--\r\n';

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData).respond(200, responseData, {
            'content-type': 'multipart/mixed; boundary="some_boundary_mocked"'
          }, 'OK');

          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('some_boundary_mocked');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'GET',
            callback: function (statusCode, data, headers, statusText) {
              var headerObj = parseHeaders(headers);
              expect(statusCode).to.equal(200);
              expect(statusText).to.equal('OK');

              expect(headerObj['content-type']).to.equal('json; charset=utf-8');
              expect(data).to.deep.equal([{
                Name: 'Product 1',
                Id: 1
              }, {
                Name: 'Product 2',
                Id: 2
              }]);
              done();
            }
          });

          $timeout.flush();
          $httpBackend.flush();
        });

        it('should parse the response of a single batch request with additional custom headers in the response', function (done) {
          var batchConfig = {
              batchEndpointUrl: 'http://www.someservice.com/batch',
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 1,
              adapter: defaultBatchAdapter
            },
            postData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=request\r\n\r\nGET /resource HTTP/1.1\r\nHost: www.gogle.com\r\n\r\n\r\n--some_boundary_mocked--',
            responseData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=response\r\n\r\n' +
            'HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\nX-SomeHeader: 123AbC\r\nAuthentication: Bonza\r\n\r\n' +
            '[{"Name":"Product 1","Id":1,"StockQuantity":100},{"Name":"Product 2","Id":2,"StockQuantity":2},{"Name":"Product 3","Id":3,"StockQuantity":32432}]' +
            '\r\n--some_boundary_mocked--\r\n';

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData).respond(200, responseData, {
            'content-type': 'multipart/mixed; boundary="some_boundary_mocked"'
          }, 'OK');

          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('some_boundary_mocked');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'GET',
            callback: function (statusCode, data, headers) {
              var headerObj = parseHeaders(headers);
              expect(headerObj['x-someheader']).to.equal('123AbC');
              expect(headerObj.authentication).to.equal('Bonza');
              done();
            }
          });

          $timeout.flush();
          $httpBackend.flush();
        });

        it('should parse a failed response of a single batch request', function (done) {
          var batchConfig = {
              batchEndpointUrl: 'http://www.someservice.com/batch',
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 1,
              adapter: defaultBatchAdapter
            },
            postData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=request\r\n\r\nGET /resource HTTP/1.1\r\nHost: www.gogle.com\r\n\r\n\r\n--some_boundary_mocked--',
            responseData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=response\r\n\r\n' +
            'HTTP/1.1 401 UnAuthorised\r\nContent-Type: application/json; charset=utf-8\r\n\r\n' +
            '{ "message": "Access Denied" }' +
            '\r\n--some_boundary_mocked--\r\n';

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData).respond(200, responseData, {
            'content-type': 'multipart/mixed; boundary="some_boundary_mocked"'
          }, 'OK');

          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('some_boundary_mocked');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'GET',
            callback: function (statusCode, data, headers, statusText) {
              expect(statusCode).to.equal(401);
              expect(statusText).to.equal('UnAuthorised');
              expect(data).to.deep.equal({
                message: 'Access Denied'
              });
              done();
            }
          });

          $timeout.flush();
          $httpBackend.flush();
        });

        it('should parse multiple responses of a single batch request', function (done) {
          var batchConfig = {
              batchEndpointUrl: 'http://www.someservice.com/batch',
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 1,
              adapter: defaultBatchAdapter
            },
            postData = '--some_boundary_mocked' +
            '\r\nContent-Type: application/http; msgtype=request\r\n\r\nPOST /resource-two HTTP/1.1\r\nHost: www.gogle.com\r\nAuthentication: 123987\r\n\r\n{"propOne":1,"propTwo":"two","propThree":3,"propFour":true}' +
            '\r\n\r\n--some_boundary_mocked' +
            '\r\nContent-Type: application/http; msgtype=request\r\n\r\nGET /resource HTTP/1.1\r\nHost: www.gogle.com\r\nx-custom: data123\r\nAuthentication: 1234567890' +
            '\r\n\r\n\r\n--some_boundary_mocked--',

            responseData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=response\r\n\r\n' +
            'HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\n\r\n' +
            '[{"Name":"Product 1","Id":1,"StockQuantity":100},{"Name":"Product 2","Id":2,"StockQuantity":2},{"Name":"Product 3","Id":3,"StockQuantity":32432}]' +
            '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=response\r\n\r\n' +
            'HTTP/1.1 200 YO!\r\nContent-Type: application/json; charset=utf-8\r\n\r\n' +
            '[{"name":"Jon","id":1,"age":30},{"name":"Laurie","id":2,"age":29}]' +
            '\r\n--some_boundary_mocked--\r\n',

            completedFnInvocationCount = 0,

            completedFn = function () {
              completedFnInvocationCount += 1;
              if (completedFnInvocationCount === 2) {
                done();
              }
            };

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData).respond(200, responseData, {
            'content-type': 'multipart/mixed; boundary="some_boundary_mocked"'
          }, 'OK');

          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('some_boundary_mocked');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);


          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource-two',
            method: 'POST',
            headers: {
              Authentication: '123987'
            },
            data: angular.toJson({
              propOne: 1,
              propTwo: 'two',
              propThree: 3.00,
              propFour: true
            }),
            callback: function (statusCode, data, headers, statusText) {
              var headerObj = parseHeaders(headers);
              expect(statusCode).to.equal(200);
              expect(statusText).to.equal('OK');
              expect(headerObj['content-type']).to.equal('json; charset=utf-8');
              expect(data).to.deep.equal([{
                Name: 'Product 1',
                Id: 1,
                StockQuantity: 100
              }, {
                Name: 'Product 2',
                Id: 2,
                StockQuantity: 2
              }, {
                Name: 'Product 3',
                Id: 3,
                StockQuantity: 32432
              }]);
              completedFn();
            }
          });
          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'GET',
            headers: {
              'x-custom': 'data123',
              Authentication: '1234567890'
            },
            callback: function (statusCode, data, headers, statusText) {
              var headerObj = parseHeaders(headers);
              expect(statusCode).to.equal(200);
              expect(statusText).to.equal('YO!');
              expect(headerObj['content-type']).to.equal('json; charset=utf-8');
              expect(data).to.deep.equal([{
                name: 'Jon',
                id: 1,
                age: 30
              }, {
                name: 'Laurie',
                id: 2,
                age: 29
              }]);

              completedFn();
            }
          });

          $timeout.flush();
          $httpBackend.flush();
        });

        it('should parse the response of a single batch request which contains the Angular "JSON Vulnerability Protection" prefix', function (done) {
          var batchConfig = {
              batchEndpointUrl: 'http://www.someservice.com/batch',
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 1,
              adapter: defaultBatchAdapter
            },
            postData = '--31fcc127-a593-4e1d-86f3-57e45375848f\r\nContent-Type: application/http; msgtype=request\r\n\r\nGET /resource HTTP/1.1\r\nHost: www.gogle.com\r\n\r\n\r\n--31fcc127-a593-4e1d-86f3-57e45375848f--',
            responseData = '--31fcc127-a593-4e1d-86f3-57e45375848f\r\nContent-Type: application/http; msgtype=response\r\n\r\n' +
            'HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8;\r\n\r\n' +
            ')]}\',\n' + // JSON Vulnerability Protection prefix (see https://docs.angularjs.org/api/ng/service/$http#json-vulnerability-protection )
            '{"results":[{"BusinessDescription":"Some text here"}],"inlineCount":35}' +
            '\r\n--31fcc127-a593-4e1d-86f3-57e45375848f--\r\n';

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData).respond(200, responseData, {
            'content-type': 'multipart/mixed; boundary="31fcc127-a593-4e1d-86f3-57e45375848f"'
          }, 'OK');

          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('31fcc127-a593-4e1d-86f3-57e45375848f');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'GET',
            callback: function (statusCode, data) {
              expect(data).to.deep.equal({
                results: [{
                  BusinessDescription: 'Some text here'
                }],
                inlineCount: 35
              });
              done();
            }
          });


          $timeout.flush();
          $httpBackend.flush();
        });

        it('should return original data for non strings when trim Angular "JSON Vulnerability Protection" prefix', function (done) {
          var responseData = [{
              "headers": {
                "Content-Type": "text/html; charset=utf-8"
              },
              "status_code": 200,
              "body": "Success!",
              "reason_phrase": "OK"
            }, {
              "headers": {
                "Content-Type": "text/html; charset=utf-8"
              },
              "status_code": 201,
              "body": "{\"text\": \"some text\"}",
              "reason_phrase": "CREATED"
            }],
            batchEndpointUrl = 'http://www.someservice.com/batch',
            batchConfig = {
              batchEndpointUrl: batchEndpointUrl,
              batchRequestCollectionDelay: 200,
              minimumBatchSize: 1,
              adapter: {
                buildRequest: function () {
                  return {
                    method: 'POST',
                    url: batchEndpointUrl,
                    cache: false,
                    headers: {},
                    data: ''
                  };
                },
                parseResponse: function (requests, rawResponse) {
                  expect(rawResponse.data).to.deep.equal(responseData);
                  done();
                  return [];
                }
              }
            };

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl).respond(200, responseData, {}, 'OK');

          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('31fcc127-a593-4e1d-86f3-57e45375848f');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'GET',
            callback: angular.noop
          });

          $timeout.flush();
          $httpBackend.flush();
        });

        describe('error handling', function () {
          it('should handle a 500 response', function (done) {
            var batchConfig = {
                batchEndpointUrl: 'http://www.someservice.com/batch',
                batchRequestCollectionDelay: 200,
                minimumBatchSize: 1,
                adapter: defaultBatchAdapter
              },
              postData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=request\r\n\r\nGET /resource HTTP/1.1\r\nHost: www.gogle.com\r\n\r\n\r\n--some_boundary_mocked--',
              responseData = 'Internal Server Error';

            $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData).respond(500, responseData, {}, 'Internal Server Error');

            sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('some_boundary_mocked');
            sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

            httpBatcher.batchRequest({
              url: 'http://www.gogle.com/resource',
              method: 'GET',
              callback: function (statusCode, data, headers, statusText) {
                done();
              }
            });

            $timeout.flush();
            $httpBackend.flush();
          });
        });
      });

      describe('flush', function () {
        it('should send the batched request before the timeout to send the batch has been reached', function (done) {
          var batchConfig = {
              batchEndpointUrl: 'http://www.someservice.com/batch',
              batchRequestCollectionDelay: 10000,
              minimumBatchSize: 1,
              adapter: defaultBatchAdapter
            },
            postData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=request\r\n\r\nGET /resource HTTP/1.1\r\nHost: www.gogle.com\r\n\r\n\r\n--some_boundary_mocked--',
            responseData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=response\r\n\r\n' +
            'HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\n\r\n' +
            '[{"Name":"Product 1","Id":1,"StockQuantity":100},{"Name":"Product 2","Id":2,"StockQuantity":2},{"Name":"Product 3","Id":3,"StockQuantity":32432}]' +
            '\r\n--some_boundary_mocked--\r\n';

          $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData).respond(200, responseData, {
            'content-type': 'multipart/mixed; boundary="some_boundary_mocked"'
          }, 'OK');

          sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('some_boundary_mocked');
          sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

          httpBatcher.batchRequest({
            url: 'http://www.gogle.com/resource',
            method: 'GET',
            callback: function () {
              done();
            }
          });

          httpBatcher.flush();

          $httpBackend.flush();
        });
      });
    });
  });
}(angular, sinon));
