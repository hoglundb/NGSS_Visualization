//File contains a class with all the global constants and variables 

//holds the vis network objects
var VISJS_NODES = null;
var VISJS_EDGES = null;
var VISJS_DATA = null;
var VISJS_GRAPH = null;
var VISJS_OPTIONS = null;


//font attributes
const STD_DESCRIPTION_LENGTH = 120;
const STD_LINE_HEIGHT = 1.2;
const DOCS_LINE_HEIGHT = 1.2;
const STD_NODE_SIZE = 13;
const STD_NODE_HIGHLIGHT_SIZE = 18;
const BLANK_STD_LABLE = "          ";
const BLANK_RESOURCE_LABEL = "      ";


//The list of colors and highlight colors available for resources providers. 
const ResourceProviderColors = [];
ResourceProviderColors[0] = { color: "#F3C300", highlightColor: "#FFDF63" } //brown
ResourceProviderColors[1] = { color: "#A1CAF1", highlightColor: "#C9E4FF" } //cyan
ResourceProviderColors[2] = { color: "#F38400", highlightColor: "#F6B764" } //orange
ResourceProviderColors[3] = { color: "#C1A784", highlightColor: "#CDB99E" } //purple pink
ResourceProviderColors[4] = { color: "#79A99E", highlightColor: "#9FC6BD" }//grey
ResourceProviderColors[5] = { color: "#FF6BA1", highlightColor: "#FFA4C5" } //light greeen
ResourceProviderColors[6] = { color: "#9ACD32", highlightColor: "#BAE85F" } //olive
ResourceProviderColors[7] = { color: "#E295E0", highlightColor: "#F5C6F3" } //cyan
ResourceProviderColors[8] = { color: "#C0C0C0", highlightColor: "#DEDEDE" } //orange


//The list of shapes that can be used to represent the various resource providers
const ResourceProviderShapes = ["circle", "diamond", "square", "triangle", "triangleDown", "star"];

//Enum to hold a list of all possible node types in the graph. 
const NodeTypes = {
    "TOPIC": "Topic",
    "PE" : "PE",
    "CC": "CC",
    "DCI": "DCI",
    "SEP": "SEP",
    "CC_CATEGORY": "cc_category",
    "DCI_CATEGORY":"dci_category",
    "SEP_CATEGORY": "sep_category",
    "TOPIC_GRADEBAND": "topic_gradeband",
    "RESOURCE" : "resource"
}



//The grades that are considered in the gradeband progression. Grades 1-5 are individual while grades 6-8 and 9-12 are together. 
const NUM_GRADES = 8;
const Grades = {
    "Kindergarden": "K",
    "FirstGrade": "1",
    "SecondGrade": "2",
    "ThirdGrade": "3",
    "FourthGrade": "4",
    "FifthGrade": "5",
    "SixToEight": "6-8",
    "NineToTwelve": "9-12",
}


//Enum to hold all the graph modes for viewing the NGSS. 
const GraphModes = {
    "NGSS": "ngss",
    "CC_CATEGORIES": "cc_categories",
    "DCI_CATEGORIES": "dci_categories",
    "SEP_CATEGORIES": "sep_categories",
    "GRADEBAND": "gradeband",
    "RESOURCE": "resource"
}


const GraphLabels = {
    "ASN": "asn",
    "NGSS": "ngss"
}


const GraphViews = {
    "NGSS": "NGSS",
    "TOPIC": "Topic",
    "GRADEBAND":"Gradeband",
    "CC": "CC",
    "DCI": "DCI",
    "SEP": "SEP"
}


const GraphLayouts = {
    "KK": 'Kamada Kawai layout',
    "FF": "Firteramn Reigngold layout",
}


//A list of all the colors and highlight colors used for the standards in the Graph
const NGSSColors = {
    //DCI colors
    "ORANGE": "#FBC08C",
    "ORANGE_HIGHLIGHT": "#FFE4CB",

    //CC colors
    "GREEN": "#CDE49F",
    "GREEN_HIGHLIGHT": "#E8F3D6",

    //SEP colors
    "BLUE": "#9FBDE4",
    "BLUE_HIGHLIGHT": "#C2DAF9",

    //Topic colors
    "PURPLE": "#EFB2F2",
    "PURPLE_HIGHLIGHT": "#FEE2FF",

    //PE colors
    "GREY": "#D4D4D4",
    "GREY_HIGHLIGHT" : "#EFEFEF",

}


//size and highlight size attributes for the various nodes in the graph. 
//NodeSizes{
//    "STANDARD_NODE_SIZE" : "100",
    
//}


//the page state contains all the parameters that determine how to draw the graph. 
class PageState {
    constructor() {
        this.currentNodeId = null;                 //the searched node (if applicable)
        this.Depth = 2;                            //depth from the starting node to draw the graph
        this.StandardsLabel = GraphLabels.NGSS;    //Determines if the standards should be labeled using ASN or NGSS identifiers 
        this.View = GraphViews.TOPIC;              //View as selected from the dropdown
        this.Category = "Topic_Energy";            //Category as selected from the dropdown
        this.Lowgrade = null;                      //The lowgrade as selected from the dropdown
        this.Highgrade = null;                     //The highgrade as selected from the dropdown
        this.layout = GraphLayouts.KK;             //The current selected layout type for the graph
        this.Providers = [];                       //Array of currently selected providers from the dropdown
        this.searchString = null;                  //text search string from the search box. 
    }



    //returns the node type of a bundle based on the current graph view.
    getBundleTypeFromView() {

    }


    //Sets the page state based on the currently selected dropdown items. The network should only be drawn after this function is called. 
    set() {

    }
}

//Globaly keep track of which graph type we are building 
var CurrentGraphMode = GraphModes.GRADEBAND;


class Globals {
   
}