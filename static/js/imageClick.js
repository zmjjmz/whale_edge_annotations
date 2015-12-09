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
const testing = false;

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
* Sends annotation information to server
*/
function sendPath(done, badTopPoints,badBottomPoints,badLeftPoints,badRightPoints, notch, notchSubmerged,ignoredRegions){
  var topInfo = path = JSON.parse($('#pathtopInfo').text());
  topInfo['badPoints'] = badTopPoints;
  var arr = { gid:$('#mainImage').attr("alt"),done:done, bad:false, topInfo:topInfo,notch:notch,notchSubmerged:notchSubmerged,ignoredRegions:ignoredRegions };
  if($('#pathleftInfo').length != 0){
    var leftInfo = JSON.parse($('#pathleftInfo').text());
    leftInfo['badPoints'] = badLeftPoints;
    arr['leftInfo'] = leftInfo;
  }
  if($('#pathrightInfo').length != 0){
    var rightInfo = JSON.parse($('#pathrightInfo').text());
    rightInfo['badPoints'] = badRightPoints;
    arr['rightInfo'] = rightInfo;
  }
  if($('#pathbottomInfo').length != 0){
    var bottomInfo = JSON.parse($('#pathbottomInfo').text());
    bottomInfo['badPoints'] = badBottomPoints;
    arr['bottomInfo'] = bottomInfo;
  }
  $.ajax({
    url: '/path',
    type: 'POST',
    data: JSON.stringify(arr),
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    async: true
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
/**
*Function to draw point on display
*Takes a point array and id and id2 as arguments
*/
function displayIdPoint(point,id, id2){
  var overlay = $("<div class=topControl><div>").hide().appendTo("body");
  var annotationOffset = overlay.width()/2;
  overlay.remove();

  var img = null;
  if(id == null){
    img = $('<div class=topControl id2='+id2.toString()+'>');
  }
  else{
    img = $('<div class=topControl id='+id+' id2='+id2.toString()+'>');
  }
  var offset = $('.displayed').offset();
  var posX = point[0] + offset.left;
  posY = point[1] + offset.top;
  img.css('top', posY - annotationOffset);
  img.css('left',posX - annotationOffset);
  img.appendTo('#container');
}

/**
* Takes a list of points and draws the points on the image
*Takes path, the type of the path, and whether to remove the old path
*/
function displayPath(path,type,remove){
  if(remove){
    $('.'+type+'Path').remove();
  }
  for(var i = 0; i < path.length; i++){
    var offset = $('.displayed').offset();
    var posX = path[i][0] + offset.left;
    posY = path[i][1] + offset.top;
    img = $('<div class='+type+'Path >');
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

function setPassThrough(gradient, pt){
  for(var i = 0; i < gradient.length; i++){
    gradient[i][pt[0]] = Number.NEGATIVE_INFINITY;
  }
  gradient[pt[1]][pt[0]] = 0;
  return gradient;
}

function setPassThroughVertical(gradient,pt){
  for(var i = 0; i < gradient[0].length; i++){
    gradient[pt[1]][i] = Number.NEGATIVE_INFINITY;
  }
  gradient[pt[1]][pt[0]] = 0;
  return gradient;
}

function setIgnoredArea(gradient, region){
  var point = region.point;
  for(var i = 0; i < region.height; i++){
    for(var j = 0; j < region.width; j++){
      gradient[point[1] + i][point[0] + j] = Number.NEGATIVE_INFINITY;
    }
  }
  return gradient;
}

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

function getGradient(gid){
  $.get('/gradient/'+gid, function( data ) {
    $('#gradientInfo').remove();
    info = $('<div id=gradientInfo>');
    info.hide();
    info.text(JSON.stringify(data));
    if(data.gid == $('#mainImage').attr("alt") ){
      info.appendTo('body');
    }
  });
}

function initailizeData(data){
  data = data.data[1];
  var counter = 0;
  var id2List = [];
  points = [];
  if(data.hasOwnProperty('linePoints')){
    points = data.linePoints;
    points  = points.sort(function(a,b){return a[0] - b[0]});
    displayIdPoint(points[0],'start',counter);
    id2List.push(counter);
    counter += 1;
    displayIdPoint(points[points.length - 1],'end',counter);
    id2List.push(counter);
    counter += 1;
    for(var i = 1; i < points.length-2; i++){
      displayIdPoint(points[i],null, counter);
      id2List.push(counter);
      counter += 1;
    }
  }
  else{
    if(data.hasOwnProperty(LEFT)){
      displayIdPoint(data.left,'start',counter);
      id2List.push(counter);
      counter += 1;
      points.push(data.left);
    }
    if(data.hasOwnProperty('right')){
      displayIdPoint(data.right,'end',counter);
      id2List.push(counter);
      counter += 1;
      points.push(data.right);
    }
    if(data.hasOwnProperty('notch')){
      displayIdPoint(data.notch,null,counter);
      id2List.push(counter);
      counter += 1;
      points.push(data.notch);
    }
  }
  if(data.hasOwnProperty('neighbors')){
    $('#inputNeighbors').val(data.neighbors);
  }
  $('#initInfo').remove();
  info = $('<div id=initInfo>');
  info.hide();
  info.text(JSON.stringify(points));
  info.appendTo('body');
  idList = $('<div id=idList>');
  idList.hide();
  idList.text(JSON.stringify(id2List));
  idList.appendTo('body');
}

function getNetworkResult(gid){
  $.get( '/networkResult/'+gid, function( data ) {
    $('#networkImage').attr("src", data.url);
    $('#networkImage').css('width',$('#mainImage').width());
    $('#networkImage').css('height', $('#mainImage').height()); 
  });
}

function updateMainImage(gid){
  var url = '/image';
  if($('#findSimilar').is(':checked')){
    console.log('HIT');
    url = '/imageSimilar/'+gid;
  }
  $.post( "/image", function( data ) {
    $('#mileMarker').remove();
    $('body').append('<h4 id=mileMarker>'+(data.totalImages - data.imagesLeft) + ' Images of ' + data.totalImages + ' completed');
    if(data.FinallyDone){
      $('#container').append('<h1>No More Images Open</h1>');
      return;
    }
    getGradient(data.id);
    $('#mainImage').attr("src", data.image);
    $('#mainImage').attr("alt", data.id);
    $('#mainImage').css('width',data.dim2);
    $('#mainImage').css('height', data.dim1);
    initailizeData(data);
    getNetworkResult(data.id);
  });
}

function getNumberOfNeighbors(){
  var n_neighbors = $('#inputNeighbors').val();
  return parseInt(n_neighbors);
}

$(document).ready(function(e) {

  var defaultNeighbors = $('#inputNeighbors').val();
  //Set the size of container to size of image
  var overlay = $("<div class=topControl><div>").hide().appendTo("body");
  var annotationOffset = overlay.width()/2;
  overlay.remove();

  var type = SEAM;
  //Load first image for user
  updateMainImage();
  var linePoints = [];
  var linePath = [];

  var counter = 0;
  var id2List = [];

  var badPlaced = 0;
  var badLeftPoints = [];
  var badRightPoints = [];
  var badTopPoints = [];
  var badBottomPoints = [];
  var currentBadRegion = [];
  var placingBadRegion = false;

  var bottomPoints = [];
  var leftPoints = [];
  var rightPoints = [];

  var pointType = TOP;
  var topNeighbors = defaultNeighbors;
  var leftNeighbors = defaultNeighbors;
  var rightNeighbors = defaultNeighbors;
  var bottomNeighbors = defaultNeighbors;

  var topLines = [];
  var bottomLines = [];
  var leftLines = [];
  var rightLines = [];
  var currentLine = [];
  var makeLine = false;

  var labelingNotch = false;
  var notch = [];

  var ignoreLabel = [];
  var ignoredRegions = [];
  var labelIgnore = false;  


  var imageLoadCheck = setInterval(showIsLoaded, 500);
  
  function clearIgnoredRegions(){
    ignoreLabel = [];
    ignoredRegions = [];
    labelIgnore = false;
    $('.ignoreRegionPoint').remove();
    $('.ignoredRegion').remove();
  }  

  function showIsLoaded(){
    if($('#gradientInfo').length != 0){
      $('#makePath').attr('class', 'btn btn-primary');
      clearInterval(imageLoadCheck);
    }
  }
  function storeNeighbor(){
    var currentNeighborVal = $('#inputNeighbors').val();
    if(pointType == TOP){
      topNeighbors = currentNeighborVal;
    }
    else if(pointType == LEFT){
      leftNeighbors = currentNeighborVal;
    }
    else if(pointType == RIGHT){
      rightNeighbors = currentNeighborVal;
    }
    else if(pointType == BOTTOM){
      bottomNeighbors = currentNeighborVal;
    }
  }

  function changeType(label){
    storeNeighbor();
    pointType = label;
    if(pointType == TOP){
      $('#typeLeft').prop('checked', false);
      $('#typeRight').prop('checked', false);
      $('#typeBottom').prop('checked', false);
      $('#typeTop').prop('checked', true);
      $('#inputNeighbors').val(topNeighbors.toString());
    }
    else if(pointType == BOTTOM){
      $('#typeLeft').prop('checked', false);
      $('#typeRight').prop('checked', false);
      $('#typeBottom').prop('checked', true);
      $('#typeTop').prop('checked', false);
      $('#inputNeighbors').val(bottomNeighbors.toString());
    }
    else if(pointType == LEFT){
      $('#typeLeft').prop('checked', true);
      $('#typeRight').prop('checked', false);
      $('#typeBottom').prop('checked', false);
      $('#typeTop').prop('checked', false);
      $('#inputNeighbors').val(leftNeighbors.toString());
    }
    else if(pointType == RIGHT){
      $('#typeLeft').prop('checked', false);
      $('#typeRight').prop('checked', true);
      $('#typeBottom').prop('checked', false);
      $('#typeTop').prop('checked', false);
      $('#inputNeighbors').val(rightNeighbors.toString());
    }
  }

  function initInfo(){
    if($('#initInfo').length != 0) {
      linePoints = JSON.parse($('#initInfo').text());
      id2List = JSON.parse($('#idList').text());
      counter = id2List.length;
      $('#initInfo').remove();
      $('#idList').remove();
    }
  }

  function markNotch(){
    initInfo();
    if($('#notch').length != 0){
      $('#notch').removeAttr('id');
      notch = [];
    }
    if(linePoints.length > 2){
      labelingNotch = true;
      var points = JSON.parse(JSON.stringify(linePoints));
      points = points.sort(function(a,b){return a[0] - b[0]});
      var middle = points[Math.floor(points.length/2)];
      notch = middle;
      var offset = $('.displayed').offset();
      $('.topControl').each(function(){
        var val = floorPoint([$(this).offset().left - offset.left + annotationOffset, $(this).offset().top - offset.top + annotationOffset]);
        if(getDistance(val,middle) < DISTANCE_EPSILON ){
            $(this).attr('id', 'notch');
	          return;
        }
      });
    }
    else{
      alert('Need at least 2 points labeled to mark notch!');
      return;
    }
  }

  function resetBadRegions(){
    badPlaced = 0;
    badLeftPoints = [];
    badRightPoints = [];
    badTopPoints = [];
    badBottomPoints = [];
    currentBadRegion = [];
    currentBadRegion = [];
    placingBadRegion = false;
    $('.badTopRegion').remove();
    $('.badBottomRegion').remove();
    $('.badLeftRegion').remove();
    $('.badRightRegion').remove();
    $('.badRegionPoint').remove();
  }

  function resetBoundingLines(){
    makeLine = false;
    topLines = [];
    bottomLines = [];
    leftLines = [];
    rightLines = [];
    currentLine = [];
    $('.badLinePoint').remove();
    $('.badLineTPath').remove();
    $('.badLineLPath').remove();
    $('.badLineRPath').remove();
    $('.badLineBPath').remove();
  }

  function clearInfo(){
    linePoints = [];
    linePath = [];

    labelingNotch = false;
    notch = [];

    counter = 0;
    id2List = [];

    resetBadRegions();

    bottomPoints = [];
    leftPoints = [];
    rightPoints = [];
    
    clearIgnoredRegions();    

    resetBoundingLines();
    pointType = TOP;
    topNeighbors = defaultNeighbors;
    leftNeighbors = defaultNeighbors;
    rightNeighbors = defaultNeighbors;
    bottomNeighbors = defaultNeighbors;
    $('#pathtopInfo').remove();
    $('#pathleftInfo').remove();
    $('#pathrightInfo').remove();
    $('#pathbottomInfo').remove()
    $('#initInfo').remove();
    $('#idList').remove();
    $('.topControl').remove();
    $('.topPath').remove();
    $('.bottomPath').remove();
    $('.leftPath').remove();
    $('.rightPath').remove();
    $('.leftControl').remove();
    $('.rightControl').remove();
    $('.bottomControl').remove();
    $('#optionsRadios1').trigger('click');
    $('#typeLeft').prop('checked', false);
    $('#typeRight').prop('checked', false);
    $('#typeBottom').prop('checked', false);
    $('#typeTop').prop('checked', true);
    $('#manualSubmit').blur();
    $('#inputNeighbors').val(defaultNeighbors.toString());
    $('#notchSubmerged').attr('checked',false);
  }

  function sendInformation(){
    if(testing){
      alert('This feature is undergoing testing please try again after an update');
      return;
    }
    var updated = false;
    if($('#markBad').is(":checked")){
      var bad = confirm("Send Image as Marked Bad?");
      if(bad){
        var arr = { gid:$('#mainImage').attr("alt"),bad:true,done:false};
        $.ajax({
          url: '/path',
          type: 'POST',
          data: JSON.stringify(arr),
          contentType: 'application/json; charset=utf-8',
          dataType: 'json',
          async: true
        });
        updated = true;
      }
    }
    else{
      var n_neighbors = getNumberOfNeighbors();
      var done = $('#markDone').is(":checked");
      var notchSubmerged = $('#notchSubmerged').is(":checked");
      var submit = confirm("Are you sure you want to submit this?");
      if(submit){
        if($('#pathtopInfo').length == 0 || $('#pathleftInfo').length == 0 || $('#pathbottomInfo').length == 0 || $('#pathrightInfo').length == 0) {
          alert('Please Generate all Paths before submitting');
        }
        else if(notch.length == 0 && !notchSubmerged){
          alert('Please Label the notch before submitting');
        }
        else{
          sendPath(done,badTopPoints,badBottomPoints,badLeftPoints,badRightPoints, notch, notchSubmerged,ignoredRegions);
          updated = true;
        }
      }
    }
    if(updated){
      var gid = $('#mainImage').attr("alt");
      clearInfo();
      $('#markDone').attr('checked', false);
      $('#markBad').attr('checked',false);
      $('#notchSubmerged').attr('checked',false);
      $('#gradientInfo').remove();
      $('#makePath').attr('class', 'btn btn-danger');
      updateMainImage(gid);
      imageLoadCheck = setInterval(showIsLoaded, 500);
    }
  }

  function generatePath(){
    initInfo();

    if(linePoints.length >= 2){
      if($('#gradientInfo').length == 0){
        alert("Still loading data please wait to submit");
        return ;
      }
      var gid = $('#mainImage').attr("alt");
      var values = JSON.parse($('#gradientInfo').text());
      if(values.gid != gid){
         alert("Still loading data please wait to submit");
        return ;
      }
      var n_neighbors = getNumberOfNeighbors();
      var points  = JSON.parse(JSON.stringify(linePoints));
      points = points.sort(function(a,b){return a[0] - b[0]});

      var neighborAngle = Math.abs(Math.atan2(Math.floor(n_neighbors/2),1));
      if(pointType == LEFT){
        if(leftPoints.length == 0){
          alert("Please label the left points");
          return;
        }
        else{
          var lPoints = JSON.parse(JSON.stringify(leftPoints));
	        lPoints.push(points[0]);
          if(type == SEAM){
            var maxLeftAngle = getMaxAngle(lPoints, VERTICAL);
            if(maxLeftAngle > neighborAngle){
        	    alert("Slope of Plotted points exceeds neighbor range! Left");
          	  return;
       	    }
            setTimeout(find_seam_vertical(values.gradientX,lPoints,leftLines,n_neighbors,LEFT,ignoredRegions),0);
          }
          else{//MANUAL
            linePath = getLinearPath(lPoints);
            displayPath(linePath,LEFT,true);
            var pathData = {path:linePath,linePoints:lPoints,type:'manual'};
            pathData = JSON.stringify(pathData);
            //Removing previous data
            $('#pathleftInfo').remove();
            var info = $('<div id=pathleftInfo>');
            info.hide();
            info.text(pathData);
            info.appendTo('body');
          }
        }
      }

        else if(pointType == RIGHT){
          if(rightPoints.length == 0){
            alert("Please label the right points");
            return;
          }
          else{
            var rPoints = JSON.parse(JSON.stringify(rightPoints));
            rPoints.push(points[points.length -1]);
            if(type == SEAM){
              var maxRightAngle = getMaxAngle(rPoints,VERTICAL);
              if(maxRightAngle > neighborAngle){
                  alert("Slope of Plotted points exceeds neighbor range! Right");
                  return;
              }
              setTimeout(find_seam_vertical(values.gradientX,rPoints,rightLines,n_neighbors,RIGHT,ignoredRegions),0);
            }
            else{//MANUAL
              linePath = getLinearPath(rPoints);
              displayPath(linePath,RIGHT,true);
	            var pathData = {path:linePath,linePoints:rPoints,type:'manual'};
              pathData = JSON.stringify(pathData);
              //Removing previous data
              $('#pathrightInfo').remove();
              var info = $('<div id=pathrightInfo>');
              info.hide();
              info.text(pathData);
              info.appendTo('body');
            }
          }
        }
        else if(pointType == TOP){
          if(type == SEAM){
            var maxAngle = getMaxAngle(points,HORIZONTAL);
            if(maxAngle > neighborAngle){
              alert("Slope of Plotted points exceeds neighbor range! Top");
              return;
            }
            setTimeout(find_seam_horizontal(values.gradient,points, topLines,n_neighbors,TOP,ignoredRegions), 0 );
          }
          else{//MANUAL
            linePath = getLinearPath(points);
            displayPath(linePath,TOP,true);
            var pathData = {path:linePath,linePoints:points,type:'manual'};
            pathData = JSON.stringify(pathData);
            //Removing previous data
            $('#pathtopInfo').remove();
            var info = $('<div id=pathtopInfo>');
            info.hide();
            info.text(pathData);
            info.appendTo('body');
          }
        }
        else if(pointType == BOTTOM){
	        if(leftPoints.length == 0 && rightPoints.length == 0){
            alert("Please label the left and the right sides first!");
	          return;
          }
          var rPoints = JSON.parse(JSON.stringify(rightPoints));
    	    rPoints  = rPoints.sort(function(a,b){return a[1] - b[1]});
	        var lPoints = JSON.parse(JSON.stringify(leftPoints));
          lPoints  = lPoints.sort(function(a,b){return a[1] - b[1]});
          bPoints = JSON.parse(JSON.stringify(bottomPoints));
          bPoints.push(rPoints[rPoints.length - 1]);
          bPoints.push(lPoints[lPoints.length - 1]);
          if(type == SEAM){
            var maxAngle = getMaxAngle(bPoints,HORIZONTAL);
            if(maxAngle > neighborAngle){
              alert("Slope of Plotted points exceeds neighbor range! Bottom");
              return;
            }
            setTimeout(find_seam_horizontal(values.gradient,bPoints,bottomLines ,n_neighbors,BOTTOM,ignoredRegions), 0 );
          }
          else{//MANUAL
            linePath = getLinearPath(bPoints);
            displayPath(linePath,BOTTOM,true);
	    var pathData = {path:linePath,linePoints:bPoints,type:'manual'};
            pathData = JSON.stringify(pathData);
            //Removing previous data
            $('#pathbottomInfo').remove();
            var info = $('<div id=pathbottomInfo>');
            info.hide();
            info.text(pathData);
            info.appendTo('body');
          }
        }
      }
      else{
        alert("Please Label start and end points before submitting");
      }
  }

  function returnImage(){
    values = {gid:$('#mainImage').attr("alt")};
    $.ajax({
      url: '/checkout',
      type: 'POST',
      data: JSON.stringify(values),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      async: true
    });
  }

  function togglePath(){ 
    if(pointType == TOP){
      $('.topPath').toggle();
    }
    else if (pointType == BOTTOM) {
      $('.bottomPath').toggle();
    }
    else if (pointType == LEFT) {
      $('.leftPath').toggle();
    }
    else if (pointType == RIGHT){
      $('.rightPath').toggle();
    }
  }

  function undoPoint(){
    initInfo();
    if(id2List.length > 0){
      id = id2List[id2List.length-1];
      id2List.pop();
      classId = $("[id2="+id+"]").attr('class');
      if(classId == 'topControl'){
        linePoints.pop();
      }
      else if(classId == 'leftControl'){
        leftPoints.pop();
      }
      else if(classId == 'rightControl'){
        rightPoints.pop();
      }
      else if(classId == 'bottomControl'){
	      bottomPoints.pop();
      }
      if($("[id2="+id+"]").attr('id') == 'notch'){
        notch = [];
      }
      $("[id2="+id+"]").remove();
    }
  }

  $('img').on('dragstart', function(event) { event.preventDefault(); });

  $('#togglePath').click(function(e){
    e.preventDefault();
    togglePath();   
  });

  $('#optionsRadios1').click(function(e) {
    type = SEAM;
  });

  $('#optionsRadios2').click(function(e) {
    type = MANUAL;
  });

  $('#typeTop').click(function(e){
    changeType(TOP);
  });

  $('#typeLeft').click(function(e){
    changeType(LEFT);
  });

  $('#typeRight').click(function(e){
    changeType(RIGHT);
  });

  $('#typeBottom').click(function(e){
    changeType(BOTTOM);
  });

  $('#labelNotch').click(function(e){
    e.preventDefault();
    markNotch();
  });

  $(document).on('click','.topControl',function(e){
    if(labelingNotch){
      if($('#notch').length != 0){
        $('#notch').removeAttr('id');
      }
      var offset = $('.displayed').offset();
      var point = $(this).offset();
      var posX = point.left - offset.left;
      var posY =  point.top - offset.top;
      notch = floorPoint([posX,posY])
      $(this).attr('id','notch');
      labelingNotch = false;
    }
  });

  $('#badRegion').click(function(e) {
    e.preventDefault();
    placingBadRegion = true;
  });

  $('#toggleBadRegions').click(function(e){
    e.preventDefault();
    $('.badTopRegion').toggle();
    $('.badRightRegion').toggle();
    $('.badLeftRegion').toggle();
    $('.badBottomRegion').toggle();
  });

  $('#resetBadRegions').click(function(e){
    e.preventDefault();
    resetBadRegions();
  });

  $('#badLineMake').click(function(e){
    e.preventDefault();
    makeLine = true;
  });

  $('#clearBadLines').click(function(e){
    e.preventDefault();
    resetBoundingLines();
  });

  $('#undoPoint').click(function(e){
    e.preventDefault();
    undoPoint();
  });

  $('#resetState').click(function(e) {
    e.preventDefault();
    clearInfo();
  });

  $('#clearIgnoreRegion').click(function(e){
    e.preventDefault();
    clearIgnoredRegions();
  });

  $('#makeIgnoreRegion').click(function(e){
    e.preventDefault();
    labelIgnore = true;
  });

  $('.displayed').click(function(e) {
    var offset = $('.displayed').offset();
    initInfo();
    var posX = e.pageX - offset.left,posY = e.pageY - offset.top;
    var img;
    var add = true;
    var img = [];


    if(labelIgnore){
      if(ignoreLabel.length == 0){
        img = $('<div class=ignoreRegionPoint>');
        img.css('top', e.pageY-annotationOffset);
        img.css('left',e.pageX-annotationOffset);
        img.appendTo('#container');
        ignoreLabel.push(floorPoint([posX,posY])); 
      }
      else{
        labelIgnore = false;
        ignoreLabel.push(floorPoint([posX,posY]));
        var wide = Math.abs(ignoreLabel[1][0] - ignoreLabel[0][0]);
        var high = Math.abs(ignoreLabel[1][1] - ignoreLabel[0][1]);
        img = $('<div class=ignoredRegion>');
        img.css('top', ignoreLabel[0][1] + offset.top - annotationOffset);
        img.css('left', ignoreLabel[0][0] + offset.left - annotationOffset);
        img.width(wide);
        img.height(high);
        img.appendTo('#container');
        var corner = [Math.min(ignoreLabel[0][0],ignoreLabel[1][0]), Math.min(ignoreLabel[0][1],ignoreLabel[1][1])];
        var region = {point:corner,width:wide,height:high};
        ignoredRegions.push(region);
        ignoreLabel = [];
        $('.ignoreRegionPoint').remove(); 
      }
      return;
    }

    if(makeLine){
      img = $('<div class=badLinePoint>');
      img.css('top', e.pageY-annotationOffset);
      img.css('left',e.pageX-annotationOffset);
      img.appendTo('#container');
      currentLine.push(floorPoint([posX,posY]));
      if(currentLine.length == 2){
        //Classify, store pair, draw path
        makeLine = false;
        var path = getLinearPath(currentLine);
        if(pointType == TOP){
          topLines.push(currentLine);
          displayPath(path,'badLineT',false);
        }
        else if(pointType == LEFT){
          leftLines.push(currentLine);
          displayPath(path,'badLineL',false);
        }
        else if(pointType == RIGHT){
 	  rightLines.push(currentLine);
          displayPath(path,'badLineR',false);
        }
        else if(pointType == BOTTOM){
          bottomLines.push(currentLine);
          displayPath(path,'badLineB',false);
        }
        currentLine = [];
      }
      return;
    }

    if(placingBadRegion){
      if(badPlaced == 0){
        currentBadRegion.push(floorPoint([posX,posY]));
        img = $('<div class=badRegionPoint>');
        img.css('top', e.pageY-annotationOffset);
        img.css('left',e.pageX-annotationOffset);
        img.appendTo('#container');
        badPlaced = 1;
      }
      else{
        var path = [];
        var region = "";
        placingBadRegion = false;
        $('.badRegionPoint').remove();
        currentBadRegion.push(floorPoint([posX,posY]));
        if(pointType == TOP || pointType == BOTTOM){
          if(currentBadRegion[0][0] > currentBadRegion[1][0]){
	          var tmp = currentBadRegion[0];
            currentBadRegion[0] = currentBadRegion[1];
            currentBadRegion[1] = tmp;
          }
          if(pointType == TOP){
	          path = JSON.parse($('#pathtopInfo').text())['path'];
            region = "badTopRegion";
          }
          else{
            path = JSON.parse($('#pathbottomInfo').text())['path'];
	          region = "badBottomRegion";
          }
        }
        else if(pointType == LEFT || pointType == RIGHT){
	          if(currentBadRegion[0][1] > currentBadRegion[1][1]){
              var tmp = currentBadRegion[0];
              currentBadRegion[0] = currentBadRegion[1];
              currentBadRegion[1] = tmp;
	          }
          if(pointType == LEFT){
	          path = JSON.parse($('#pathleftInfo').text())['path'];
	          region = "badLeftRegion";
          }
          else{
	          path = JSON.parse($('#pathrightInfo').text())['path'];
	          region = "badRightRegion";
          }
        }
        for(var i = 0; i < path.length; i++){
          var change = false;
          if(pointType == TOP || pointType == BOTTOM){
            if(path[i][0] >= currentBadRegion[0][0] && path[i][0] <= currentBadRegion[1][0]){
	           	change = true;
                if(pointType == TOP){
                  badTopPoints.push(i);
                }
                else{
		              badBottomPoints.push(i);
		            }
            }
          }
          else if(pointType == LEFT || pointType == RIGHT){
	          if(path[i][1] >= currentBadRegion[0][1] && path[i][1] <= currentBadRegion[1][1]){
              change = true;
		          if(pointType == LEFT){
                badLeftPoints.push(i);
              }
              else{
                badLeftPoints.push(i);
              }
            }
          }
          if(change){
            img = $('<div class='+region+'>');
            img.css('top', offset.top + path[i][1]);
            img.css('left', path[i][0] + offset.left);
            img.appendTo('#container');
          }
        }
	      currentBadRegion = [];
        badPlaced = 0;
      }
      return;
    }
    if(pointType == TOP){
      img = $('<div class=topControl id2=' + counter  + '>');
      linePoints.push(floorPoint([posX,posY]));
    }
    else if(pointType == LEFT){
      img = $('<div class=leftControl id2=' + counter  + '>');
      leftPoints.push(floorPoint([posX,posY]));
    }
    else if(pointType == RIGHT){
      img = $('<div class=rightControl id2=' + counter  + '>');
      rightPoints.push(floorPoint([posX,posY]));
    }
    else{
      img = $('<div class=bottomControl id2=' + counter  + '>');
      bottomPoints.push(floorPoint([posX,posY]));
    }
    id2List.push(counter);
    counter += 1;
    img.css('top', e.pageY-annotationOffset);
    img.css('left',e.pageX-annotationOffset);
    img.appendTo('#container');
  });
  //Handler for keybindings
  $(document).keypress(function(e) {
    var input = e.which;
    //Spacebar for generate path
    if(input == 32) {
      e.preventDefault();
      generatePath();
    }//z for undo point
    else if(input == 122 || input== 90){
      undoPoint();
    }//Enter for send information
    else if(input == 13){
      e.preventDefault();
      sendInformation();
    }//q for mark notch
    else if(input == 81 || input == 113){
      markNotch();
    }//w for change mode to top
    else if(input == 87 || input == 119){
      changeType(TOP);
    }//a for change mode to left
    else if(input == 65 || input == 97){
      changeType(LEFT);
    }//s for change mode to bottom
    else if(input == 83 || input == 115){
      changeType(BOTTOM);
    }//d for change mode to right
    else if(input == 68 || input == 100){
      changeType(RIGHT);
    }//e to mark an image as done
    else if(input == 101 || input == 69){
      $('#markDone').trigger("click");
    }//r to make an image as bad
    else if(input == 114 || input == 82){
      $('#markBad').trigger("click");
    }//t to mark notch submerged
    else if(input == 116 || input == 84){
      $('#notchSubmerged').trigger("click");
    }
    else if(input == 70 || input == 102){
      togglePath();
    }
  });

  $('#makePath').click(function(e){
    e.preventDefault();
    generatePath();
  });

  $('#checkout').click(function(e){
    e.preventDefault();
    var checkout = confirm("Are you sure you want to sign out?");
    if(checkout){
      returnImage();
      $('#mainImage').remove();
      $('#networkImage').remove();
      clearInfo();
      $('.form-horizontal').remove();
      $('#container').append('<h2>Checked out</h2>');
    }
  });

  $('#skipImg').click(function(e){
    e.preventDefault();
    var gid = $('#mainImage').attr("alt");
    returnImage();
    clearInfo();
    $('#gradientInfo').remove();
    $('#markDone').attr('checked', false);
    $('#markBad').attr('checked',false);
    $('#notchSubmerged').attr('checked',false);
    $('#makePath').attr('class', 'btn btn-danger');
    $('#skipImg').blur();
    updateMainImage(gid);
    imageLoadCheck = setInterval(showIsLoaded, 500);
  });

  $('#manualSubmit').click(function(e){
    e.preventDefault();
    sendInformation();
  });
  //To warn user that they are leaving page so they sign out
  $(window).bind('beforeunload',function(){
    return 'are you sure you want to leave?';
  });
});
