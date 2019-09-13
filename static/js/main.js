$("#submit").click(function(){
    searchRequest.reset();search();
  })  
  //facets research   
  function foo() {
		search();
    }  
    //Support clicking Enter to search
	$(document).keypress(function(e) {
	    if(e.which == 13) {
	    	searchRequest.reset();
	    	search();
	    }
	});
  searchRequest = {
		host : "catalogue.unice.fr:1701",
		path:"/PrimoWebServices/xservice/search/brief?",
		proxypath:"/primo_library/libweb/custom/primoapiproxy?",
		proxyitempath:"/primo_library/libweb/custom/primorestpnxproxy",
		institution: "UNS", 
		size: "20",
        locale:'fr',
        initFacets: [{"library":"1SJA"},{"rtype":"books"}],
		facets: [],
		searchTerm:'',
		page:1,
		totalResults:0,
		sort:'', //relevance
		reset: function() {this.facets = [];this.page = 1}
	}
    function search() {
        
		recordsCache = new Array();
		
		searchRequest.term = $('#search').val();
		
		if (searchRequest.term == undefined || searchRequest.term == '') {
			alert('Please enter a search term');
			return;
		}
		
		I18n.locale = searchRequest.locale;
		
		index = 1;
		
		/***************** CALCULATE PAGE NUMBER ****************/
		if (searchRequest.page != 1) {
			index = (searchRequest.page - 1) * 10;
			if (index == 0) index = 1;
		} 
		
		query = "query=any,exact," + encodeURIComponent(searchRequest.term);

		/***************** ADD FACETS TO QUERY IF NEEDED ****************/
		if (searchRequest.facets.length > 0) {
			$.each(searchRequest.facets, function(key, facet) {
				facetData = facet.split("__");
				query += "&query=facet_" + facetData[0] + ",exact," + encodeURIComponent(facetData[1].replace(',', ' '));
			});
        } 
        
        /***************** CUSTOM INIT FACETS TO QUERY ****************/
		if (searchRequest.initFacets.length > 0) {
            for (var ind in searchRequest.initFacets) {
              for (var key in searchRequest.initFacets[ind]) {
                query += "&query=facet_" + key + ",exact," + searchRequest.initFacets[ind][key];
            }}
		} 
 
		/***************** PERFORM THE SEARCH REQUEST *****************/
		var myurl = 'http://' + searchRequest.host + searchRequest.proxypath +
        'institution=' + searchRequest.institution + '&' + query + '&bulkSize=' + searchRequest.size +'&indx=' + index +  
     	'&sortField=' +  searchRequest.sort + 
		//'&lang=fre&json=true&callback=parseResponse';
		'&lang=fre';
	
		
		$.ajax({ 
			url : myurl, 
			data : null, 
			timeout : 10000, 
			dataType : "json",
			success : function(data){
             parseResponse(data)
			},	 
			error : function(){
	         alert("error")
			}
		}); 
	}
    function parseResponse(data) {
		console.log(data)
        	   searchRequest.totalResults = data["SEGMENTS"]["JAGROOT"]["RESULT"]["DOCSET"]["@TOTALHITS"];
        	   
        	   /*********************************************** FACETS ******************************************************/
        	   $("#facets").empty();
        	   if (data["SEGMENTS"]["JAGROOT"]["RESULT"]["FACETLIST"] != null) {
	        	   $.each(data["SEGMENTS"]["JAGROOT"]["RESULT"]["FACETLIST"]["FACET"],  function(key, record) {
	        		  if(record['@NAME'] == 'creator' || record['@NAME'] == 'creationdate' || record['@NAME'] == 'topic') {
	        		   var facetValues = getFacetValues(record['@NAME'], record["FACET_VALUES"]);
	        		   
	        		   if (facetValues == "") return;
	        		   $("#facets").append(
		                        "<div>" +
		                        I18n.t(record['@NAME']) +
		                          
		                          "<ul>" +  facetValues + "</ul>" +  
		                          
								"</div>");
					   }
	        		});
           		}
              /*********************************************** RECORDS ******************************************************/
		        $("#results").empty();
        	   
        	   var records = data["SEGMENTS"]["JAGROOT"]["RESULT"]["DOCSET"]["DOC"];
        	   if (!(records instanceof Array)) {records = [records];} //only 1 record returned
    	   
		        $.each(records,
		                function(index, record) {
		        				
					        	var pnx = record;
					        	if (record && record.PrimoNMBib) {
					        		pnx = record.PrimoNMBib.record;
					        	}
					        	var res;
					        	//store records in memory, for details pane
                                recordsCache[index] = pnx;
                                //call to recommandation function
		        	            getRecommandations(index);
					        	//display title, creator and creation date
								res = "<div class='list-group-item list-group-item-action flex-column align-items-start'>"+
								    "<div class='row'>"+
									  "<div class='col-md-12'>"+
									  "<div class='float-right'>"+pnx.display.lds20+"</div>"+
                                      "<h4 class='mb-1'><strong><a href='#' onclick='displayDetails(" + index + ")'>"+ pnx.display.title + "</a></strong></h4>"+
                                      "<small>" + pnx.facets.creationdate + "</small>"+
                                      "<p>"+ pnx.display.creator +"</p>";
		                        
								subject = pnx.display.subject;
						   		description = pnx.display.description;
								
								//add subject and description if such exist
                                //if (subject) res += "<p class='mb-1'>" +subject + "</p>";
                                if (subject) res += "<p><span class='badge badge-secondary' style='white-space:normal;max-width:500px;'>" +subject + "</span></p>";
		        				
								if (description) res += "<small>" + description + "</small>";
								res += "</div></div>"+
								       "<div class='row'>" ;
								
								res += "<p><strong>Vous pourriez aussi être intéressé par... </strong></p>";
								res += "<div id='simrec" +index + "' class='owl-carousel owl-theme'></div>";
								res += "<p><strong>Les lecteurs qui ont emprunté ce doculement ont aussi emprunté... </strong></p>";
		                        res += "<div id='userec" +index + "' class='owl-carousel owl-theme'></div>";
								res += "</div>"+
								       "</div>";;    
		                        
		                        $("#results").append(res);
		                }
		        ); 
                 /******************************************* FACET BREADCRUMBS *****************************************/
		        $("#facetsbreadcrumbs").empty();
				var facetsStr = "";
				
		        if (searchRequest.facets.length > 0) {
		        	facetsStr =
		        		"<div class='facetsMainDiv'>" + 
						   "<div class='facetInnerDiv'>" + 
							   "<span class='refineSpan'>Filtre(s) : </span>"; 
					
		        	 $.each(searchRequest.facets, function(index, facet) {
						facetData = facet.split("__");
						facetsStr +=
								 "<span class='facetSpan'>" + 
								 	I18n.t(facetData[0]) +
									":<strong> " + facetData[1] + "</strong>" + 
									"<a href='#' onclick='searchRequest.facets.splice(" + index + ", 1);foo()' title='remove'>" +
									"<img alt='remove' src='images/icon_remove.png'/></a>" + 
									"</span>";
					});
					
					$("#facetsbreadcrumbs").append(facetsStr + "</div></div>");
				} 
                 /*************************************************************************************************/
		        $("#totalResults").empty();
		        if (index == 1) index = 0;
                if (searchRequest.totalResults < 10) {toNumber = searchRequest.totalResults} else {toNumber = (index + 10)}; 
		        
		        $("#totalResults").append("<span class='total'>Results " + (index + 1) + " - " + 
                                toNumber + " of </span><em>" + searchRequest.totalResults + "</em>" );
                
                $("#details").empty();                
    }
    //Receive an array of facet values, return these as a <li> list
	function getFacetValues(facetType, facetValues) {
		var ret = "";
		
		//only 1 value in facet, we receive the element itself
		if (facetValues.length == undefined) {
			facetValues = [facetValues];
		}
		
		$.each(facetValues, function(i, record) {
			//no point in displaying the facet, it includes the complete result set
			if (parseInt(record["@VALUE"]) == searchRequest.totalResults) return;
			if (i > 5) return ret; //display only 5 values for each facet
			 
			 var facetValue = record["@KEY"];
			 
			 if (facetType == "creationdate") {facetValue = "[" + facetValue + "+TO+" + facetValue + "]";}
			 
			 ret += "<li><a title='" +  record["@KEY"] + "' " + 
			        "href='#' onclick=\"javascript:searchRequest.page=1;searchRequest.facets[searchRequest.facets.length] = '" +  
			        facetType + "__" + facetValue + "'; foo();\">" +
			        
			 record["@KEY"].substring(0,15) + " (" + record["@VALUE"] + ")</a></li>";
		});
		 
		 return ret;
	
    }
	//detail on right sidebar
	function displayDetails(index) {

		var displaySections = ["control", "display", "addata"];
		
		if (recordsCache[index] == undefined) {
			return;
		}
		$("#details").empty();

		var record = recordsCache[index];
		console.log(record)
		var content;
		content = "<div class='card flex-row flex-wrap'>"+
				  "<div class='card-header border-0'>"+
				  record.display.lds20+
				  "</div>"+
				  "<div class='card-block px-2'>"+
				  "<h4 class='card-title'>"+ record.display.title +"</h4>"+
				  "<p class='card-text'>ISBN : "+ record.display.identifier +"</p>"+
				  "<p class='card-text'>date : "+ record.display.creationdate +"</p>"+
				  "<p class='card-text'>Auteur(s) : "+ record.display.creator +"</p>"+
				  "<p class='card-text'>Contributeurs(s) : "+ record.display.contributor +"</p>"+
				  "<p class='card-text'>Editeur : "+ record.display.contributor +"</p>"+
				  "<p class='card-text'>Mention d'édition : "+ record.display.publisher +"</p>"+
				  "<div class='w-100'>Collection : "+ record.display.seriestitle +"</div>"+
				  "</div>"+
				  "<div class='card-block px-2'>"+
				  "<p class='card-text'>Sujets : "+ record.display.subject +"</p>"+
				  "<p class='card-text'>lds25 : "+ record.display.lds25 +"</p>"+
				  "<p class='card-text'>Description : "+ record.display.description +"</p>"+
				  "</div>"+


				  " <div class='card-footer w-100 text-muted'>"+
				  "</div>"+
				  "</div>";
				  $("#details").append(content);
		/*var table = "<table class='table-fill'><tbody class='table-hover'>";	
		for (var i = 0 ; i < displaySections.length; i++) {
			 $.each(record[displaySections[i]],  function(key, record) {
				 table += "<tr><td class='text-left'>" + key + "</td><td class='text-left'>" + record + "</td></tr>";
			 });
		}		 
		$("#details").append(table + "</tbody></table>");*/
	}
	//recommandations functions
    function getRecommandations(index) {

        if (recordsCache[index] == undefined) {
            return;
        }
        
		var record = recordsCache[index];
                $.getJSON("/recommand/"+record.control.sourcerecordid.replace(/^0+/, ''),
                function(data) {
					$("#simrec"+index).owlCarousel({
						stagePadding: 20,
						margin: 10,
						nav: true,
						items:2
					  });   
					data.map(function(item){getRecord(index,item.num)})  					
				}); 

				$.getJSON("/recommand-graph/"+record.control.sourcerecordid.replace(/^0+/, ''),
                function(data) { 
					  $("#userec"+index).owlCarousel({
						stagePadding: 20,
						margin: 10,
						nav: true,
						items:2
					  });   
					data.map(function(item){getRecordFromGraph(index,item.num)})  					
				});      		
        }
        
        function getRecord(index,id){
            id = id.toString().padStart(9, '0')
           /* var url = 'http://' + searchRequest.host + '/primo_library/libweb/webservices/rest/v1/pnxs/L/sc_aleph_uns01' + id + 
				'?inst=' + searchRequest.institution + '&callback=parseResponse';*/
				var url = 'http://' + searchRequest.host + searchRequest.proxyitempath + '?doc_num=' + id;
                $.getJSON(url,
                function(data) { 
                    var html = "<div class='item'><a href='#'>" + data.title + "</a><p><small class='muted'>"+data.date+"</smalll></p><p>"+data.subject.join(",")+"</p></div>"
                    return  $("#simrec"+index).trigger('add.owl.carousel', [html, index]).trigger('refresh.owl.carousel');
                   //return $(".simrec"+index).append("<div>" + data.title + "<p><small class='muted'>"+data.date+"</smalll></p><p>"+data.subject.join(",")+"</p></div>")
                });     
		}

		function getRecordFromGraph(index,id){
            id = id.toString().padStart(9, '0')
            /*var url = 'http://' + searchRequest.host + '/primo_library/libweb/webservices/rest/v1/pnxs/L/sc_aleph_uns01' + id + 
				'?inst=' + searchRequest.institution + '&callback=parseResponse';*/
				var url = 'http://' + searchRequest.host + searchRequest.proxyitempath + '?doc_num=' + id;
                $.getJSON(url,
                function(data) { 
                    var html = "<div class='item'><a href='#'>" + data.title + "</a><p><small class='muted'>"+data.date+"</smalll></p><p>"+data.subject.join(",")+"</p></div>"
                    return  $("#userec"+index).trigger('add.owl.carousel', [html, index]).trigger('refresh.owl.carousel');
                  
                });     
		}
		
		