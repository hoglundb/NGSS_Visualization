/**************************************************************************************************
    This class is to hold the global GraphObj used to draw the Vis.js network. This class contains
   a list of nodes and a list of edges. Each node as an assiciated type and metadata. This is used
   to determine how to draw the graph as each node is drawn according to its type. 

   This class contains several functions for building the graph. The appropriate one is called in Build()
   depending on what type of graph we are asked to draw (determined by the global PageStateObj).
 
   The data source for building the graph is the global DataStoreObj. Thus we must make the ajax post to 
   build the DataStoreObj before calling Build() on the Graph Object. 
 *************************************************************************************************/


class Graph {

    constructor() {
        this.Nodes = [];
        this.Edges = [];
        this.GraphType = null;
        this.Size = 0;
    }


    //makes a call to the correct buildGraph function depending on what kind of network we are building. Builds the graph from the global DataStore object. 
    async Build() {

        //initialize the data members for this graph
        this.Nodes = [];
        this.Edges = [];
        this.GraphType = null;
        this.Size = 0;

        //Determine which type of graph to build based on the current view. Make a call to the correct BuildGraph() function
        if (PageStateObj.View == GraphViews.NGSS) {
            this._BuildStandardsGraph();
        }
        else if (PageStateObj.View == GraphViews.TOPIC) {
            this._BuildTopicCategoryGraph();
        }
        else if (PageStateObj.View == GraphViews.CC || PageStateObj.View == GraphViews.SEP || PageStateObj.View == GraphViews.DCI) {
            this._Build3DCategoryGraph();
        }
        else if (PageStateObj.View == GraphViews.GRADEBAND) {
            this._BuildGradeBandGraph();
        }

        //add any resources as determined by the list of resources in the DataStoreObj
        await this._AddResources();

        //Make ajax post to server to compute the layout coordinates for the graph object 
        await this.GetNodeCoordinates();

        //set the color, highlight color, size, and highlight size of each node based on its type.
        await this.SetNodeColors();
        await this.SetNodeSizes();

        //set the DisplayedResourceCount field in the DataStoreObj so each provider knows how many resources it can display based on the graph
        this._SetDisplayedResourceCount();

    }


    //Addes resource nodes and edges to the graph, as specified in the PageStateObj. If no resources are selected, than node will be added 
    _AddResources() {
        var self = this;
        for (var i in DataStoreObj.Providers) {
            var currentResources = [];             //tracks how many resource of this type could potentially show in the graph 
            var currentResourceCount = 0;
            var prov = DataStoreObj.Providers[i];
            prov.DisplayedResourceCount = 0;      //zero out this providers number of displayed resource
           
  
            for (var j in prov.Resources) {
                var resource = prov.Resources[j];
                for (var k in resource.Alignments) {
                    var alignment = resource.Alignments[k];        

                    if (this._ContainsNode(alignment) == false) continue; //skip over resources that are not aligned to any standards in this graph 

                    //keep track of how many resources this provider could have in the graph. We need this to display the count
                    //in the providers dropdown. 
                    currentResources[resource.Id] = resource.Id

                    //if resource not in graph, then add it 
                    if (prov.IsSelected == false) continue
                  
                    if (!this._ContainsNode(resource.Id)) {
                        var resourceNode = new ResourceNode();
                        resourceNode.Id = resource.Id;
                        resourceNode.Title = resource.Title;
                        resourceNode.Summary = resource.Summary;
                        resourceNode.Url = resource.Url;
                        resourceNode.Type = NodeTypes.RESOURCE;
                        resourceNode.Label = "";
                        resourceNode.Provider = prov.Id;
                        this._AddNode(resourceNode);

                        //add the provider's resource count to the DataStoreObject
                        prov.DisplayedResourceCount++;

                    }

                    //if edge from resource to standard not in graph, then add it
                    if (!self._HasEdge(resourceNode.Id, alignment)) {
                        self._AddEdge(resourceNode.Id, alignment)
                     }
                }
            }
            prov.DisplayedResourceCount = Object.keys(currentResources).length

        }  
    }


    //sorts the standards so they are in order for building the standards table
    SortStandards() {
        this.Nodes = this.Nodes.sort((a, b) => (a.order > b.order) ? 1 : -1);
    }


