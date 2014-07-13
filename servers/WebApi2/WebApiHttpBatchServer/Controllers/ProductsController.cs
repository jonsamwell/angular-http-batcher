using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.Web.Http.Cors;
using WebApiHttpBatchServer.Models;

namespace WebApiHttpBatchServer.Controllers
{
    [EnableCors("*", "*", "*")]
    public class ProductsController : ApiController
    {
        private IEnumerable<Product> _products = new Product[] {
                new Product() { Name = "Product 1", Id = 1, StockQuantity = 100 },
                new Product() { Name = "Product 2", Id = 2, StockQuantity = 2 },
                new Product() { Name = "Product 3", Id = 3, StockQuantity = 32432 }
            };


        [HttpGet]
        public IEnumerable<Product> Products()
        {
            return _products;
        }

        [HttpGet]
        public Product Product(long id)
        {
            return _products.FirstOrDefault(x => x.Id == id);
        }

        [HttpPut]
        public long Create(Product product)
        {
            return 1;
        }
    }
}
