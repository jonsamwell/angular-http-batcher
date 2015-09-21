function HttpBackendDecorator($delegate, httpBatcher) {
  var $httpBackendFn = function (method, url, post, callback, headers, timeout, withCredentials, responseType) {
    var self = this,
      callArgs = arguments;
    if (httpBatcher.canBatchRequest(url, method)) {
      httpBatcher.batchRequest({
        method: method,
        url: url,
        data: post,
        callback: callback,
        headers: headers,
        timeout: timeout,
        withCredentials: withCredentials,
        responseType: responseType,
        continueDownNormalPipeline: function () {
          $delegate.apply(self, callArgs);
        }
      });
    } else {
      // could use '.call' here as it is quicker but using apply enables us to pass param array
      // and be forward/backward compatible with all the Angular versions.
      return $delegate.apply(this, arguments);
    }
  };

  // If we are testing using angular-mocks we need to provide their special methods
  // on the function we are returning otherwise your tests won't work :-(.
  if (angular.mock) {
    angular.forEach($delegate, function (fn, key) {
      $httpBackendFn[key] = fn;
    });
  }

  return $httpBackendFn;
}

HttpBackendDecorator.$inject = [
  '$delegate',
  'httpBatcher'
];

function ProviderDecoratorFn($provide) {
  $provide.decorator('$httpBackend', HttpBackendDecorator);
}

ProviderDecoratorFn.$inject = [
  '$provide'
];

angular.module(window.ahb.name).config(ProviderDecoratorFn);