    //Builds the Graph object for the Topic bundle graph mode. 
    _BuildTopicCategoryGraph() {

        //save the context so it can be used anywhere in this function
        var self = this;

        //Get the topic standards for the category, bundled into their gradebands. 
        var bundle = DataStoreObj.getTopicGradebandBundle(PageStateObj.Category);
        
        //create each bundle into a node
        var prev = null;
        for (var key in bundle) {
            try {
                var topicNode = DataStoreObj.Standards[bundle[key]];
                var topicBundleNode = new TopicCategoryNode(bundle[key], topicNode.Id);
                topicBundleNode.gradeBand = key;
                topicBundleNode.Highgrade = topicNode.Highgrade;
                topicBundleNode.Lowgrade = topicNode.Lowgrade;
                topicBundleNode.Type = NodeTypes.TOPIC;
                topicBundleNode.Description = topicNode.Description;
                topicBundleNode.Label = key;
                topicBundleNode.NGSSCode = topicNode.NGSSCode;
                self._AddNode(topicBundleNode);

                //add the edge between topic nodes to show the grade progression
                if (prev != null) {
                    self._AddEdge(topicBundleNode.Id, prev.Id);
                }
                prev = topicBundleNode;
            }
            catch{
                console.log("Error getting topic bundles in function Graph._BuildTopicCategoryGraph()")
            }
          
        }
        for (var k in this.Nodes) {
            var peNodes = DataStoreObj.Standards[this.Nodes[k].Id].Connections;
            for (var peKey in peNodes) {
                var pe = self._CopyNodeAttributes(DataStoreObj.Standards[peNodes[peKey]]);
                pe.Label = self._SetNodeLabel(pe);
                if (!self._ContainsNode(pe.Id)) {

                    self._AddNode(pe);

                    //add nodes that are connected to this pe
                    var conns = DataStoreObj.Standards[pe.Id].Connections;
                    for (var conK in conns) {
                        var con = self._CopyNodeAttributes(DataStoreObj.Standards[conns[conK]]);
                        con.Label = self._SetNodeLabel(con);
                        if (!self._ContainsNode(con.Id)) {
                            self._AddNode(con);
                        }
                        if (!self._HasEdge(con.Id, pe.Id)) {
                            self._AddEdge(con.Id, pe.Id);
                        }
                    }
                }
                if (!self._HasEdge(pe.Id, this.Nodes[k].Id)) {
                    self._AddEdge(pe.Id, this.Nodes[k].Id);
                }
            }
        }
    }


