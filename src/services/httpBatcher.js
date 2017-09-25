function convertHeadersToString(headers) {
  var property,
    result = '';
  for (property in headers) {
    result += property + ': ' + headers[property] + '\n';
  }

  return result;
}

function getAdapterFn() {
  var adapter = this.config.adapter;
  if (typeof adapter === 'object') {
    if (adapter.buildRequest === undefined || adapter.parseResponse === undefined) {
      throw new Error('A custom adapter must contain the methods "buildRequest" and "parseResponse" - please see the docs');
    }
  } else if (typeof adapter === 'string') {
    adapter = this.adapters[adapter];
    if (adapter === undefined) {
      throw new Error('Unknown type of http batch adapter: ' + this.config.adapter);
    }
  }

  return adapter;
}

function addRequestFn(request) {
  this.requests.push(request);

  if (this.requests.length >= this.config.maxBatchedRequestPerCall) {
    this.flush();
  }

  return true;
}

function sendFn() {
  var self = this,
    adapter = self.getAdapter(),
    httpBatchConfig = adapter.buildRequest(self.requests, self.config);

  self.sendCallback();
  self.$injector.get('$http')(httpBatchConfig).then(function (response) {
    var batchResponses = adapter.parseResponse(self.requests, response, self.config);

    angular.forEach(batchResponses, function (batchResponse) {
      batchResponse.request.callback(
        batchResponse.statusCode,
        batchResponse.data,
        convertHeadersToString(batchResponse.headers),
        batchResponse.statusText);
    });
  }, function (err) {
    angular.forEach(self.requests, function (request) {
      request.callback(err.statusCode, err.data, err.headers, err.statusText);
    });
  });
}

function flushFn() {
  this.$timeout.cancel(this.currentTimeoutToken);
  this.currentTimeoutToken = undefined;
  this.send();
}

function BatchRequestManager($injector, $timeout, adapters, config, sendCallback) {
  var self = this;
  this.$injector = $injector;
  this.$timeout = $timeout;
  this.adapters = adapters;
  this.config = config;
  this.sendCallback = sendCallback;
  this.requests = [];

  this.currentTimeoutToken = $timeout(function () {
    self.currentTimeoutToken = undefined;
    if (self.requests.length < self.config.minimumBatchSize) {
      self.sendCallback();
      // should let the request continue normally
      angular.forEach(self.requests, function (request) {
        request.continueDownNormalPipeline();
      });
    } else {
      self.send($injector);
    }

  }, config.batchRequestCollectionDelay, false);
}

BatchRequestManager.prototype.getAdapter = getAdapterFn;
BatchRequestManager.prototype.send = sendFn;
BatchRequestManager.prototype.addRequest = addRequestFn;
BatchRequestManager.prototype.flush = flushFn;

function HttpBatcherFn($injector, $timeout, httpBatchConfig, httpBatchAdapter, nodeJsMultiFetchAdapter, npmBatchRequestAdapter) {
  var self = this,
    currentBatchedRequests = {},
    adapters = {
      httpBatchAdapter:         httpBatchAdapter,
      nodeJsMultiFetchAdapter:  nodeJsMultiFetchAdapter,
      npmBatchRequestAdapter:   npmBatchRequestAdapter
    };

  self.canBatchRequest = canBatchRequestFn;
  self.batchRequest = batchRequestFn;
  self.flush = flushInternalFn;

  function canBatchRequestFn(url, method) {
    return httpBatchConfig.canBatchCall(url, method);
  }

  function batchRequestFn(request) {
    var batchConfig = httpBatchConfig.getBatchConfig(request.url),
      batchRequestManager = currentBatchedRequests[batchConfig.batchEndpointUrl];

    if (batchRequestManager === undefined) {
      batchRequestManager = new BatchRequestManager($injector, $timeout, adapters, batchConfig, function () {
        // this removes the batch request that will be sent from the list of pending calls.
        delete currentBatchedRequests[batchConfig.batchEndpointUrl];
      });

      currentBatchedRequests[batchConfig.batchEndpointUrl] = batchRequestManager;
    }

    batchRequestManager.addRequest(request);
  }

  function flushInternalFn(batchEndpointUrl) {
    angular.forEach(currentBatchedRequests, function (val, key) {
      var shouldFlush = batchEndpointUrl === undefined || batchEndpointUrl && key.toLocaleLowerCase() === batchEndpointUrl.toLocaleLowerCase();
      if (shouldFlush) {
        val.flush();
      }
    });
  }
}

HttpBatcherFn.$inject = [
  '$injector',
  '$timeout',
  'httpBatchConfig',
  'httpBatchAdapter',
  'nodeJsMultiFetchAdapter'
];

angular.module(window.ahb.name).service('httpBatcher', HttpBatcherFn);
