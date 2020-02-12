
using System.Collections.Generic;
using RDotNet;
using static NGSS_Visualization.Controllers.NGSSController;


namespace NGSS_Visualization.Models
{

   //Contains the functions for calling R/igraph to build the network layout. 
    public static class GraphLayout
    {
      
        //Function to be called from the controller to start computing x,y coordinates.
        //Parameters: The server mapped path to R.dll and the list of edges in the graph. 
        public static List<Coordinate> ComputeLayout(string path, string gmlString)
        {
            //A list that will contain x and y coordinates.
            List<Coordinate> coordinates = new List<Coordinate>();

            //get an instance of REngine
            REngine engine = _InitREngine(path);

            //load the igraph library and build out r function to compute graph layout. 
            engine.Evaluate("library(igraph)");
            var myFunc = engine.Evaluate(GetKKFunctionString(gmlString)).AsFunction();

            //Call the R function and build the list of coordinates. Even indeces are x coords and odd are y coords.
            var c = engine.Evaluate(@"d <- compute_layout()").AsNumericMatrix().ToArray();
            for(int i = 0; i < c.Length /2; i++)
            {
                coordinates.Add(new Coordinate
                {
                    X = NormalizeCoordinate(c[i, 0]),
                    Y = NormalizeCoordinate(c[i, 1]),
                });
                
            }

            return coordinates;
        }


        //Takes the server-mapped path to the R.dll files and initializes and returns a REngine instance.
        private static REngine _InitREngine(string path)
        {
            REngine.SetEnvironmentVariables(path + @"\R_foo\R-3.6.2\bin\i386", path + @"\R_foo\R-3.6.2");
            var engine = REngine.GetInstance();
            engine.Initialize();
            return engine;
        }


        //Normalized the x, y coordinates to be from 0 to 100;
        private static double NormalizeCoordinate(double coord)
        {
            return 100 * coord;
        }


        //Builds the r program to compute layout coordinates using igraph. 
        private static string GetKKFunctionString(string gmlString)
        {     
            string s = "compute_layout <- function(){\n";
            s +=   "r <- " + gmlString  + ";\n";
            s += "cat(r, file = temp <- tempfile());\n";
            s += "g <- read_graph(temp, format = \"gml\");\n";
            s += "mylay = layout_with_kk(g);\n";
            s += "return (mylay);\n";
            s += "}\n";
            
            return s;
        }
    }


    //An x,y layout coordinate for a node in the network. 
    public class Coordinate
    {
        public double X { get; set; }
        public double Y { get; set; }
    }
}