     //Builds the Graph object for the 3D category graph mode. This can be for CCCs, DCIs, or SEPs.
    _Build3DCategoryGraph() {
        let self = this;
        var bundle = DataStoreObj.get3DCategoryBundle();
        //make a node for each grade in the 3D category. Each node contains a list of its category 3d standards that have an overlapping gradeband. 
        var i = 0;
        var prev = null;
        for (var g in Grades) {
            i++
            let b = new ComprizingBundleNode();
            b.Id = (i + 1).toString();
            b.Type = DataStoreObj.get3DCategoryNodeType();
            b.Label = Grades[g];
            b.Gradeband = Grades[g];
            //and the category 3d node to the graph 
            self._AddNode(b);

            if (prev != null) {
                if (!self._HasEdge(prev.Id, b.Id)) {
                    self._AddEdge(prev.Id, b.Id)
                }
            }
            prev = b;

            //get all the 3D standards that make up this grade bundle. Add them to the graph with an edge to their bundle(s) 
            for (var key in bundle) {
                var bundleStd = DataStoreObj.Standards[bundle[key]];

                //check that 3d standard is in this grade bundle. 
                if (DataStoreObj.isInGradeRange(bundleStd.Highgrade, bundleStd.Lowgrade, Grades[g])) {
                    b.addComprizingStandard(bundle[key]);
                    var node3D = self._CopyNodeAttributes(bundleStd);
                    node3D.Label = self._SetNodeLabel(node3D);
                    if (!self._ContainsNode(node3D.Id)) {
                        self._AddNode(node3D);

                        
                        var conns = DataStoreObj.Standards[node3D.Id].Connections;                       
                        for (var k in conns) {
                            //Get the PEs connected to this 3d node, and add them to the graph 
                            if (PageStateObj.Depth <= 1) continue;
                            if (PageStateObj.Depth < 2) continue;
                            var conNode = self._CopyNodeAttributes(DataStoreObj.Standards[conns[k]]);
                            conNode.Label = self._SetNodeLabel(conNode);
                            if (!self._ContainsNode(conNode.Id)) {
                                self._AddNode(conNode);

                               
                                var outerNodes = DataStoreObj.Standards[conNode.Id].Connections;
                                for (var k2 in outerNodes) {
                                    //get all the nodes connected to this PE and add them to the graph (if not already in the graph)
                                    if (PageStateObj.Depth <= 2) continue
                                    var outerNode = self._CopyNodeAttributes(DataStoreObj.Standards[outerNodes[k2]]);
                                    outerNode.Label = self._SetNodeLabel(outerNode);
                                    if (!self._ContainsNode(outerNode.Id)) {
                                        self._AddNode(outerNode);
                                    }
                                    if (!self._HasEdge(outerNode.Id, conNode.Id)) {
                                        self._AddEdge(outerNode.Id, conNode.Id);
                                    }
                                }
                            }
                            if (!self._HasEdge(conNode.Id, node3D.Id)) {
                                self._AddEdge(conNode.Id, node3D.Id);
                            }
                        }
                    }
                    if (!self._HasEdge(node3D.Id, b.Id)) {
                        self._AddEdge(node3D.Id, b.Id)
                    }
                }
            }
        }
            return;
    }


    //Builds the graph starting at a standard, out to a specified depth 
    _BuildStandardsGraph() {
        let self = this;
        let rootNode = DataStoreObj.Standards[PageStateObj.currentNodeId]
        var node = self._CopyNodeAttributes(rootNode)
        node.Label = self._SetNodeLabel(node);
        self._AddNode(node);

        //add all nodes 1 level deep (i.e. one link away from starting node)
        for (var neighborNodeKey in rootNode.Connections) {
            var neighborNodeId = rootNode.Connections[neighborNodeKey];
            var neighborNodeData = DataStoreObj.Standards[neighborNodeId];

            var neighborNode = self._CopyNodeAttributes(neighborNodeData);
            neighborNode.Label = self._SetNodeLabel(neighborNode);
            if (!self._ContainsNode(neighborNode.Id)) {
                self._AddNode(neighborNode);
            }
            self._AddEdge(rootNode.Id, neighborNode.Id);

            //get the nodes 2 levels deep if depth is set > 2
            if (PageStateObj.Depth > 1) {
                for (var neighborNode2Key in neighborNodeData.Connections) {
                    var neighborNode2Id = neighborNodeData.Connections[neighborNode2Key];
                    var neighborNode2Data = DataStoreObj.Standards[neighborNode2Id];
                    
                    var neighborNode2 = self._CopyNodeAttributes(neighborNode2Data);
                    neighborNode2.Label = self._SetNodeLabel(neighborNode2);
                    if (!self._ContainsNode(neighborNode2.Id)) {
                        self._AddNode(neighborNode2);
                    }
                    if (!self._HasEdge(neighborNode.Id, neighborNode2.Id)) {
                        self._AddEdge(neighborNode.Id, neighborNode2.Id)
                    }  

                    //Build out the graph to a depth of 3 from the starting node
                    if (PageStateObj.Depth > 2) {
                      
                        for (var neighborNode3Key in neighborNode2Data.Connections) {
                            var neighborNode3Id = neighborNode2Data.Connections[neighborNode3Key];
                            var neighborNode3Data = DataStoreObj.Standards[neighborNode3Id];
                            var neighborNode3 = self._CopyNodeAttributes(neighborNode3Data);
                            neighborNode3.Label = self._SetNodeLabel(neighborNode3);
                            if (!self._ContainsNode(neighborNode3.Id)) {
                                self._AddNode(neighborNode3);
                            }

                            if (!self._HasEdge(neighborNode2.Id, neighborNode3.Id)) {
                                self._AddEdge(neighborNode2.Id, neighborNode3.Id)
                            }  
                        }
                    }
                }
            }
        }
    }


