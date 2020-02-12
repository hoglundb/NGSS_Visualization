using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace NGSS_Visualization.Models
{
    public class Provider
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public List<Resource> Resources { get; set; }
    }
}