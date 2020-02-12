/******************************************************************************************************
 This file contains the main program for the client side of the application. It performs the following functions:

 1) First we make an ajax post to query RavenDB for all the netork data: Standards, Categories, Providers.
    We load this data into the global DataStoreObj

 2) The PageStateObj gets set to a default value. This determines how the graph will be drawn when the page first loads. 

 3) The global GraphObj is created based on the PageStateObj. It contains all the information for drawing the graph
 
 4) The Vis.js graph gets drawn as defined in the GraphObj. Also we populate the coorisponding Standards table and Resources table. 

 5) As the user selects different parameters, we repeat steps 2-4. 

 6) Finally, the PageStateObj is loaded into local memory. We use this (in addition to URL hashes) to handle the browser back 
    button. We keep track of the PageStateObj's in local memory to render the page correctly when the user clickes the forward
    or backward browser buttons. 

 * ***************************************************************************************************/


//A DataStore object that will hold all the network data posted from the server
var DataStoreObj = new DataStore();

// Graph object that we will use to draw the graph with vis.js
var GraphObj = new Graph();

//Keeps track of the page state (graph, selected items, etc.). The contents of this variable determine how to render the page. 
//We do it this way so that we can save the PageState to local memory and handle the back button with all the ajax posts. 
var PageStateObj = new PageState();


//Load the data from the server
async function doMain() {
    try {
        var startTime = new Date();
      
        var res = await GetGraphDataAjax();

        BuildDataStore(res)
        BuildProvidersDropdown();
    }
    catch (err) {
        console.log(err);
    }

    SetPageStateTest1();
    await BuildCagegoryDropdown("Topic_Engineering_Design");
    await BuildNetwork();
}


//Calls the functions to build the network and draw the graph. We make a call to this function every time we build the nw. 
async function BuildNetwork() {
    await GraphObj.Build();
    await InitDropdowns();
    await UpdateProvidersDropdown();
    await DrawGraph();
}


//Searches in NGSS mode based on clicked standard in the table. Performs the same action as standard search in the textbox.
 function TableClickStandardSearch(id) {
    PageStateObj.View = "foobar" //await GraphViews.NGSS;
    document.getElementById("graphView").value = GraphViews.NGSS
    PageStateObj.currentNodeId = id.split("_")[1];
    UpdatePageStateFromDropdowns();
    BuildNetwork();
}


//Builds the html table that shows the list of standards. This function is to be called immediatly after building the vis.js network
async function BuildStandardsTable() {
    var standards = GraphObj.GetSortedNodesArray();
    var tableRef = document.getElementById("t1");
    tableRef.innerHTML = "";
    for (var k in standards) {
        var n = standards[k];
        if (n.Type == NodeTypes.CC_CATEGORY || n.Type == NodeTypes.SEP_CATEGORY || n.Type == NodeTypes.DCI_CATEGORY || n.Type == NodeTypes.RESOURCE) continue;
        var newRow = tableRef.insertRow(tableRef.rows.length);
        newRow.id = n.Id;
        newRow.style.backgroundColor = n.color;
        newRow.innerHTML = '<span  style=" width: 14px; color: blue; cursor: pointer; font - size: 10pt;" id = label_' + n.Id + ' onclick = TableClickStandardSearch("'+"label_" + n.Id+'");>' + n.Id + ' </span>'
       
        newRow.innerHTML += '<a style="color:blue" href=http://asn.jesandco.org/resources/' + n.Id + ' target="_blank">' + 'ASN' + '<a>';
        newRow.innerHTML += '<span style="padding-left:6px; padding-right:6px"> | </span>';
        var ngssCode =   n.NGSSCode;
        var moreStuff = '<a onmouseover= this.style.textDecoration="underline" onmouseout=this.style.textDecoration="none"  onclick=ViewNGSSPage(\'' + n.Url + '\') style="color:blue; cursor:pointer; hover:red">NGSS/NSTA</a>';
        if (n.Type == NodeTypes.CC || n.type == NodeTypes.SEP) {
            ngssCode = "No NGSS code";
            moreStuff = "";
        }
        newRow.innerHTML += '<span style="cursor:pointer; color:blue; padding-right:4px" " >' + ngssCode + '</span>'
        newRow.innerHTML += moreStuff

        newRow.innerHTML += '<br>' + '<span id = area_' + n.Id + '> ' + FormatStdDescription(n.Description, n.Id, n.Lowgrade, n.Highgrade) + '</span>';
       
        newRow.style.border = "1px solid grey";

        //If user clicks outside the text of the row, we still want to highlight that row. Add closure to onclick callback.   
        var element = document.getElementById(n.Id);

        element.onclick = (function (rowId) {
            return function (e) {
                UnighlightAllNodes();
                HighlightNode(rowId);
                UnhighlightStandardsTableRows();
                HighlightStandardsTableRow(rowId);
            }
        })(n.Id);

    }
}