    //Builds the graph object for the Gradeband graph mode. Builds the graph by getting all the topics 
    //in the specified grade band, then adding all PEs that link to those topics. If depth is > 1. 3D standards are added as well.
    _BuildGradeBandGraph() {
        let self = this;
        for (var standardKey in DataStoreObj.Standards) {
            var standard = DataStoreObj.Standards[standardKey];
            if (standard.Type != "Topic") continue;

            //get topic if in specified gradeband     
            var high = PageStateObj.Highgrade;
            var low = PageStateObj.Lowgrade;
            if (high == 6) high = 8;
            if (high == 7) high = 12;
            if (low == 6) low = 6;
            if (low == 7) low = 9
          
            if (parseInt(standard.Lowgrade, 10) >= parseInt(low, 10) && parseInt(standard.Highgrade, 10) <= parseInt(high, 10)) {
                var topicNode = self._CopyNodeAttributes(standard);
                topicNode.Label = self._SetNodeLabel(topicNode);
                self._AddNode(topicNode)

                //add the PEs of the topic 
                for (var peKey in standard.Connections) {
    
                    var peId = standard.Connections[peKey];
                    var peData = DataStoreObj.Standards[peId];
                    if (!self._ContainsNode(peData.Id)) {
                        var peNode = self._CopyNodeAttributes(peData);
                        peNode.Label = self._SetNodeLabel(peNode);
                        self._AddNode(peNode);

                        //add the PEs comprizing standards if depth is greater that 1
                        if (PageStateObj.Depth > 1) {
                            for (var compKey in peData.Connections) {
                                var conId = peData.Connections[compKey];
                                var conData = DataStoreObj.Standards[conId];
                                if (!self._ContainsNode(conId, peId)) {
                                    var conNode = self._CopyNodeAttributes(conData);
                                    conNode.Label = self._SetNodeLabel(conNode);
                                    self._AddNode(conNode)
                                }
                                if (!self._HasEdge(conId, peId)) {
                                    self._AddEdge(conId, peId)
                                }
                            }
                        }
                    }

                    //add edge from the Topic to the PE
                    if (!self._HasEdge(peId, topicNode.Id)) {
                        self._AddEdge(peId, topicNode.Id);
                    }

                }
                 
            }
           
        }
    }


    //Takes a standard from the DataStoreObj, and copies its relavent members to a new StanadardNode object. Returns the new StandardNode object. 
    _CopyNodeAttributes(standardNode) {
        var node = new StandardNode();
        node.Id = standardNode.Id;
        node.Highgrade = standardNode.Highgrade;
        node.Lowgrade = standardNode.Lowgrade;
        node.Description = standardNode.Description;
        node.Url = standardNode.Url;
        node.Type = standardNode.Type;
        node.NGSSCode = standardNode.NGSSCode
        return node;
    }


    //For each Provider, we count how many aligned resources
    _SetDisplayedResourceCount() {

    }


    //Adds a node with the given id to the graph
    _AddNode(node, id) {
        node.rId = this.Size + 1;
        if (node.Id == null || node.Id == undefined) {
            node.Id = this.Size + 1;
        }
        this.Nodes[node.Id] = node;
        this.Size++;
    }


    //adds an edge pair to the edges array. Hash on source_id + target_id check if two nodes are connected 
    _AddEdge(id1, id2) {
        var sourceId = id1;
        var targetId = id2;

        var edge = { source: sourceId, target: targetId }
        var edgeId = sourceId.toString() + "_" + targetId.toString();

        if ((edgeId in this.Edges) == true) {
            return;
        }
        else {
            this.Edges[edgeId] = edge
        }  

        //if edge is being added from standard to resource, add the resource to that standards list of displaying resources
        if (this.Nodes[id1].Type == NodeTypes.RESOURCE) {
            this.Nodes[id2].DisplayedResources[id1] = { Id: id1, Provider: this.Nodes[id1].Provider };
        }
    }


