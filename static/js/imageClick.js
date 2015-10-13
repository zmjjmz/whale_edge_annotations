/**
*dimesnsions is an array with the dimesnsions
*returns matrix of zeros with given dimensions
*/
function zeros(dimensions){
  var array = [];
  for (var i = 0; i < dimensions[0]; ++i) {
        array.push(dimensions.length == 1 ? 0 : zeros(dimensions.slice(1)));
    }
    return array;
}

function sendPath(path,type,start,end,linePoints, n_neighbors,done){
  var arr = { Path: path, Type: type,Start:start,End:end,LinePoints:linePoints,Neighbors:n_neighbors,Done:done };
  $.ajax({
    url: '/path',
    type: 'POST',
    data: JSON.stringify(arr),
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    async: true,
    success: function(msg) {
    }
  });
}

/**
* Takes an array of a point [x,y]
* returns an array with the point values turn to ints
*/
function floorPoint(pt){
  point = [];
  point.push(Math.floor(pt[0]));
  point.push(Math.floor(pt[1]));
  return point;
}

function displayPath(path,type){
  for(var i = 0; i < path.length; i++){
    var offset = $('.displayed').offset();
    var posX = path[i][0] + offset.left;
    posY = path[i][1] + offset.top;
    if(type == 'seam'){
      img = $('<div class=\'seamPath\' >');
    }
    else{
       img = $('<div class=\'manualPath\' >');
    }
    img.css('left', posX);
    img.css('top',posY);
    img.appendTo('#container');  
  }
}

/**
Takes in array of x,y points and returns array of path connecting all points.
*/
function getLinearPath(points){
  path = [];
  points  = points.sort(function(a,b){return a[0] - b[0]});
  path.push(points[0]);
  for(var i = 1; i < points.length; i++){
    var slope = (points[i][1] - points[i-1][1])/(points[i][0] - points[i-1][0]);
    var b = points[i][1] - slope * points[i][0];
    for(var j = points[i-1][0]; j < points[i][0]; j++){
      path.push(floorPoint([j , b + slope*j]));
    }
    path.push(points[i]);
  }
  return path;
}

function setPassThrough(gradient, pt){
  for(var i = 0; i < gradient.length; i++){
    gradient[i][pt[0]] = Number.NEGATIVE_INFINITY;
  }
  gradient[pt[1]][pt[0]] = 0;
  return gradient;
}

function getCost(row, col, i, gradient_y_image, cost){
  if(row + i < 0 || row+i >= gradient_y_image.length){
    return Number.NEGATIVE_INFINITY;
  }
  else{
    return cost[row+i][col-1] + gradient_y_image[row][col];
  }
}

function getCandidates(row, col, gradient_y_image, cost, neighbor_range){
  var candidates = [];
  for(var i = 0; i < neighbor_range.length; i++){
    candidates.push(getCost(row,col,neighbor_range[i],gradient_y_image,cost))
  }
  return candidates;
}

function argMax(candidates){
  var maxVal = candidates[0];
  var maxIndex = 0;
  for(var i = 1; i < candidates.length; i++){
    if(maxVal < candidates[i]){
      maxVal = candidates[i];
      maxIndex = i;
    }
  }
  return maxIndex;
}

function find_seam(yGradient, start,end,center, n_neighbors,linePoints){
  if(n_neighbors % 2 != 1){
    alert("n_neighbors is not an odd number");
    return;
  }
  var neighbor_range = []
  for(var i = -1 * Math.floor(n_neighbors/2); i < 1 + Math.floor(n_neighbors/2); i++){
    neighbor_range.push(i);
  }
  yGradient = setPassThrough(yGradient, start)
  yGradient = setPassThrough(yGradient, end)
  if(center != false){
    yGradient = setPassThrough(yGradient, center);
  }
  var cost = zeros([yGradient.length, yGradient[0].length ])
  var back = zeros([yGradient.length, yGradient[0].length ])
  //TODO check start is before end

  for(var col = start[0]; col < end[0] + 1; col++){
    for(var row = 0; row < yGradient.length; row++){
      candidates = getCandidates(row, col, yGradient, cost, neighbor_range);
      var best = argMax(candidates);
      back[row][col] = best - Math.floor(n_neighbors / 2);
      cost[row][col] =  candidates[best];
    }
  }
  var path = [];
  var curr_y = end[1];
  var path_cost = 0;
  for(var col = end[0]+1; col >= start[0]; col--){
    path_cost += cost[curr_y][col];
    path.push([col,curr_y]);
    next_ = curr_y + back[curr_y][col];
    curr_y = next_;
  }
  displayPath(path,'seam');
  path = JSON.stringify(path);
  //Removing previous data
  $('#pathInfo').remove();
  info = $('<div id=\'pathInfo\'>');
  info.hide();
  info.text(path);
  info.appendTo('body');
}

function updateMainImage(){
   $.post( "/image", function( data ) {
      $('#mainImage').attr("src", data.image);
      $('#mainImage').attr("alt", data.id);
      $('#mainImage').css('width',data.dim2)
      $('#mainImage').css('height', data.dim1)
    });
}

