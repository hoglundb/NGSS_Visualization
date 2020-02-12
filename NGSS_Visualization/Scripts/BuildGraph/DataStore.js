/*
  This DataStore class is to hold all the network data sent from the server. This class will be build
  when the page loads and then data will be retrieved from it each time we draw a new network. This is 
  done so that after an initial load, drawing different networks can be done quickly in the browser. 
*/
class DataStore{
    
    constructor() {
        this.Standards = []; //a assoc array hashing on ASNCode to get standard 
        this.Providers = null;

        //lists of categories for topics, dci, cc, and sep 
        this.TopicCategories = null;
        this.CCCategories = null;  
        this.DCICategories = null;
        this.SEPCategories = null;
    }


    //Create the Standards data member using assoc arrays so we can quickly look up and search for standards
    loadStandards(data) {
        var tmpStandards = []
        data.forEach(function (d) {
            var std = new Standard();
            std.Id = d.Id;
            std.NGSSCode = d.NGSSCode;
            std.Description = d.Description;
            std.Highgrade = d.HighGrade;
            std.Lowgrade = d.LowGrade;
            std.Type = d.Type;
            std.Url = d.Url;
            //add the list of connetion from this standard to the others. Uses a list of ASNCodes (i.e. the Id field)
            for (var k in d.Connections) {
                std.Connections[d.Connections[k]] = d.Connections[k];
            }

            tmpStandards[std.Id] = std;

        });
        this.Standards = tmpStandards;
    }


    //Creates the category data members using assoc arrays so we can quickly look up categories for a given type. 
    loadCategories(data) {
        var tmpTopicCategories = [];
        var tmpCCCategories = [];
        var tmpSEPCategories = [];
        var tmpDCICategories = [];

        data.forEach(function (d) {
           
            if (d.Type == "Topic") {
                tmpTopicCategories[d.Id] = d;
            }
            else if (d.Type == "SEP") {
                tmpSEPCategories[d.Id] = d;
            }
            else if (d.Type == "DCI") {
                tmpDCICategories[d.Id] = d;
            }
            else if (d.Type == "CC") {
                tmpCCCategories[d.Id] = d;
            }
        });

        this.TopicCategories = tmpTopicCategories;
        this.CCCategories = tmpCCCategories;
        this.SEPCategories = tmpSEPCategories;
        this.DCICategories = tmpDCICategories;
    }


    //Creates the Providers data member using assoc arrays so we can quickly look up a provider and its resource/alignments. 
    loadProviders(data) {
        var providersTmpAssoc = [];
        data.forEach(function (d) {
            var prov = new Provider();
            prov.Id = d.Id;
            prov.Name = d.Name;
            var resources = [];

            //build the list of resources as an associative array
            d.Resources.forEach(function (r) {
                var resource = new Resource();
                resource.Id = r.Id;
                resource.Title = r.Title;
                resource.Summary = r.Summary;
                resource.Url = r.Url;
                resource.Type = r.Type;
                var alignmentsAssoc = [];

                //build out the list of resource alignments as an associative array
                r.Alignments.forEach(function (a) {
                    alignmentsAssoc[a] = a;
                });
                resource.Alignments = alignmentsAssoc;
                resources[r.Id] = resource;
            });
            prov.Resources = resources;
            providersTmpAssoc[d.Id] = prov;

        });

        this.Providers = providersTmpAssoc;


        //Assign each provider a unique color/shape combination
        var keys = [];
        var k = 0;
        for (var key in this.Providers) {
            keys[k++] = key
        }
        var index = 0;
        for (var i in ResourceProviderColors) {
            var color = ResourceProviderColors[i];
            for (var j in ResourceProviderShapes) {
               
                if (index > k  - 1) break;             
                this.Providers[keys[index]].color = ResourceProviderColors[i].color;
                this.Providers[keys[index]].highlightColor = ResourceProviderColors[i].highlightColor;
                this.Providers[keys[index]].shape = ResourceProviderShapes[j];
                index++
            }            
        }
    }