    //returns true if edge exists in the graph and false otherwise. Two way edges are checked here. 
    _HasEdge(sourceId, targetId) {
        var edgeId1 = sourceId.toString() + "_" + targetId.toString();
        var edgeId2 = targetId.toString() + "_" + sourceId.toString();
        if (edgeId1 in this.Edges == true || edgeId2 in this.Edges == true) {
            return true;
        }
        return false;
    }


    //returns true if the Graph has a node with this id. Returns false otherwise .FIXME(need to to this in constant time)
    _ContainsNode(id) {
        for (var key in this.Nodes) {
            if (this.Nodes[key].Id == id) {
               
                return true;
            }
        }
        return false;
    }


    //sets the node label based on the type of node. This is what appears inside the node when Vis.js graphs it.
    _SetNodeLabel(node) {
        if (node.Type == NodeTypes.CC || node.Type == NodeTypes.DCI || node.Type == NodeTypes.SEP || node.Type == NodeTypes.PE || node.Type == NodeTypes.TOPIC) {
            if (PageStateObj.StandardsLabel == GraphLabels.ASN) {
                return node.Id;
            }
            else {
                if (node.Type == NodeTypes.CC || node.Type == NodeTypes.SEP) {
                    return BLANK_STD_LABLE;
                }
                return node.NGSSCode
            }
        }
        else {
            return "error stetting label";
        }
        return "None"
    }


    //A helper function that returns true if arrays l1 and l2 share at least one value. 
    _DoesListOverlap(l1, l2) {

        for (var k1 in l1) {
            for (var k2 in l2) {
                if (l1[k1] == l2[k2]) return true;
            }
        }
        return false;
    }


    //Calls the helper method to get the x,y coordinates for the graph. 
    async GetNodeCoordinates() {
        var self = this;
        var coords = await this._GetNodeCoordinates();
        coords = (JSON.parse(coords.coords));
        let i = 0;
        for (var nodeKey in self.Nodes) {
            self.Nodes[nodeKey].X = coords[i].X;
            self.Nodes[nodeKey].Y = coords[i].Y;
            i++;
        }
    }


    //Makes an ajax post to get the x,y coordinates for the graph. 
    async _GetNodeCoordinates() {

        //build the edge list to send to the server 

        var data = {};
        var edges = [];
        var i = 0;
        for (var key in this.Edges) {
            var edge = this.Edges[key];

            edges[i] = { "source": edge.source, "target": edge.target }
            i++;
        }

        data.edges = edges
        var gmlString = {};  
        gmlString.gmlString = this._GetGmlString();
        return await $.ajax({
            type: "POST",
            data: JSON.stringify(gmlString),
            url: "/NGSS/GetGraphLayout",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
        });
    }
    

    //Formats the nodes and edges in the GML format that R used to compute the layout. 
    _GetGmlString() {

        var str = "'graph[";
        for (var nodeKey in this.Nodes) {
            var node = this.Nodes[nodeKey];
            str += "node[id " + node.rId + "]";
        }

        for (var edgeKey in this.Edges) {
            var edge = this.Edges[edgeKey];
            str += "edge[source " + this._GetRId(edge.source) + " target " + this._GetRId(edge.target) + "]";
        }
        str += "]'";
        return str;
    }


    //Takes the id of a node and returns the zero-indexed rId of the coorisponding node
    _GetRId(id) {
        return this.Nodes[id].rId
    }


    //sorts the edges by source/target so R returns nodes in the correct order. 
    _SortEdges(edges) {
         var cmp = function (a, b) {
            if (a > b) return +1;
            if (a < b) return -1;
            return 0;
        }

        return edges.sort(function (a, b) {
            return cmp(a.source, b.source) || cmp(a.target, b.target)
        })
    }