//Formats the description of a standard for the Standards Table. If the description is too long, we truncate it by default. 
function FormatStdDescription(des, sCode, lowgrade, highgrade) {

    var gradeBand = lowgrade.toString() + "-" + highgrade.toString();
    if (des == null) var des = "error";
    var resultHTML = '<span style=line-height:' + STD_LINE_HEIGHT + ' >';
    resultHTML += '(' + gradeBand + ')  '

    resultHTML += '</span>'

    var displayElipsis = "none";
    var displayMore = "none";
    var displayD1 = "inline";
    var displayD2 = "inline";
    var displayLess = "inline";
    var d1 = des;
    var d2 = "";
    if (des.length > STD_DESCRIPTION_LENGTH) {
        d1 = des.substring(0, STD_DESCRIPTION_LENGTH);
        d2 = des.substring(STD_DESCRIPTION_LENGTH, des.length)
        displayMore = "inline";
        displayElipsis = "inline";
        displayD2 = "none";
        displayLess = "none";
    }
    else {
        displayLess = "none"
    }

    resultHTML += '<span style="display:' + displayD1 + '" id = d1_' + sCode + '>' + d1 + '</span>'
    resultHTML += '<span style="display:' + displayElipsis + '" id = elipsis_' + sCode + '>' + " ..." + '</span>';
    resultHTML += '<span style =" display:' + displayMore + ';color:blue;cursor: pointer" id = more_' + sCode + ' onclick = showFullStdDescription(\'' + sCode + '\')> more </span>'
    resultHTML += '<span  style="display:' + displayD2 + '" id = d2_' + sCode + '>' + d2 + '</span>'
    resultHTML += '<span style ="display:' + displayLess + '; color:blue;cursor: pointer" id = less_' + sCode + ' onclick = showLessStdDescription(\'' + sCode + '\')> less </span>'
    return resultHTML
}


//Clears everything in the domRef. Used to remove the network from the canvas before rebuilding it. 
function RemoveNetwork(domRef) {
    var html = document.getElementById(domRef);
    while (html.firstChild) {
        html.removeChild(html.firstChild);
    }
}


