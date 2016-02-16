(function (angular, sinon) {
  'use strict';

  describe('httpBackend decorator', function () {
    var sandbox, $httpBackend, httpBatcher;

    beforeEach(module(global.ahb.name));

    describe('ngModelDirective', function () {
      beforeEach(inject(function ($injector) {
        sandbox = sinon.sandbox.create();
        $httpBackend = $injector.get('$httpBackend');
        httpBatcher = $injector.get('httpBatcher');
      }));

      afterEach(function () {
        sandbox.restore();
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
      });

      it('should call canBatchRequest when invoked', function () {
        sandbox.stub(httpBatcher, 'canBatchRequest').returns(true);
        sandbox.stub(httpBatcher, 'batchRequest');

        $httpBackend('GET', 'http://www.google.com');

        expect(httpBatcher.canBatchRequest.calledOnce).to.equal(true);
      });

      it('should call batchRequest when canBatchRequest returns true', function () {
        sandbox.stub(httpBatcher, 'canBatchRequest').returns(true);
        sandbox.stub(httpBatcher, 'batchRequest');

        $httpBackend('GET', 'http://www.google.com');

        expect(httpBatcher.canBatchRequest.calledOnce).to.equal(true);
        expect(httpBatcher.batchRequest.calledOnce).to.equal(true);
      });

      it('should call base httpBackend method if canBatchRequest returns false', function () {
        sandbox.stub(httpBatcher, 'canBatchRequest').returns(false);
        sandbox.stub(httpBatcher, 'batchRequest');
        $httpBackend.expectGET('http://www.google.com').respond(200);

        $httpBackend('GET', 'http://www.google.com', undefined, angular.noop);

        $httpBackend.flush();

        expect(httpBatcher.canBatchRequest.calledOnce).to.equal(true);
        expect(httpBatcher.batchRequest.called).to.equal(false);
      });

      it('should add a continueDownNormalPipeline method to the object passed to batchRequest which when invoked calls the normal httpBackend method', function () {
        sandbox.stub(httpBatcher, 'canBatchRequest').returns(true);
        sandbox.stub(httpBatcher, 'batchRequest');

        $httpBackend.expectGET('http://www.google.com').respond(200);

        $httpBackend('GET', 'http://www.google.com', undefined, angular.noop);

        expect(httpBatcher.batchRequest.getCall(0).args[0].continueDownNormalPipeline).to.not.equal(undefined);
        httpBatcher.batchRequest.getCall(0).args[0].continueDownNormalPipeline();

        $httpBackend.flush();
      });
    });
  });
}(angular, sinon));