$(document).ready(function(e) {
  var SEAM = "seam";
  var MANUAL = "manual";
  var type = SEAM;
  //Set the size of container to size of image
  var overlay = $("<div class=overlay><div>").hide().appendTo("body");
  var annotationOffset = overlay.width()/2;
  overlay.remove();
  //Load first image for user
  updateMainImage();
  
  $('img').on('dragstart', function(event) { event.preventDefault(); });

  $('#optionsRadios1').click(function(e) {
	type = SEAM;
        $('.manualPath').hide();
	$('.seamPath').show();
  });

  $('#optionsRadios2').click(function(e) {
	type = MANUAL;
        $('.seamPath').hide();
	$('.manualPath').show();
  });
  //Variables for seam
  var centerPoint = false;
  var center = false;
  var startPoint = false;
  var startLocaiton = [];
  var endPoint = false;
  var endLocaiton = [];
  var imageData = [];
  var seamPath = [];
  
  //Variabels for manual path
  var linePoints = [];
  var linePath = [];  

  $('#resetState').click(function(e) {
   e.preventDefault();
   centerPoint = false;
   center = false;
   startPoint = false;
   startLocaiton = [];
   endPoint = false;
   endLocaiton = [];
   imageData = [];
   linePoints = [];
   linePath = [];
   $('.overlay').remove();
   $('.seamPath').remove();
   $('.manualPath').remove();

  });

  $('.displayed').click(function(e) {
    var offset = $('.displayed').offset();
    var posX = e.pageX - offset.left,posY = e.pageY - offset.top;
    var img;
    var add = true;
    if(type == SEAM){
       if(!startPoint){
          img = $('<div class=\'overlay\' id=\'start\'>');
          startPoint = true;
          startLocation = floorPoint([posX,posY]);
          linePoints.push(startLocation);
       }
       else if(!endPoint){
          img = $('<div class=\'overlay\' id=\'end\'>');
          endPoint = true;
          endLocation = floorPoint([posX,posY]);
          linePoints.push(endLocation);
       }
       else if(!centerPoint){
          img = $('<div class=\'overlay\' id=\'center\'>');
          center = floorPoint([posX,posY]);
          centerPoint = true;
	  linePoints.push(center);
       }
       else{
	  add = false;
	  alert("Left, Right and Center are all labeled"); 
       }
    }
    else{//Manual
     img = $('<div class=\'overlay\' id=\'other\'>');
     linePoints.push(floorPoint([posX,posY]));
    }
    if(add){
        img.css('top', e.pageY-annotationOffset);
    	img.css('left',e.pageX-annotationOffset);
    	img.appendTo('#container');
    }

  });

  $('#submitData').click(function(e){
      e.preventDefault();
      if(type == SEAM){
        if(startPoint && endPoint){
          var gid = $('#mainImage').attr("alt");
          $.get('/gradient/'+gid, function( data ) {
	    var n_neighbors = $('#inputNeighbors').val();
	    if(n_neighbors == ''){
	      n_neighbors = $('#inputNeighbors').attr('placeholder');
	    }
	    n_neighbors = parseInt(n_neighbors);
            setTimeout(find_seam(data.gradient, startLocation,endLocation,center, n_neighbors,linePoints), 0 );
          });
        }
        else{
        	alert("Please Label start and end points before submitting");
        }
      }
      else{//MANUAL
        linePath = getLinearPath(linePoints)
	displayPath(linePath,'manual')
      }  
  });
  
  $('#manualSubmit').click(function(e){
	e.preventDefault();
        var updated = false;
	if(type == SEAM){
 	  if($('#pathInfo').length == 0) {
		alert('Please Generate the Path First');
	  }
	  else{
		path = JSON.parse($('#pathInfo').text());
                var n_neighbors = $('#inputNeighbors').val();
                if(n_neighbors == ''){
                  n_neighbors = $('#inputNeighbors').attr('placeholder');
                }
                n_neighbors = parseInt(n_neighbors);
                var done = confirm("Mark as Done?");
                sendPath(path,'seam',startLocation,endLocation,linePoints, n_neighbors,done);
                updated = true;
	  }	   
	}
	else{
	    	if(linePath.length == 0){
		  alert('Please Generate the Path First');
		}
		else{
		  var n_neighbors = $('#inputNeighbors').val();
                  if(n_neighbors == ''){
                    n_neighbors = $('#inputNeighbors').attr('placeholder');
                  }
                  n_neighbors = parseInt(n_neighbors);
                  path = linePath;
                  var done = confirm("Mark as Done?");
                  sendPath(path,'manual',startLocation,endLocation,linePoints, n_neighbors,done);
                  updated = true;
		}
	}
        if(updated){
	   centerPoint = false;
	   center = false;
	   startPoint = false;
	   startLocaiton = [];
	   endPoint = false;
	   endLocaiton = [];
	   imageData = [];
	   linePoints = [];
	   linePath = [];
	   $('.overlay').remove();
	   $('.seamPath').remove();
	   $('.manualPath').remove();
	   $('#pathInfo').remove();
           updateMainImage();
	}
  });

});