//Uses the vis.js library to draw the graph based on the global GraphObj and PageSateObj
function DrawGraph() {
    RemoveNetwork("networkContainer");
    //initailize the vis network global objects
    VISJS_NODES = new vis.DataSet({});
    VISJS_EDGES = new vis.DataSet({});

    VISJS_OPTIONS = {
        physics: false,                    //don't want wibly wobbley stuff to happen
        layout: { improvedLayout: false }  //we let R compute the layout for us since vis.js cant handle layout for large number of nodes
    };

    VISJS_DATA = {
        nodes: VISJS_NODES,
        edges: VISJS_EDGES
    };

    //Use vis.js to draw each node depending on its type.
    for (var nodeKey in GraphObj.Nodes) {
        var n = GraphObj.Nodes[nodeKey];
        VISJS_NODES.add({
            id: n.Id,
            color: n.color,
            label: n.Label,
            shape: n.shape,   //only affects resources. Standards use defualt shape. 
            size: 10,         //only affects resources since they have no label. 
            x: n.X,
            y: n.Y,         
            font: {size: n.FontSize}
        });
    }

    //Use vis.js to draw the edges between nodes
    for (var edgeKey in GraphObj.Edges) {
        var edge = GraphObj.Edges[edgeKey];
        VISJS_EDGES.add({
            to: edge.source, 
            from: edge.target
        });
    }

    //Draw the graph. 
    var container = document.getElementById("networkContainer");
    VISJS_GRAPH = new vis.Network(container, VISJS_DATA, VISJS_OPTIONS);

    VISJS_GRAPH.on("click", function (properties) {
        var nodeID = properties.nodes[0];
        if (nodeID == undefined) return;

        var clickedNode = GraphObj.Nodes[nodeID];
        var t = clickedNode.Type;
        if (t == NodeTypes.CC || t == NodeTypes.SEP || t == NodeTypes.DCI || t == NodeTypes.PE || t == NodeTypes.TOPIC) {
            UnighlightAllNodes();
            HighlightNode(nodeID);
            UnhighlightStandardsTableRows();
            HighlightStandardsTableRow(nodeID)
            document.getElementById(nodeID).scrollIntoView();
        } 
        UnighlightAllNodes();
        HighlightNode(nodeID);
    });

    VISJS_GRAPH.on("doubleClick", function (properties) {
        var nodeID = properties.nodes[0];
        if (nodeID == undefined) return;

        NodeDoubleClickActionResult(nodeID);      
    });

    //Build the standards table
     BuildStandardsTable();

}


//shows the full description in the standards table
function showLessStdDescription(sCode) {
    document.getElementById("more_" + sCode).style.display = "inline";
    document.getElementById("elipsis_" + sCode).style.display = "inline";
    document.getElementById("less_" + sCode).style.display = "none";
    document.getElementById("d2_" + sCode).style.display = "none";
}


//hides part of the discription in the standards table
function showFullStdDescription(sCode) {
    document.getElementById("more_" + sCode).style.display = "none";
    document.getElementById("elipsis_" + sCode).style.display = "none";
    document.getElementById("less_" + sCode).style.display = "inline";
    document.getElementById("d2_" + sCode).style.display = "inline";
}


//handles the onclick event for a node in the graph
async function NodeDoubleClickActionResult(nodeID) {
    var node = DataStoreObj.Standards[nodeID];
    
    //clicking on a standard will set the View to NGSS and generate a search based on that standard. 
    if (node.Type == NodeTypes.TOPIC || node.Type == NodeTypes.PE || node.Type == NodeTypes.CC || node.Type == NodeTypes.SEP || node.Type == NodeTypes.DCI) {
        PageStateObj.View = GraphViews.NGSS;
        PageStateObj.currentNodeId = node.Id;
        document.getElementById("graphView").value = "NGSS";
        document.getElementById("categoryStandardsList").value = 0;
        document.getElementById("categoryStandardsList").disabled = "true"
        await BuildNetwork();
    }
}


//Highlights a node by setting size to highlightSize and color to highlightColor. Make a call to UnhighlightAllNodes() before calling this function. 
function HighlightNode(nodeId) { 
    var node = GraphObj.Nodes[nodeId]
    VISJS_NODES.update({
        id: nodeId, color: node.highlightColor,
        font: { size: node.HighlightFontSize }
    });
}


//Highlights the table row in the standards table
function HighlightStandardsTableRow(domId) {
    var row = document.getElementById(domId);
    row.style.border = "solid grey 4px"
    row.style.background = GraphObj.Nodes[domId].highlightColor;
}


//Unhlighlights any rows in the standards table
 function UnhighlightStandardsTableRows(){
    for (var k in GraphObj.Nodes) {
        var n = GraphObj.Nodes[k];
        var row = document.getElementById(n.Id);
        if (!row) continue;
        row.style.border = "solid grey 1px";
        row.style.background =  GraphObj.Nodes[n.Id].color;
    }
}


