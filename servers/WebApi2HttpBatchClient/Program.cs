using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace WebApi2HttpBatchClient
{
    class Program
    {
        static void Main(string[] args)
        {
            var client = new HttpClient();
            var batchRequest = new HttpRequestMessage(
                HttpMethod.Post,
                "http://fsatnav:8080/api/batch"
            );

            var batchContent = new MultipartContent("mixed");
            batchRequest.Content = batchContent;

            batchContent.Add(
                new HttpMessageContent(
                    new HttpRequestMessage(
                        HttpMethod.Get,
                        "http://localhost:8080/api/products"
                    )
                )
            );

            batchContent.Add(
                new HttpMessageContent(
                    new HttpRequestMessage(
                        HttpMethod.Get,
                        "http://localhost:8080/api/products/2"
                    )
                )
            );

            using (Stream stdout = Console.OpenStandardOutput())
            {
                Console.WriteLine("<<< REQUEST >>>");
                Console.WriteLine();
                Console.WriteLine(batchRequest);
                Console.WriteLine();
                batchContent.CopyToAsync(stdout).Wait();
                Console.WriteLine();

                var batchResponse = client.SendAsync(batchRequest).Result;

                Console.WriteLine("<<< RESPONSE >>>");
                Console.WriteLine();
                Console.WriteLine(batchResponse);
                Console.WriteLine();
                batchResponse.Content.CopyToAsync(stdout).Wait();
                Console.WriteLine();
                Console.WriteLine();
            }

            Console.ReadLine();
        }
    }
}
