using Newtonsoft.Json;
using Raven.Client.Documents;
using Raven.Client.Documents.Session;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;

namespace NGSS_Visualization.Models
{

 
    public static class RavenQuery 
    {

        public static  GraphData QueryGraphDataAsync()
        {
            
            GraphData graphData = new GraphData();
            var cert = new System.Security.Cryptography.X509Certificates.X509Certificate2(@"C:\\Users\hoglundb\Downloads\prod.te.client.certificate.pfx", "azureraven", System.Security.Cryptography.X509Certificates.X509KeyStorageFlags.MachineKeySet);
            using (DocumentStore store = new DocumentStore
            {

                
                Urls = new[] { "http://localhost:8081" },
               Database = "Prod_TE_Port",

                //Certificate = cert,
               // Urls = new[] { "https://a.prod.te.ravendb.cloud" },
               // Database = "NGSS_Network_Test",
            })
            {
                store.Initialize();
                SessionOptions options = new SessionOptions
                {
                    TransactionMode = TransactionMode.ClusterWide
                };
                using (IAsyncDocumentSession session =  store.OpenAsyncSession())
                {
                    List<Category> categories = session.Advanced.AsyncDocumentQuery<Category>().ToListAsync().Result;
                    List<Standard> standards = session.Advanced.AsyncDocumentQuery<Standard>().ToListAsync().Result;
                    List<Provider> providers = session.Advanced.AsyncDocumentQuery<Provider>().ToListAsync().Result;
                    graphData.Categories = categories;
                    graphData.Standards = standards;
                    graphData.Providers = providers;
                    return graphData;
                }
            }
            }
    }
}