//Unhighlights all the nodes in the vis.js graph. Call this function before making a call to HighlightNode();
function UnighlightAllNodes() {
    var updateJson = [];
    for (var k in GraphObj.Nodes) {
        var node = GraphObj.Nodes[k];
        var row = {
            id: node.Id,
            color: node.color,
            font: { size: node.FontSize }
        };
        updateJson[updateJson.length] = row;  
    }
    VISJS_NODES.update(updateJson)
}


//test the gradeband based graph
function SetPageStateTest3() {
    PageStateObj.View = GraphViews.GRADEBAND;
    PageStateObj.Lowgrade = 8;
    PageStateObj.Highgrade = 12;
    PageStateObj.Depth = 3;
    PageStateObj.StandardsLabel = GraphLabels.ASN;
}


//test the sCode search based graph
function SetPageStateTest2() {
    PageStateObj.View = GraphViews.NGSS;
    PageStateObj.currentNodeId = "S2467911";
}


//test the CC category based graph
function SetPageStateTest1() {
    PageStateObj.View = GraphViews.TOPIC
    PageStateObj.Category = "Topic_Engineering_Design"
    PageStateObj.Depth = 3;
    PageStateObj.Highgrade = "None";
    PageStateObj.Lowgrade = "None";
    PageStateObj.layout = GraphLayouts.KK;
}


//Makes an ajax post that will call the conroller method "GetGraphData()". Gets all the data for the GraphData object. 
function GetGraphDataAjax() {
    return $.ajax({
        type: "POST",
        url: "/NGSS/GetGraphData",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
    });
}


//Build the data store that holds the data for drawing each type of network.
function BuildDataStore(data) {
    DataStoreObj.loadStandards(JSON.parse(data.standards));
    DataStoreObj.loadProviders(JSON.parse(data.providers));
    DataStoreObj.loadCategories(JSON.parse(data.categories));
}


//Builds the category dropdown and sets the page state from the initial dropdown selections as defined in NGSSGraph.cshtml
async function InitDropdowns() {

    //override any dropdown defaults here for testing 

    //build the category dropdown based on the view. Also update the PageStateObj based on the dropdown selections. 
    

    await UpdatePageStateFromDropdowns();
}


//updates the global PageStateObj from the items selected in the dropdowns. 
function UpdatePageStateFromDropdowns() {

    //update from the display type dropdown. 
    var displayType = document.getElementById("displayType");
    var displayTypeValue = displayType.options[displayType.selectedIndex].value;
    PageStateObj.StandardsLabel = displayTypeValue;

    //update the depth from its dropdown. 
    var depthDrop = document.getElementById("networkDepth");
    var depthDropVal = depthDrop.options[depthDrop.selectedIndex].value;
    PageStateObj.Depth = depthDropVal;

    //update the view frop the dropdown. 
    var viewDrop = document.getElementById("graphView");
    var viewDropVal = viewDrop.options[viewDrop.selectedIndex].value;
    PageStateObj.View = viewDropVal;

    //update the category from the dropdown. 
    var categoryDrop = document.getElementById("categoryStandardsList");
    if (categoryDrop.options[categoryDrop.selectedIndex]) {
        var categoryDropVal = categoryDrop.options[categoryDrop.selectedIndex].value;
        PageStateObj.Category = categoryDropVal;
    }
    else {
        PageStateObj.Category = 0;
    }


    //update the current node lable type
    var dispTypeDrop = document.getElementById("displayType");
    var dispTypeDropVal = dispTypeDrop.options[dispTypeDrop.selectedIndex].value;
    PageStateObj.StandardsLabel = dispTypeDropVal;
   

    //update the gradeband from their dropdowns. 
    var lowgradeDrop = document.getElementById("lowgrade");
    var lowgradeDropVal = lowgradeDrop.options[lowgradeDrop.selectedIndex].value;
    PageStateObj.Lowgrade = lowgradeDropVal;
    var highgradeDrop = document.getElementById("highgrade");
    var highgradeDropVal = highgradeDrop.options[highgradeDrop.selectedIndex].value;
    PageStateObj.Highgrade = highgradeDropVal;

    //update the layout from its dropdown
    var layoutDrop = document.getElementById("layoutOptions");
    var layoutDropVal = layoutDrop.options[layoutDrop.selectedIndex].value;
    PageStateObj.layout = layoutDropVal;

    //update the search value from the search bar 
    var searchBarVal = document.getElementById("searchBar").value;
    PageStateObj.searchString = searchBarVal;
}


