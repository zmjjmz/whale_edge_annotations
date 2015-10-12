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

function displayPath(path){
  for(var i = 0; i < path.length; i++){
    var offset = $('.displayed').offset();
    var posX = path[i][0] + offset.left;
    posY = path[i][1] + offset.top;
    img = $('<div class=\'overlay\' id=\'show\'>');
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

function find_seam(yGradient, start,end,center, n_neighbors){
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
  displayPath(path);
  return path;
}

function updateMainImage(){
   $.post( "/image", function( data ) {
      $('#mainImage').attr("src", data.image);
      $('#mainImage').attr("alt", data.id);
      $('#mainImage').css('width',data.dim2)
      $('#mainImage').css('height', data.dim1)
    });
}

function reset(type){
  if(type == "seam"){
     centerPoint = false;
     center = false;
     startPoint = false;
     startLocaiton = [];
     endPoint = false;
     endLocaiton = [];
     imageData = [];
     $('#start').remove();
     $('#end').remove();
     $('#center').remove();
  }
  else{
     linePoints = [];
     $('#other').remove();
  }
  $('#show').remove();
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
  });

  $('#optionsRadios2').click(function(e) {
	type = MANUAL;
  });
  //Variables for seam
  var centerPoint = false;
  var center = false;
  var startPoint = false;
  var startLocaiton = [];
  var endPoint = false;
  var endLocaiton = [];
  var imageData = [];
  
  //Variabels for manual path
  var linePoints = [];
  

  $('#resetState').click(function(e) {
    e.preventDefault();
    reset(type);
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
       }
       else if(!endPoint){
          img = $('<div class=\'overlay\' id=\'end\'>');
          endPoint = true;
          endLocation = floorPoint([posX,posY]);
       }
       else if(!centerPoint){
          img = $('<div class=\'overlay\' id=\'center\'>');
          center = floorPoint([posX,posY]);
          centerPoint = true;
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
            setTimeout(find_seam(data.gradient, startLocation,endLocation,center, n_neighbors), 0 );
          });
        }
        else{
        	alert("Please Label start and end points before submitting");
        }
      }
      else{//MANUAL
	displayPath(getLinearPath(linePoints))
      }  
  });

});
