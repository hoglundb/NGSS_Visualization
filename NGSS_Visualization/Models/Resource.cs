using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace NGSS_Visualization.Models
{
    public class Resource
    {
        public string Id { get; set; }
        public string Url { get; set; }
        public string Title { get; set; }
        public string Summary { get; set; }
        public string Type { get; set; }
        public List<string> Alignments { get; set; }
    }
}