//Changes from ASN labels to NGSS labels and vica versa (depending on the page state)
function ToggleNodeLabels() {
    var updateJson = [];
    for (k in GraphObj.Nodes) {
        var n = GraphObj.Nodes[k];
        var lab = n.Id;
        if (PageStateObj.StandardsLabel == GraphLabels.NGSS) {
            lab = n.NGSSCode;
            if (lab == 'NULL') {
                lab = BLANK_STD_LABLE
            }
            
        }
        var nodeUpdate = { id: n.Id, label: lab };
        updateJson[updateJson.length] = nodeUpdate;
    }
    VISJS_NODES.update(updateJson)
}


//builds the category dropdown based on the item selected from the view dropdown
function BuildCagegoryDropdown(defaultVal) {
    let categoryDrop = document.getElementById("categoryStandardsList");
    var viewDrop = document.getElementById("graphView");
    
    var curView = viewDrop.options[viewDrop.selectedIndex].value;
    var dropdownData = null;

    //assign the data to fill the dropdown with based on the selected view 
    if (curView == "Topic") {
        dropdownData = DataStoreObj.TopicCategories;   
    }

   else if (curView == "CC") {
        dropdownData = DataStoreObj.CCCategories;
    }

    else if (curView == "DCI") {
        dropdownData = DataStoreObj.DCICategories;
    }

    else if (curView == "SEP") {
        dropdownData = DataStoreObj.SEPCategories;
    }

    categoryDrop.innerHTML = "";
    var defaultOp = new Option();
    defaultOp.value = "0";
    defaultOp.text = "--Category--";
    defaultOp.disabled = true;
    categoryDrop.options.add(defaultOp);

    for (var itemKey in dropdownData) {
        var item = dropdownData[itemKey];
        var op = new Option();
        op.value = item.Id;
        op.text = item.Description;
        categoryDrop.options.add(op);
    }

    //set the default value if specified by the parameter
    if (defaultVal != null && defaultVal != undefined) {    
        categoryDrop.value = defaultVal
    }

    //set the default to --Category--
    else {
        categoryDrop.value = "0"
    }
}


function SetDropdownsToDefault(drops) {
    for (k in drops) {
        var drop = drops[k];
        if (drop == "networkDepth") {
            document.getElementById("networkDepth").value = '2';
        }
        else if (drop == "displayType") {
            document.getElementById("displayType").value = GraphViews.TOPIC;
        }
        else if (drop == "lowgrade") {
            document.getElementById("lowgrade").value = "None";
        }
        else if (drop == "highgrade") {
            document.getElementById("highgrade").value = "None";
        }
        else if (drop == "displayType") {
            document.getElementById("displayType").value = GraphLabels.NGSS;
        }
    }
}


//Sets the "isChecked" attribute of the DataStoreObj depending on whether the coorisponding checkbox is checked 
async function CustomDropdownEventHandler(id) {

    var isChecked = await document.getElementById(id).checked;
    DataStoreObj.Providers[id].IsSelected = isChecked;

    await BuildNetwork();
}


//handle the TE part of the custom dropdown separatly because it is hard coded and there are additional options. 
 function CustomDropdownTE() {
     var isChecked = document.getElementById("TeachEngineering").checked;
    DataStoreObj.Providers["TeachEngineering"].IsSelected = isChecked;
    BuildNetwork();
}