    //returns topics in that catetegory grouped by gradeband. 
    getTopicGradebandBundle(topicCategory) {
        var topicIds = this.TopicCategories[topicCategory].Standards;
        var gradeBands = [];
        topicIds.forEach(function (id) {
            var h = DataStoreObj.Standards[id].Highgrade;
            var l = DataStoreObj.Standards[id].Lowgrade;
            gradeBands[gradeBands.length] = l + "-" + h;
        });

        //uniquify the list of gradebands for this topic category's standards 
        gradeBands = [...new Set(gradeBands)]

        //data structure to hold gradeband groups of topics for this category 
        var bundle = [];
        gradeBands.forEach(function (gb) {
            bundle[gb] = []
        });

        //add the standads to the appropriate gradeband in the bundle data structure
        topicIds.forEach(function (id) {
            let gb = DataStoreObj.Standards[id].Lowgrade + "-" + DataStoreObj.Standards[id].Highgrade;
            bundle[gb][bundle[gb].length] = id
        });

        return bundle;
    }


    get3DCategoryBundle() {

        //Get the global var holding the 3d category
        let bundleList = null;
        if (PageStateObj.View == GraphViews.CC) {
            bundleList = DataStoreObj.CCCategories;
        }
        else if (PageStateObj.View == GraphViews.SEP) {
            bundleList = DataStoreObj.SEPCategories;
        }
        else if (PageStateObj.View == GraphViews.DCI) {
            bundleList = DataStoreObj.DCICategories;
        }
        else {
            console.log("Category Not Found!\n")
        }
        return bundleList[PageStateObj.Category].Standards;

    }

    get3DCategoryNodeType() {
        if (PageStateObj.View == GraphViews.CC) {
            return NodeTypes.CC_CATEGORY;
        }
        if (PageStateObj.View == GraphViews.SEP) {
            return NodeTypes.SEP_CATEGORY;
        }
        if (PageStateObj.View == GraphViews.DCI) {
            return NodeTypes.DCI_CATEGORY;
        }
        else {
            console.log("error in get3DCategoryNodeType(): NodeType node found")
            return "error";
        }
    }


    //returns true if there is an overlap between low-high and gradeband. the variable "gradeband" is from the constant Enum Grades. Used for bundling 3D standards into a grade progression
    isInGradeRange(high, low, gradeband) {
        if (gradeband == Grades.Kindergarden && high <= 0) {
            return true;
        }
        if (gradeband == Grades.FirstGrade && high >= 1 && low <= 1) {
            return true;
        }
        if (gradeband == Grades.SecondGrade && high >= 2 && low <= 2) {
            return true;
        }
        if (gradeband == Grades.ThirdGrade && high >= 3 && low <= 3) {
            return true;
        }
        if (gradeband == Grades.FourthGrade && high >= 4 && low <= 4) {
            return true;
        }
        if (gradeband == Grades.FifthGrade && high >= 5 && low <= 5) {
            return true;
        }
        if (gradeband == Grades.SixToEight && high >= 6 && low <= 8) {
            return true;
        }
        if (gradeband == Grades.NineToTwelve && high >= 9 && low <= 12) {
            return true;
        }
        return false;
    }

}


/****************************  Sub-classes used in the DataStore class ************************ */

//Represents an Standard that is one of the defined standard typs: Topic, PE, DCI, SEP, CC, or Category
class Standard{
    constructor() {
        this.Id = null;  //the ASN identfier for the standard
        this.NGSSCode = null;  //the NGSS identifier (if it has one)
        this.Highgrade = null;  //the gradband highgrade for the standard
        this.Lowgrade = null;   //the gradeband lowgrade for the standard
        this.Connections = []; //a list of ASN identifers for the connected standards
        this.Description = null; //the metadata description of the standard
        this.Url = null;         //Url to the NGSS.org page for that standard
        this.Type = null;        //The type of standard as determined by the NGSS: Topic, PE, DCI, SE, CC, or Category
    }
}


//Represents a 3D standard's catetory.
class Category {
    constructor() {
        this.Id = null;
        this.Type = null;
        this.Description = null;
        this.IsNGSS = null; //false if an "extra" according to the NGSS.org "read the standards" table.
    }
}


//Holds data for a curriclumn provider. Eeach provider has a list of its resources. 
class Provider {
    constructor() {
        this.Id = null;
        this.Name = null;
        this.Resources = [];
        this.DisplayedResourceCount = 0; //Tracks how many resources are currently in the GraphObj
        this.IsSelected = false;
    }
}


//Represents a resource belonging to a provider. 
class Resource {
    constructor() {
        this.Id = null;
        this.Title = null;
        this.Summary = null;
        this.Url = null;
        this.Type = null;     //Only used with TeachEngineering to distinguish activities, lessons and units. 
        this.Alignments = []; //A list of ASNCodes for the standard alignments of this resource. 
    }
}