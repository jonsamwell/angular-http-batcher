(function(angular, sinon) {
  'use strict';

  describe('npmBatchRequestAdapter', function() {
    beforeEach(inject(function($injector) {
      this.adapter = $injector.get('npmBatchRequestAdapter');
      this.sandbox = sinon.sandbox.create();
    }));

    afterEach(function() {
      this.sandbox.restore();
    });

    it('should be defined', function() {
      expect(this.adapter).to.exist();
    });

    describe('buildRequest()', function() {
      beforeEach(function() {
        this.config = {
          batchEndpointUrl: 'https://website.com/api/batch'
        };
      });

      beforeEach(function() {
        var self = this;

        this.testBatchRequest = function testBatchRequest(batchRequest, requests) {
          var requestIndex;
          var requestData;

          expect(batchRequest.method).to.equal('POST');
          expect(batchRequest.url).to.equal(self.config.batchEndpointUrl);

          if(self.config.batchRequestHeaders) {
            expect(batchRequest.headers).to.deep.equal(self.config.batchRequestHeaders);
          }

          for(requestIndex = 0; requestIndex < requests.length; requestIndex++) {
            requestData = batchRequest.data[requestIndex];

            expect(requestData).to.have.all.keys('method', 'uri', 'headers');
            expect(requestData.method).to.equal(requests[requestIndex].method);
            expect(requestData.uri).to.equal(requests[requestIndex].url);
            expect(requestData.headers).to.deep.equal(requests[requestIndex].headers);

            if(requestData.method !== 'GET') {
              expect(requestData).to.have.all.keys('body');

              expect(requestData.body).to.deep.equal(requests[requestIndex].data);
            }
          }

          expect(requestIndex).to.equal(requests.length);
        };
      });

      it('should build the correct request for a single GET request', function() {
        var requests = [{
          url:    '/api/resources/resourceId',
          method: 'GET'
        }];

        this.testBatchRequest(this.adapter.buildRequest(requests, this.config), requests);
      });

      it('should build the correct request for multiple GET requests', function() {
        var requests = [
          {
            url:    '/api/resources/resourceId1',
            method: 'GET'
          },
          {
            url:    '/api/resources/resourceId2',
            method: 'GET'
          }
        ];

        this.testBatchRequest(this.adapter.buildRequest(requests, this.config), requests);
      });

      it('should build the correct request for a single POST request', function() {
        var requests = [{
          url:    '/api/resources',
          method: 'POST',
          data:   {
            field:  'value'
          }
        }];

        this.testBatchRequest(this.adapter.buildRequest(requests, this.config), requests);
      });

      it('should build the correct request for multiple POST request', function() {
        var requests = [
          {
            url:    '/api/resources',
            method: 'POST',
            data:   {
              field:  'value'
            }
          },
          {
            url:    '/api/resources',
            method: 'POST',
            data:   {
              field:  'value2'
            }
          }
        ];

        this.testBatchRequest(this.adapter.buildRequest(requests, this.config), requests);
      });

      it('should build the correct request for a mix of GET and POST requests', function() {
        var requests = [
          {
            url:    '/api/resources',
            method: 'POST',
            data:   {
              field:  'value'
            }
          },
          {
            url:    '/api/resources/resourceId2',
            method: 'GET'
          }
        ];

        this.testBatchRequest(this.adapter.buildRequest(requests, this.config), requests);
      });

      it('should include batch headers in requests if specified', function() {
        var requests = [
          {
            url:    '/api/resources',
            method: 'POST',
            data:   {
              field:  'value'
            }
          },
          {
            url:    '/api/resources/resourceId2',
            method: 'GET'
          }
        ];

        this.config.batchRequestHeaders = {
          MyHeader:   'Header-Value'
        };

        this.testBatchRequest(this.adapter.buildRequest(requests, this.config), requests);
      });
    });

    describe('parseResponse()', function() {
      beforeEach(function() {
        this.testResponse = function testResponse(request, responseData, parsedResponse) {
          expect(parsedResponse).to.be.instanceof(window.ahb.HttpBatchResponseData);
          expect(parsedResponse.request).to.deep.equal(request);
          expect(parsedResponse.statusCode).to.equal(responseData.statusCode);
          expect(parsedResponse.data).to.deep.equal(responseData.body);
          expect(parsedResponse.headers).to.deep.equal(responseData.headers);
        };
      });

      it('should parse a single response', function() {
        var request;
        var response;
        var parsedResponses;

        request = {};

        response = {
          data: {
            0:    {
              statusCode: 200,
              body:       {
                data:       1
              },
              headers:    {
                header:     'One'
              }
            }
          }
        };

        parsedResponses = this.adapter.parseResponse([request], response);

        expect(parsedResponses).to.be.an('array').with.lengthOf(1);

        this.testResponse(request, response.data[0], parsedResponses[0]);
      });

      it('should parse multiple responses and multiplex them appropriately', function() {
        var requests;
        var responses;
        var parsedResponses;

        requests = [{
          url:    'https://api.website.com/resource/{id}?filter=test',
          method: 'GET'
        }, {
          url:    'https://api.website.com/resources/{id}',
          method: 'POST',
          body:   {
            data:   'something_important'
          }
        }];

        responses = {
          data: {
            0:    {
              statusCode: 200,
              body:       {
                data:       1
              },
              headers:    {
                header:     'One'
              }
            },
            1:    {
              statusCode: 204,
              body:       {
                data:       1
              },
              headers:    {
                header:     'Two'
              }
            }
          }
        };

        parsedResponses = this.adapter.parseResponse([request], response);

        expect(parsedResponses).to.be.an('array').with.lengthOf(2);

        this.testResponse(request, response.data[0], parsedResponses[0]);
        this.testResponse(request, response.data[1], parsedResponses[1]);
      });
    });
  });
}(angular, sinon));