//Sets the resource count in each row of the dropdown. Also disables any providers with no resources currently showing 
function UpdateProvidersDropdown() {
    for (var i in DataStoreObj.Providers) {
        var prov = DataStoreObj.Providers[i];
        var drop = document.getElementById(prov.Id)
        let label = document.getElementById(prov.Id + "_Label");
         drop.disabled = true;
        label.style.color = "grey"
        document.getElementById(prov.Id + "_Count").innerText = " (" + prov.DisplayedResourceCount.toString() + ")";
        if (prov.DisplayedResourceCount > 0) {
            label.style.color = "black"
            drop.disabled = false
        }
    }
}


//Takes the list of providers in the DataStorObj and builds the multi select dropdown for resource providers. 
function BuildProvidersDropdown() {
    var drop = document.getElementById("Providers");
    for (var k in DataStoreObj.Providers) {
        var prov = DataStoreObj.Providers[k];  
        var newRow = document.createElement("div");
        newRow.style = "margin-left:5px; vertical-align:top";
        newRow.className = "customDropdown";
        newRow.style.overflow = "auto";
        newRow.style.marginTop = "4px";
        newRow.innerHTML = '<input onclick = CustomDropdownEventHandler(' + "'" + prov.Id + "'"+ '); class = "customDropdown customCheck" type="checkbox" id=' + prov.Id + ' />'
        newRow.innerHTML += '<label id=' + prov.Id + "_Label" + ' class="customDropdown" style="vertical-align:bottom; overflow:auto; display:inline; font-weight:normal">' + prov.Name + ''
        newRow.innerHTML += '<span id = '+prov.Id+"_Count"+'></span>';

        //assign the symbol and color for the provider based from how it is defined in the DataStorObj
        var symbolHtml = "";
        if (prov.shape == "star") {
            
            symbolHtml = " <span id='' style='display:inline; color:" + prov.color + "; font-size:110%'>&#x2605;</span>"
        }
        else if (prov.shape == "circle") {
            symbolHtml =  "<span style='height: 10px; width: 10px; border-radius: 50%; margin-left: 5px; background-color:" + prov.color + "; display: inline-block'></span>"
        }
        else if (prov.shape == "diamond") {
            symbolHtml = " <span  style='margin-left:5px; width: 8px; transform:rotate(45deg); display:inline-block; height:8px; background:" + prov.color + "'></span>"
        }
        else if (prov.shape == "triangle") {
            symbolHtml =  "<span id='+symbolId+' style='margin-left:5px;width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; cursor: pointer; vertical-align: middle; display:inline-block; border-bottom:7px solid"+prov.color+"'></span>"
        }
        else if (prov.shape == "triangleDown") {
            symbolHtml =  "<span style='margin-left:5px;width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; cursor: pointer; vertical-align: middle; display:inline-block; border-top:7px solid "+prov.color+"'></span>"
        }
        else if (prov.shape == "square") {
            symbolHtml =  "<span style='margin-left:5px; width:8px; display:inline-block; height:8px; background:"+prov.color+"'></span>"
        }
        //TE is hardcoded. Set the color and shape symbol
        if (prov.Name == "TeachEngineering") {
            var ref = document.getElementById("TELabel");
            ref.innerHTML = symbolHtml
            continue;
        }

        newRow.innerHTML += symbolHtml;
        newRow.innerHTML += '</label>';
        drop.appendChild(newRow); 
    }
}


