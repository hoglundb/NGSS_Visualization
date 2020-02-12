using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace NGSS_Visualization.Models
{
    public class GraphData
    {
        public List<Category> Categories { get; set; }
        public List<Provider> Providers { get; set; }
        public List<Standard> Standards { get; set; }

        public GraphData()
        {
            this.Categories = new List<Category>();
            this.Providers = new List<Provider>();
            this.Standards = new List<Standard>();
        }
    }
}