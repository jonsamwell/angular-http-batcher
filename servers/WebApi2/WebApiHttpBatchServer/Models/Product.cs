using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace WebApiHttpBatchServer.Models
{
    public class Product
    {
        public string Name { get; set; }
        public long Id { get; set; }
        public int StockQuantity { get; set; }
    }
}