using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace NGSS_Visualization.Models
{
    public class Standard
    {
        public string Id { get; set; }
        public string NGSSCode { get; set; }
        public string Description { get; set; }
        public string Url { get; set; }
        public string LowGrade { get; set; }
        public string HighGrade { get; set; }
        public string Type { get; set; }
 
        public string NumConnections { get; set; }
        public List<string> Connections { get; set; }

    }

}