    //sets the color and highlight color attributes of each node in the graph depending on its type. Also assigns an int coorisponding to the color so we can easily sort by color.
    SetNodeColors() {
        var self = this;
        for (var nodeKey in self.Nodes) {

            //a node whoes color we will set based on its type. 
            var n = self.Nodes[nodeKey];
            if (n.Type == NodeTypes.DCI) {
                n.color = NGSSColors.ORANGE;
                n.highlightColor = NGSSColors.ORANGE_HIGHLIGHT;
                n.order = 3;
            }
            else if (n.Type == NodeTypes.SEP) {
                n.color = NGSSColors.BLUE;
                n.highlightColor = NGSSColors.BLUE_HIGHLIGHT;
                n.order = 5
            }
            else if (n.Type == NodeTypes.CC) {
                n.color = NGSSColors.GREEN;
                n.highlightColor = NGSSColors.GREEN_HIGHLIGHT;
                n.order = 4;
            }
            else if (n.Type == NodeTypes.PE) {
                n.color = NGSSColors.GREY;
                n.highlightColor = NGSSColors.GREY_HIGHLIGHT;
                n.order = 2;
            }
            else if (n.Type == NodeTypes.TOPIC) {
                n.color = NGSSColors.PURPLE;
                n.highlightColor = NGSSColors.PURPLE_HIGHLIGHT;
                n.order = 1;
            }
            else if (n.Type == NodeTypes.CC_CATEGORY) {
                n.color = NGSSColors.GREEN;
                n.highlightColor = NGSSColors.GREEN_HIGHLIGHT;
            }
            else if (n.Type == NodeTypes.SEP_CATEGORY) {
                n.color = NGSSColors.BLUE;
                n.highlightColor = NGSSColors.BLUE_HIGHLIGHT;
            }
            else if (n.Type == NodeTypes.DCI_CATEGORY) {
                n.color = NGSSColors.ORANGE;
                n.highlightColor = NGSSColors.ORANGE_HIGHLIGHT;
            }
            else if (n.Type == NodeTypes.TOPIC_GRADEBAND) {
                n.color = NGSSColors.PURPLE;
                n.highlightColor = NGSSColors.PURPLE_HIGHLIGHT;
            }
            else if (n.Type == NodeTypes.RESOURCE) {
                //get the provider for that node and add the correct color and shape
                var prov = DataStoreObj.Providers[n.Provider]
                n.color = prov.color;
                n.highlightColor = prov.highlightColor;
                n.shape = prov.shape;
            }
        }
    }


    //Sets the size and highlight size attributes of each node in the graph depending on its type. 
    SetNodeSizes() {
        var self = this;
        for (var nodeKey in self.Nodes) {

            //node whose size and highlight size attributes we will set
            var n = self.Nodes[nodeKey];
            n.size = 100;
            n.highlightSize = 150;
            n.HighlightFontSize = STD_NODE_HIGHLIGHT_SIZE;
            n.FontSize = STD_NODE_SIZE;
        }
    }


    //converts the nodes to an array and then sort them by "order". (This is needed for building the standards table)
    GetSortedNodesArray() {
        var i = 0;
        var arr = [];
        for (var k in this.Nodes) {
            var n = this.Nodes[k];
            arr.push(n);
        }

        arr.sort(function (a, b) {
            return a.order - b.order;
        });
        return arr;
    }
}


/*************************************************************************
  Class definitions for the Various node types and the edges. All Node classes 
  inherit from the base Node class
 ************************************************************************/

class Node {
    constructor() {
        this.Id = null;   //integer unique identifier for the node 
        this.Type = null;  //the type of node: Topic, PE, ....,
        this.X = null;
        this.Y = null;
        this.Label = null;
    }
}


class StandardNode extends Node {
    constructor() {
        super();
        this.NGSSCode = null;
        this.Description = null;
        this.Url = null;
        this.Highgrade = null;
        this.Lowgrade = null;
        this.DisplayedResources = []; //So we can quickly build the resource table with this node is selected. 
    }
}



class TopicCategoryNode extends Node {
    constructor(topicIds, id) {
        super();
        this.standards = topicIds;
        this.gradeBand = null;
        this.Id = id;
        
    }
}


//A Resource node that inherits from the Node class.
class ResourceNode extends Node {
    constructor() {
        super();
        this.Type = NodeTypes.RESOURCE;
        this.Title = null;
        this.Summary = null;
        this.Provider = null;
    }
}


class ComprizingBundleNode extends Node {
    constructor() {
        super();
        this.comprizingStandards = []; //an array of the comprizing 3d standards that make up this category. 
    }


    //adds the standard's id (ASN Code) to the list comprizing standards
    addComprizingStandard(id) {
        this.comprizingStandards[this.comprizingStandards.length] = id;
    }
}