using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace NGSS_Visualization.Models
{
   
    public class Category
    {
        public string Id { get; set; }
        public string Type { get; set; }
        public string Description { get; set; }
        public string IsNGSS { get; set; }

        public List<string> Standards { get; set; }
    }
}