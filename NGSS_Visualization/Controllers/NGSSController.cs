using NGSS_Visualization.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Newtonsoft;
using Newtonsoft.Json;
using System.Text;
using RDotNet;

namespace NGSS_Visualization.Controllers
{
    public class NGSSController : Controller
    {

        public ActionResult NGSSGraph()
        {
            return View();
        }


        [HttpPost]
        public JsonResult GetGraphLayout(string gmlString)
        {
            string path = Server.MapPath("~/App_Data");


            List<Coordinate> coordinates = GraphLayout.ComputeLayout(path, gmlString);
          
            JsonResult result = Json(new
            {
                coords = JsonConvert.SerializeObject(coordinates)
            });

          return result;
        }


        [HttpPost]
        public   JsonResult GetGraphData()
        {

            var data = RavenQuery.QueryGraphDataAsync();

            JsonResult result = Json(new {
                                    categories = JsonConvert.SerializeObject(data.Categories),
                                    providers = JsonConvert.SerializeObject(data.Providers),
                                    standards = JsonConvert.SerializeObject(data.Standards)
            });

            //Need to override default since we are posting a crap load of json (ie the whole NGSS network and all resources)
            result.MaxJsonLength = 100000000;

            return result;
        }
    }
}