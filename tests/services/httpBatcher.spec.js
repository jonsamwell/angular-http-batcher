(function (angular, sinon) {
    'use strict';
    describe('httpBatcher', function () {
        var sandbox, $httpBackend, $timeout, httpBatchConfig, httpBatcher;

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

            describe('batchRequest', function () {
                it('should call getBatchConfig on httpBatchConfig', function () {
                    sandbox.stub(httpBatchConfig, 'getBatchConfig').returns({
                        batchEndpointUrl: 'http://www.someservice.com/batch'
                    });

                    httpBatcher.batchRequest({
                        url: 'http://www.gogle.com/resource',
                        method: 'GET'
                    });

                    expect(httpBatchConfig.getBatchConfig.calledOnce).to.equal(true);
                });

                it('should call batchEndpointUrl after batchRequestCollectionDelay timeout has passed', function () {
                    $httpBackend.expectPOST('http://www.someservice.com/batch').respond(404);
                    sandbox.stub(httpBatchConfig, 'getBatchConfig').returns({
                        batchEndpointUrl: 'http://www.someservice.com/batch',
                        batchRequestCollectionDelay: 200,
                        minimumBatchSize: 1
                    });

                    httpBatcher.batchRequest({
                        url: 'http://www.gogle.com/resource',
                        method: 'GET'
                    });

                    $timeout.flush();
                    $httpBackend.flush();
                });

                it('should create the correct http post data for a single GET request', function () {
                    var batchConfig = {
                            batchEndpointUrl: 'http://www.someservice.com/batch',
                            batchRequestCollectionDelay: 200,
                            minimumBatchSize: 1
                        },
                        postData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=request\r\n\r\nGET /resource HTTP/1.1\r\nHost: www.gogle.com\r\n\r\n\r\n--some_boundary_mocked--',
                        responseData = '';

                    $httpBackend.expectPOST(batchConfig.batchEndpointUrl, postData).respond(404, responseData);
                    sandbox.stub(httpBatchConfig, 'calculateBoundary').returns('some_boundary_mocked');
                    sandbox.stub(httpBatchConfig, 'getBatchConfig').returns(batchConfig);

                    httpBatcher.batchRequest({
                        url: 'http://www.gogle.com/resource',
                        method: 'GET'
                    });

                    $timeout.flush();
                    $httpBackend.flush();
                });

                it('should create the correct http post data for a single POST request', function () {
                    var batchConfig = {
                            batchEndpointUrl: 'http://www.someservice.com/batch',
                            batchRequestCollectionDelay: 200,
                            minimumBatchSize: 1
                        },
                        postData = '--some_boundary_mocked\r\nContent-Type: application/http; msgtype=request\r\n\r\nPOST /resource HTTP/1.1\r\n' +
                        'Host: www.gogle.com\r\n\r\n"{\\"propOne\\":1,\\"propTwo\\":\\"two\\",\\"propThree\\":3,\\"propFour\\":true}"\r\n\r\n--some_boundary_mocked--',
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
                        })
                    });

                    $timeout.flush();
                    $httpBackend.flush();
                });

                it('should create the correct http post data for a single GET request with custom headers', function () {
                    var batchConfig = {
                            batchEndpointUrl: 'http://www.someservice.com/batch',
                            batchRequestCollectionDelay: 200,
                            minimumBatchSize: 1
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
                        }
                    });

                    $timeout.flush();
                    $httpBackend.flush();
                });
            });
        });
    });
}(angular, sinon));
