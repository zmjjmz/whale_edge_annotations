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
*Function to find the euclidean distance between points
*Returns the distance between the points
*/
function getDistance(pt1, pt2){
  var difference = Math.pow(pt1[0]-pt2[0],2) + Math.pow(pt1[1] - pt2[1],2);
  return Math.sqrt(difference);
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

/**
* Function to find the index of the maximum entry in 1d array
*/
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
