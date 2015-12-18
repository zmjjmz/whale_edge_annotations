//GLOBAL CONSTANT VARIABLES
const SEAM = "seam";
const MANUAL = "manual";
const TOP = 'top';
const BOTTOM = 'bottom';
const LEFT = 'left';
const RIGHT = 'right';
const VERTICAL = 'vertical';
const HORIZONTAL = 'horizontal';
const DISTANCE_EPSILON = 3;


/**
*Finds the maximum angle between adjacent points
*Takes a list of points and the direction the line will travel
*/
function getMaxAngle(points,orientation){
  if(orientation == VERTICAL){
    points  = points.sort(function(a,b){return a[1] - b[1]});
  }
  else{
    points  = points.sort(function(a,b){return a[0] - b[0]});
  }
  var maxAngle = 0;
  for(var i = 1; i < points.length; i++){
    var diffY = points[i][1] - points[i-1][1];
    var diffX =  points[i][0] - points[i-1][0];
    var angle = Math.atan2(diffY,diffX)
    if(orientation == VERTICAL){
      angle = Math.atan2(diffX,diffY);
    }
    if(maxAngle < Math.abs(angle)){
	    maxAngle = Math.abs(angle);
    }
  }
  return maxAngle;
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
    if((points[i][0] - points[i-1][0]) != 0){
      for(var j = points[i-1][0]+1; j < points[i][0]; j++){
        path.push(floorPoint([j , b + slope*j]));
      }
    }
    else{
    //Have vertical path
      var startPoint = points[i];
      var endPoint = points[i-1];
      if(startPoint[1] > endPoint[1]){
        var temp = startPoint;
        startPoint = endPoint;
        endPoint = temp;
      }
      for(var j = startPoint[1]; j < endPoint[1]; j++){
        path.push(floorPoint([startPoint[0] , j]));
      }
    }
    path.push(points[i]);
  }
  return path;
}

/**
*function to force path to go through a point on horizontal path
*/
function setPassThrough(gradient, pt){
  for(var i = 0; i < gradient.length; i++){
    gradient[i][pt[0]] = Number.NEGATIVE_INFINITY;
  }
  gradient[pt[1]][pt[0]] = 0;
  return gradient;
}

/**
*function to force path to go through a point on vertical path
*/
function setPassThroughVertical(gradient,pt){
  for(var i = 0; i < gradient[0].length; i++){
    gradient[pt[1]][i] = Number.NEGATIVE_INFINITY;
  }
  gradient[pt[1]][pt[0]] = 0;
  return gradient;
}

/**
*Function to force path to avoid a specific region
*Takes the gradient array and region object to map out region to ignore
*/
function setIgnoredArea(gradient, region){
  var point = region.point;
  for(var i = 0; i < region.height; i++){
    for(var j = 0; j < region.width; j++){
      gradient[point[1] + i][point[0] + j] = Number.NEGATIVE_INFINITY;
    }
  }
  return gradient;
}
/**
*Function to make interior bound to avoid specific part of image based on path type
*/
function lineAdjustment(gradient,path,type){
  if(type == TOP){
    for(var i = 0; i < path.length; i++){
      var point = path[i];
      for(var j = point[1]; j < gradient.length; j++){
        gradient[j][point[0]] = Number.NEGATIVE_INFINITY;
      }
    }
  }
  else if(type == BOTTOM){
    for(var i = 0; i < path.length; i++){
      var point = path[i];
      for(var j = point[1]; j >= 0; j--){
        gradient[j][point[0]] = Number.NEGATIVE_INFINITY;
      }
    }
  }

  else if(type == 'left'){
    for(var i = 0; i < path.length; i++){
      var point = path[i]
      for(var j = point[0]; j < gradient[0].length; j++){
        gradient[point[1]][j] = Number.NEGATIVE_INFINITY;
      }
    }
  }
  else if(type == RIGHT){
    for(var i = 0; i < path.length; i++){
      var point = path[i];
      for(var j = point[0]; j >= 0; j--){
        gradient[point[1]][j] = Number.NEGATIVE_INFINITY;
      }
    }
  }
  return gradient;
}

/**
*Fucntion to get cost from a specific pixel of nearby costs for vertical tests
*/
function getCost(row, col, i, gradient_y_image, cost,side){
  var multiplier = 1.0;
  if(side == BOTTOM){
    multiplier = -1.0;
  }
  if(row + i < 0 || row+i >= gradient_y_image.length){
    return Number.NEGATIVE_INFINITY;
  }
  else{
    var gradientValue = gradient_y_image[row][col];
    if(gradientValue != Number.NEGATIVE_INFINITY){
      gradientValue = gradientValue * multiplier;
    }
    return cost[row+i][col-1] + gradientValue;
  }
}

