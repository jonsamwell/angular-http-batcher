using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Web.Http;
using System.Web.Http.Batch;
using System.Web.Http.Cors;
using System.Web.Http.Dispatcher;

namespace WebApiHttpBatchServer
{
    public static class WebApiConfig
    {
        public static void Register(HttpConfiguration config)
        {
            config.EnableCors();
            // Web API routes
            config.EnableSystemDiagnosticsTracing().IsVerbose = true;
            config.MapHttpAttributeRoutes();

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
            
            config.Routes.MapHttpRoute(
                name: "DefaultApi",
                routeTemplate: "api/{controller}/{id}",
                defaults: new { id = RouteParameter.Optional },
                constraints: null,
                handler: new CorsMessageHandler(config) { InnerHandler = new HttpControllerDispatcher(config) }
            );
        }
    }
}