//add event listeners for dropdowns and clicky stuff.
window.onload = function () {


    //make sure the custom dropdown is closed if we click outside it. All elements in the custom dropdown have a "customDropdown" class
    $(window).click(function (e) {    

        if (e.target.className != "customDropdown" && e.target.className != "customDropdown customCheck") {
             document.getElementById("Providers").style.display=  "none";
        }
    });

    //onclick handle for the providers dropdown 
    document.getElementById("providersDropdown").addEventListener("click", function (e) {
        var domRef = document.getElementById("Providers");
        if (domRef.style.display == "none") {
            domRef.style.display = "inline";
        }
        else {
            domRef.style.display = "none";
        }
    })


    //selecting/deselecting the "all" option will check/uncheck all the resource checboxes
    $("#ShowAllDocs").click(function (e) {

            let boxes = document.getElementsByClassName("customCheck");
            for (var i = 0; i < boxes.length; i++) {
                let row = boxes[i]
                if (e.target.checked) {
                    row.checked = true
                }
                else {
                    row.checked = false
                }
                
            }

    });



    $("#TE_Toggle1").click(function (e) {
        $("#TE_Toggle2").css("display", "inline")
        $("#TE_Toggle1").css("display", "none")
        $("#TEDocTypes").css("display", "inline")
    });

    $("#TE_Toggle2").click(function (e) {
        $("#TE_Toggle1").css("display", "inline")
        $("#TE_Toggle2").css("display", "none")
        $("#TEDocTypes").css("display", "none")
    });



    document.getElementById("networkDepth").addEventListener("change", async (e) => {
        await UpdatePageStateFromDropdowns();
        BuildNetwork();
    });


    document.getElementById("displayType").addEventListener("change", async (e) => {
        
        await UpdatePageStateFromDropdowns();
        ToggleNodeLabels();
    });


    document.getElementById("graphView").addEventListener("change", async (e) => {
        BuildCagegoryDropdown();
        if (e.target.value == GraphViews.NGSS) {
            document.getElementById("categoryStandardsList").disabled = true;
            document.getElementById("categoryStandardsList").style.background = "lightGrey";
        }
        else {
            document.getElementById("categoryStandardsList").disabled = false;
            document.getElementById("categoryStandardsList").style.background = "white";         
        }

        //set the default depth to 3 if a 3d category of NGSS mode and 2 otherwise
        if (e.target.value == GraphViews.CC || e.target.value == GraphViews.SEP || e.target.value == GraphViews.DCI) {
            document.getElementById("networkDepth").value = '3';
        }
        else {
            SetDropdownsToDefault(["networkDepth"])
        }
      

        SetDropdownsToDefault(["lowgrade", "highgrade"]);
        await UpdatePageStateFromDropdowns();
    });


    document.getElementById("categoryStandardsList").addEventListener("change", async (e) => {
        await UpdatePageStateFromDropdowns();
        GraphObj = new Graph();
        await GraphObj.Build();
        DrawGraph();
    });


    document.getElementById("lowgrade").addEventListener("change", async (e) => {
        var low = parseInt(e.target.value, 10);
        var high = parseInt(document.getElementById("highgrade").value, 10);
        await UpdatePageStateFromDropdowns();
        if (low <= high) {  //only build the graph if low is greater than high
            PageStateObj.View = GraphViews.GRADEBAND;
            document.getElementById("graphView").value = GraphViews.NGSS
            BuildNetwork();
        }
    });


    document.getElementById("highgrade").addEventListener("change", async (e) => {
        var low = parseInt(document.getElementById("lowgrade").value,10);
        var high = parseInt(e.target.value, 10);
        await UpdatePageStateFromDropdowns();

        if (low <= high) {  //only build the graph if low is greater than high
            PageStateObj.View = GraphViews.GRADEBAND;
            document.getElementById("graphView").value = GraphViews.NGSS
            BuildNetwork();
        }
    });


    document.getElementById("layoutOptions").addEventListener("change", async (e) => {
        await UpdatePageStateFromDropdowns();
    });


    document.getElementById("submitButton").addEventListener("click", async (e) => {
        await UpdatePageStateFromDropdowns();
        PageStateObj.View = GraphViews.NGSS;
        var searchString = await document.getElementById("searchBar").value;
        PageStateObj.currentNodeId = searchString
        document.getElementById("graphView").value = GraphViews.NGSS;
        await BuildNetwork();
    });
}