/**
*Fucntion to get cost from a specific pixel of nearby costs for horizontal paths
*/
function getCostVertical(row, col, i, gradient, cost,side){
  var multiplier = 1.0;
  if(side == LEFT){
    multiplier = -1.0;
  }
  if(col + i < 0 || col+i >= gradient[0].length){
    return Number.NEGATIVE_INFINITY;
  }
  else{
    var gradientValue = gradient[row][col];
    if(gradientValue != Number.NEGATIVE_INFINITY){
	gradientValue = gradientValue * multiplier;
    }
    return cost[row-1][col+i] + gradientValue;
  }
}

/**
*Function to find costs of canditates of next pixel for seam carving
*/
function getCandidates(row, col, gradient_y_image, cost, neighbor_range,orientation,side){
var candidates = [];
  for(var i = 0; i < neighbor_range.length; i++){
    if(orientation == HORIZONTAL){
      candidates.push(getCost(row,col,neighbor_range[i],gradient_y_image,cost,side));
    }
    else{
      candidates.push(getCostVertical(row,col,neighbor_range[i],gradient_y_image,cost,side));
    }
  }
  return candidates;
}


/**
*Vertical seam carving method
*Draws and stores the seam carved path
*/
function find_seam_vertical(gradient,linePoints,lines,n_neighbors,side,ignoredRegions){
  if(n_neighbors % 2 != 1){
    alert("n_neighbors is not an odd number");
    return;
  }
  var neighbor_range = []
  for(var i = -1 * Math.floor(n_neighbors/2); i < 1 + Math.floor(n_neighbors/2); i++){
    neighbor_range.push(i);
  }
  linePoints = linePoints.sort(function(a,b){return a[1] - b[1]});
  var start = linePoints[0];
  var end = linePoints[linePoints.length -1];
  for(var i  = 0; i < linePoints.length; i++){
    gradient = setPassThroughVertical(gradient, linePoints[i]);
  }
  for(var i = 0; i < lines.length; i++){
    gradient = lineAdjustment(gradient,getLinearPath(lines[i]),side)
  }

  for(var i = 0; i < ignoredRegions.length; i++){
    gradient = setIgnoredArea(gradient, ignoredRegions[i]);
  }

  var cost = zeros([gradient.length, gradient[0].length ])
  var back = zeros([gradient.length, gradient[0].length ])

  for(var row = start[1]; row < end[1] + 1; row++){
    for(var col = 0; col < gradient[0].length; col++){
      candidates = getCandidates(row, col, gradient, cost, neighbor_range,VERTICAL,side);
      var best = argMax(candidates);
      back[row][col] = best - Math.floor(n_neighbors / 2);
      cost[row][col] =  candidates[best];
    }
  }
  var path = [];
  var curr_x = end[0];
  var path_cost = 0;
  for(var row = end[1]+1; row >= start[1]; row--){
    path_cost += cost[row][curr_x];
    path.push([curr_x,row]);
    next_ = curr_x + back[row][curr_x];
    curr_x = next_;
  }
  displayPath(path,side,true);
  var pathData = {path:path,neighbors:n_neighbors,linePoints:linePoints,type:'seam'};
  var pathData = JSON.stringify(pathData);
  //Removing previous data
  $('#path'+side+'Info').remove();
  info = $('<div id=path'+side+'Info>');
  info.hide();
  info.text(pathData);
  info.appendTo('body');
}

/**
*Horizontal seam carving method
*Draws and stores the seam carved path
*/
function find_seam_horizontal(yGradient,linePoints,lines ,n_neighbors,side,ignoredRegions){
  if(n_neighbors % 2 != 1){
    alert("n_neighbors is not an odd number");
    return;
  }
  var neighbor_range = []
  for(var i = -1 * Math.floor(n_neighbors/2); i < 1 + Math.floor(n_neighbors/2); i++){
    neighbor_range.push(i);
  }
  linePoints = linePoints.sort(function(a,b){return a[0] - b[0]});
  var start = linePoints[0];
  var end = linePoints[linePoints.length -1];
  for(var i = 0; i < linePoints.length; i++){
    yGradient = setPassThrough(yGradient, linePoints[i]);
  }

  for(var i = 0; i < lines.length; i++){
   yGradient = lineAdjustment(yGradient,getLinearPath(lines[i]),side)
  }
  for(var i = 0; i < ignoredRegions.length; i++){
    yGradient = setIgnoredArea(yGradient, ignoredRegions[i]);
  }
  var cost = zeros([yGradient.length, yGradient[0].length ])
  var back = zeros([yGradient.length, yGradient[0].length ])

  for(var col = start[0]; col < end[0] + 1; col++){
    for(var row = 0; row < yGradient.length; row++){
      candidates = getCandidates(row, col, yGradient, cost, neighbor_range,HORIZONTAL,side);
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
  displayPath(path,side,true);
  var pathData = {path:path,neighbors:n_neighbors,linePoints:linePoints,type:'seam'};
  pathData = JSON.stringify(pathData);
  //Removing previous data
  $('#path'+side+'Info').remove();
  info = $('<div id=path'+side+'Info>');
  info.hide();
  info.text(pathData);
  info.appendTo('body');
}
