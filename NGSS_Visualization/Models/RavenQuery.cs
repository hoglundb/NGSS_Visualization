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

        public static  GraphData QueryGraphDataAsync(string certPath)
        {
            //Set the connection parameters based on whether we are using our local RavenDB or the cloud service. 
            bool UseLocalDB = false;

            var Urls = new[] { "https://a.prod.te.ravendb.cloud" };
            var Database = "NGSS_Network_Test";
            var cert = new System.Security.Cryptography.X509Certificates.X509Certificate2(certPath, "azureraven", System.Security.Cryptography.X509Certificates.X509KeyStorageFlags.MachineKeySet);
            if (UseLocalDB)
            {
                Urls = new[] { "http://localhost:8081" };
                Database = "Prod_TE_Port";
                cert = null;
            }


            GraphData graphData = new GraphData();

            using (DocumentStore store = new DocumentStore
            {
                Urls = Urls,
                Certificate = cert,
                Database = Database
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