The Angular 2+ version of this project can be found here https://github.com/jonsamwell/ngx-http-batcher


Angular Http Batcher - enabling transparent HTTP batch request with AngularJS
====================

The biggest performance boost you will get with modern single page style apps is to reduce the number of HTTP request you 
send.  This module has been designed to batch http requests to the same endpoint following the http 1.1 batch spec and after the
1.11.0 update it can now support serialising to any number of batch formats and I'm planning to implement that Facebook batch protocol very soon.  All you need to do is configure the batch endpoint with the library and the rest is taken care of!

See my original blog post for a detailed overview - http://jonsamwell.com/batching-http-requests-in-angular/

<h3 id="angular-http-batcher-getting-started">Getting Started</h3>

Install the module via bower or download the latest [distribution](https://github.com/jonsamwell/angular-http-batcher/blob/master/dist/angular-http-batch.min.js) from github.

```language-javascript
bower install angular-http-batcher --save-dev 
```

Include the javascript file in your html.

```language-markup
<script src="bower_components/angular-http-batcher/dist/angular-http-batch.min.js"></script>
```

Add the module as one of you application's dependencies.

```langauge-javascript
angular.module('myApp', ['jcs.angular-http-batch']);
```

This module aims to be as transparent as possible.  I didn't want to add specific methods to send batch requests manually (although this feature is in the pipeline) as I think this should happen transparently for the developer so you are not tying your application to a specific implementation.  So in order for the library to be able to digisuse batchable HTTP request you need to register an endpoint that can accept a HTTP 1.1 batch request.

```language-javascript
angular.module('myApp', ['jcs.angular-http-batch']);
   .config([
      'httpBatchConfigProvider',
          function (httpBatchConfigProvider) {
             httpBatchConfigProvider.setAllowedBatchEndpoint(
                     // root endpoint url
                     'http://api.myapp.com',
                     
                     // endpoint batch address
                     'http://api.myapp.com/batch',
                     
                     // optional configuration parameters
                     {
                     	maxBatchedRequestPerCall: 20
                     });
         }
]);
```

The root endpoint url is simply the base address of your api and the endpoint batch address is the url of the method that can accept the batch request (usually just /batch or /$batch).  You are able to pass some optional configuration paramaters to this call in the third argument (see below)

The setAllowedBatchEndpoint has some options that can be passed in as a third parameter to the call which are explained below.

```language-javascript
{
	maxBatchedRequestPerCall: 10,
	minimumBatchSize: 2,
	batchRequestCollectionDelay: 100,
	ignoredVerbs: ['head'],
    sendCookies: false,
    enabled: true,
    adapter: 'httpBatchAdapter' //defaults to this value we currently also support a node js multifetch format as well
}
```

####adapter
The key of the adapter to use to serialise/deserialise batch requests.  Defaults to the HTTP 1.1 adapter 'httpBatchAdapter'.

Current adapters are:

 1. 'httpBatchAdapter': supports the HTTP 1.1 spec and used by .Net (WebAPI) and JAVA servers.
 2. 'nodeJsMultiFetchAdapter': supports batching GET requests to a node server that uses the multifetch library.
    
Coming soon:

 1. 'facebookAdapter': will support the facebook batching protocol.

**Please request adapters that are not present.**

Adapters convert http requests into a single batch request and parse the batch response.  They consist of two methods defined below.

This adapter parameter can also be an object with the two below functions if you need to be more specific about the way
requests and responses are handled.

```javascript
   /**
    * Builds the single batch request from the given batch of pending requests.
    * Returns a standard angular httpConfig object that will be use to invoke the $http service.
    * See:
    * https://developers.google.com/storage/docs/json_api/v1/how-tos/batch
    * http://blogs.msdn.com/b/webdev/archive/2013/11/01/introducing-batch-support-in-web-api-and-web-api-odata.aspx
    *
    * @param requests - the collection of pending http request to build into a single http batch request.
    * @param config - the http batch config.
    * @returns {object} - a http config object.
    */
   function buildRequestFn(requests, config) {
     var httpConfig = {
         method: 'POST',
         url: config.batchEndpointUrl,
         cache: false,
         headers: config.batchRequestHeaders || {}
       };

     // do processing...

     return httpConfig;
   }

   /**
    * Parses the raw response into an array of HttpBatchResponseData objects.  If is this methods job
    * to parse the response and match it up with the orginal request object.
    * @param rawResponse
    * @param config
    * @returns {Array.HttpBatchResponseData[]}
    */
   function parseResponseFn(requests, rawResponse, config) {
     var batchResponses = []; // array of HttpBatchResponseData

     //do processing..

     return batchResponses;
   }
```

####maxBatchedRequestPerCall
The maximum number of single http request that are allow to be sent in one http batch request.  If this limit is reached the call will be split up into multiple batch requests.  This option defaults to 10 request per batch but it is probably worth playing around with this number to see the optimal batch size between total request size and response speed.

####minimumBatchSize
The smallest number of individual calls allowed in a batch request.  This has a default value of 2 as I think the overhead for sending a single HTTP request wrapped up in a batch request on the server would out wieght the efficency.  Therefore if only one request is in the batch that request is allow to continue down the normal $http pipeline.

####ignoredVerbs
This is a string array of the HTTP verbs that are **not** allowed to form part of a batch request.  By default HEAD requests will not be batched.  If for instance you did not want to batch HEAD and DELETE calls you would pass in this array as an option <code>['head', 'delete']</code>

####enabled
True by default.  If this is set to false the batcher will ignore all requests and they will be send as normal single HTTP requests.

####canBatchRequest
An optional function which determines if the request can be batched - if present this overrides the default mechanism used by the library.  It takes in the url and http method of a pending request and returns true if this request can be batched otherwise false.

For example:

```language-javascript
    function(url, method) {
      return url.indexOf('api') > -1 && method.toLowerCase() === 'get';
    }
```

####batchRequestHeaders

An optional object of header keys and values that will be added to a batched request header's before sending to the server.
For instance java servlet <= 3.1 parses multipart requests looking for the Content-Disposition header, expecting all multipart requests to include form data

{
    batchRequestHeaders: {'Content-disposition': 'form-data'}
}

See notes on running this with java servlet <= 3.1

####batchPartRequestHeaders

An optional object of header keys and values that will be added to each batched request part header's before sending to the server.
For instance java servlet <= 3.1 parses multipart requests looking for the Content-Disposition header, expecting all multipart requests to include form data

{
    batchPartRequestHeaders: {'Content-disposition': 'form-data'}
}

See notes on running this with java servlet <= 3.1

####uniqueRequestName

An optional parameter to set a unique parameter name on the Content-Disposition header.
This requires the use of `batchPartRequestHeaders` sending in a Content-Disposition header.  Sample configuration:

```language-javascript
  {
    ...
    batchPartRequestHeaders: {'Content-Disposition': 'form-data' },
    uniqueRequestName: "batchRequest"
    ...
  }
```

Some backend servers may require that each part be named in this manner.
If the configuration above is used, then each part will have a header like this:
```Content-Disposition: form-data; name=batchRequest0```

If a Content-Disposition header is not added in the `batchPartRequestHeaders` then this parameter
is silently ignored.


####sendCookies
False by default to reduce request size.  If this is set to true cookies available on the document.cookie property will be set
in each segment of a batch request.  Note that only non HTTPOnly cookies will be sent as HTTPOnly cookies cannot be access by JavaScript
because of security limitations.

Note that if you are sending CORS request you will have to enable withCredentials on $http to allow cookies to be sent on the XHR request.

```language-javascript
    angular.module('myApp').config(['$httpProvider', function($httpProvider) {
        $httpProvider.defaults.withCredentials = true;
    }]);
```

Also ensure the server responds to the OPTIONS call with the below header:

```language-csharp
Access-Control-Allow-Credentials: true

// As an attribute on the controller
[EnableCors("*", "*", "*", SupportsCredentials=true)]

or

// Comples scenario on the config
config.EnableCors();
var defaultPolicyProvider = new EnableCorsAttribute("*", "*", "*");
defaultPolicyProvider.SupportsCredentials = true; //important if you are sending cookies
AttributeBasedPolicyProviderFactory policyProviderFactory = new AttributeBasedPolicyProviderFactory();
policyProviderFactory.DefaultPolicyProvider = defaultPolicyProvider;
config.SetCorsPolicyProviderFactory(policyProviderFactory);

config.Routes.MapHttpRoute(
    name: "BatchApi",
    routeTemplate: "api/batch",
    defaults: null,
    constraints: null,
    handler: new CorsMessageHandler(config) { InnerHandler = new DefaultHttpBatchHandler(GlobalConfiguration.DefaultServer) });
```

####batchRequestCollectionDelay
This is undoubtedly the most important option.  As this module tries to be as transparent as possible to the user.

The default time in milliseconds the http batcher should wait to collection all request to this domain after the first http call that can be batched has been collect.  This defaults to 100ms.  Therefore if you send a HTTP GET call that can be batched the HTTP batcher will receive this call and wait a further 100ms before sending the call in order to wait for other calls to the same domain in order to add them to the current batch request.  If no other calls are collected the initial HTTP call will be allowed to continue as normal and will not be batched unless the config property - **minimumBatchSize** is set to one.

<h4 id="flushing-all-requests">Immediately flushing all pending requests</h4>
In some instances you might want to immediately send all pending request regardless of if the request quota or timeout limit has been reached.  To do this you can simply call the flush method on the httpBatcher service and optionally pass in the url of the batch endpoint you want to flush (if no parameter is passed in all pending requests to all endpoints are flushed).

```language-javascript
angular.module('myApp', ['jcs.angular-http-batch']);
   .run([
      'httpBatcher',
          function (httpBatcher) {
             httpBatcher.flush();
         }
]);
```

<h3 id="angular-http-batcher-getting-started-with-asp-web-api">Configuring .Net Web API 2 for Batch Requests</h3>

This is **really** simple the web api team have done a really good job here.  To enable batch request handling you just add a new route to your application and the rest is done for you!  It's so easy I don't see any reason for you not to do it!  See [this link](http://blogs.msdn.com/b/webdev/archive/2013/11/01/introducing-batch-support-in-web-api-and-web-api-odata.aspx) for a more detailed setup guide.  Just add the below code to your web api configuration class and you are good to go!

```language-csharp
configuration.Routes.MapHttpBatchRoute(
        routeName:"batch",
        routeTemplate:"api/batch",
        batchHandler:new DefaultHttpBatchHandler(server));
```

<h4 id="running-with-java-servlet-3-1">Configuring for Java Servlet <= 3.1</h4>
Java Servlet <= 3.1 parses multipart requests looking for the Content-Disposition header, expecting all multipart requests to include form data.
It also expects a content disposition header per request part in the batch.

Therefore you will need to setup the library to do this.  Add the below to your config object when initialising the batch endpoint.

```language-javascript
{
    batchRequestHeaders: {'Content-disposition': 'form-data'},
    batchPartRequestHeaders: {'Content-disposition': 'form-data'}
}
```
