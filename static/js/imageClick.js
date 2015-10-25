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

function getMaxAngle(points,orientation){
  if(orientation == 'vertical'){
    points  = points.sort(function(a,b){return a[1] - b[1]});
  }
  else{
    points  = points.sort(function(a,b){return a[0] - b[0]});
  }
  var maxAngle = 0;
  for(var i = 1; i < points.length; i++){
    diffY = points[i][1] - points[i-1][1];
    diffX =  points[i][0] - points[i-1][0];
    angle = Math.atan2(diffY,diffX)
    if(orientation == 'vertical'){
      angle = Math.atan2(diffX,diffY);
    }
    if(maxAngle < Math.abs(angle)){
	maxAngle = Math.abs(angle);
    }
  }
  return maxAngle;
}


function isLeftPoint(lowerLeft, lowerRight, point){
  var leftDistance = Math.sqrt(Math.pow(lowerLeft[0]-point[0],2) + Math.pow(lowerLeft[1]-point[1],2));
  var rightDistance = Math.sqrt(Math.pow(lowerRight[0]-point[0],2) + Math.pow(lowerRight[1]-point[1],2));
  return leftDistance < rightDistance;
}

function sendPath(done, badTopPoints,badBottomPoints,badLeftPoints,badRightPoints){
  var topInfo = path = JSON.parse($('#pathtopInfo').text());
  topInfo['badPoints'] = badTopPoints;   
  var arr = { gid:$('#mainImage').attr("alt"),done:done, bad:false, topInfo:topInfo };
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
  return;
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

function lineAdjustment(gradient,path,type){
  if(type == 'top'){
    for(var i = 0; i < path.length; i++){
      var point = path[i];
      for(var j = point[1]; j < gradient.length; j++){
        gradient[j][point[0]] = Number.NEGATIVE_INFINITY;
      }
    }
  }
  else if(type == 'bottom'){
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
  else if(type == 'right'){
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
  if(side == 'bottom'){
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
  if(side == 'left'){
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
    if(orientation == 'horizontal'){
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

function find_seam_vertical(gradient,linePoints,lines,n_neighbors,side){
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
  var cost = zeros([gradient.length, gradient[0].length ])
  var back = zeros([gradient.length, gradient[0].length ])

  for(var row = start[1]; row < end[1] + 1; row++){
    for(var col = 0; col < gradient[0].length; col++){
      candidates = getCandidates(row, col, gradient, cost, neighbor_range,'vertical',side);
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

function find_seam_horizontal(yGradient,linePoints,lines ,n_neighbors,side){
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
  var cost = zeros([yGradient.length, yGradient[0].length ])
  var back = zeros([yGradient.length, yGradient[0].length ])

  for(var col = start[0]; col < end[0] + 1; col++){
    for(var row = 0; row < yGradient.length; row++){
      candidates = getCandidates(row, col, yGradient, cost, neighbor_range,'horizontal',side);
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
    if(data.hasOwnProperty('left')){
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

function updateMainImage(){
  $('.topControl').remove();
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
  });
}

function getNumberOfNeighbors(){
  var n_neighbors = $('#inputNeighbors').val();
  return parseInt(n_neighbors);
}

$(document).ready(function(e) {
  var SEAM = "seam";
  var MANUAL = "manual";
  var type = SEAM;
  var testing = false;
  //Set the size of container to size of image
  var overlay = $("<div class=topControl><div>").hide().appendTo("body");
  var annotationOffset = overlay.width()/2;
  overlay.remove();
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
  
  var labelTop = true;
  var labelLeft = false;
  var labelRight = false;
  var labelBottom = false;
  var pointType = 'top';
  var topLines = [];
  var bottomLines = [];
  var leftLines = [];
  var rightLines = [];
  var currentLine = [];
  var makeLine = false;

  $('img').on('dragstart', function(event) { event.preventDefault(); });

  $('#togglePath').click(function(e){
    e.preventDefault();
    if(labelTop){
      $('.topPath').toggle();
    }
    else if (labelBottom) {
      $('.bottomPath').toggle();
    }
    else if (labelLeft) {
      $('.leftPath').toggle();
    }
    else if (labelRight){
      $('.rightPath').toggle();
    } 
  });

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

  $('#typeTop').click(function(e){
    labelTop = true;
    labelLeft = false;
    labelRight = false;
    labelBottom = false;
    pointType = 'top';
  });

  $('#typeLeft').click(function(e){
    labelTop = false;
    labelLeft = true;
    labelRight = false;
    labelBottom = false;
    pointType = 'left';
  });

  $('#typeRight').click(function(e){
    labelTop = false;
    labelLeft = false;
    labelRight = true;
    labelBottom = false;
    pointType = 'right';
  });
  
  $('#typeBottom').click(function(e){
    labelTop = false;
    labelLeft = false;
    labelRight = false;
    labelBottom = true;
    pointType = 'bottom';
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
  });

  $('#badLineMake').click(function(e){
    e.preventDefault();
    makeLine = true;
  }); 
  
  $('#clearBadLines').click(function(e){
    e.preventDefault();
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
  });

  function clearInfo(){
    linePoints = [];
    linePath = [];

    counter = 0;
    id2List = [];

    badPlaced = 0;
    badLeftPoints = [];
    badRightPoints = [];
    badTopPoints = [];
    badBottomPoints = [];
    currentBadRegion = [];
    placingBadRegion = false;

    bottomPoints = [];
    leftPoints = [];
    rightPoints = [];

    topLines = [];
    bottomLines = [];
    leftLines = [];
    rightLines = [];
    currentLine = [];
    makeLine = false;
    pointType = 'top';
    labelTop = true;
    labelLeft = false;
    labelRight = false;
    labelBottom = false;
    $('#pathtopInfo').remove();
    $('#pathleftInfo').remove();
    $('#pathrightInfo').remove();
    $('#pathbottomInfo').remove()
    $('#initInfo').remove();
    $('#idList').remove();
    $('.topControl').remove();
    $('.topPath').remove();
    $('.bottomPath').remove();
    $('.manualPath').remove();
    $('.badTopRegion').remove();
    $('.badBottomRegion').remove();
    $('.badLeftRegion').remove();
    $('.badRightRegion').remove();
    $('.badRegionPoint').remove();
    $('.leftPath').remove();
    $('.rightPath').remove();
    $('.leftControl').remove();
    $('.rightControl').remove();
    $('.bottomControl').remove();
    $('#optionsRadios2').prop('checked',false);
    $('#optionsRadios1').prop('checked',true);
    $('#typeLeft').prop('checked', false);
    $('#typeRight').prop('checked', false);
    $('#typeBottom').prop('checked', false);
    $('#typeTop').prop('checked', true);
    $('.badLinePoint').remove();
    $('.badLineTPath').remove();
    $('.badLineLPath').remove();
    $('.badLineRPath').remove();
    $('.badLineBPath').remove();
  }

  $('#undoPoint').click(function(e){
    e.preventDefault();
    if($('#initInfo').length != 0) {
      linePoints = JSON.parse($('#initInfo').text());
      id2List = JSON.parse($('#idList').text());
      counter = id2List.length;
      $('#initInfo').remove();
      $('#idList').remove();
    }
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
      $("[id2="+id+"]").remove();
    }
  });

  $('#resetState').click(function(e) {
    e.preventDefault();
    clearInfo();
  });

  $('.displayed').click(function(e) {
    var offset = $('.displayed').offset();
    if($('#initInfo').length != 0) {
      linePoints = JSON.parse($('#initInfo').text());
      id2List = JSON.parse($('#idList').text());
      counter = id2List.length;
      $('#initInfo').remove();
      $('#idList').remove();
    }
    var posX = e.pageX - offset.left,posY = e.pageY - offset.top;
    var img;
    var add = true;
    var img = [];

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
        if(labelTop){
          topLines.push(currentLine);
          displayPath(path,'badLineT',false);
        }
        else if(labelLeft){
          leftLines.push(currentLine);
          displayPath(path,'badLineL',false);
        }
        else if(labelRight){
 	  rightLines.push(currentLine); 
          displayPath(path,'badLineR',false);
        }
        else if(labelBottom){
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
        if(labelTop || labelBottom){
          if(currentBadRegion[0][0] > currentBadRegion[1][0]){
	    var tmp = currentBadRegion[0];
            currentBadRegion[0] = currentBadRegion[1];
            currentBadRegion[1] = tmp;
          }
          if(labelTop){
	    path = JSON.parse($('#pathtopInfo').text())['path'];
            region = "badTopRegion";
          }
          else{
            path = JSON.parse($('#pathbottomInfo').text())['path'];
	    region = "badBottomRegion";
          }
        }
        else if(labelLeft || labelRight){
	  if(currentBadRegion[0][1] > currentBadRegion[1][1]){
            var tmp = currentBadRegion[0];
            currentBadRegion[0] = currentBadRegion[1];
            currentBadRegion[1] = tmp;
	  }
          if(labelLeft){
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
          if(labelTop || labelBottom){
            if(path[i][0] >= currentBadRegion[0][0] && path[i][0] <= currentBadRegion[1][0]){
		change = true;
                if(labelTop){
                  badTopPoints.push(path[i]);
                }
                else{
		  badBottomPoints.push(path[i]);
		}
            }
          }
          else if(labelLeft || labelRight){
	    if(path[i][1] >= currentBadRegion[0][1] && path[i][1] <= currentBadRegion[1][1]){
                change = true;
		if(labelLeft){
                  badLeftPoints.push(path[i]);
                }
                else{
                  badLeftPoints.push(path[i]);
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
    if(labelTop){
      img = $('<div class=topControl id2=' + counter  + '>'); 
      linePoints.push(floorPoint([posX,posY]));
    }
    else if(labelLeft){
      img = $('<div class=leftControl id2=' + counter  + '>');           
      leftPoints.push(floorPoint([posX,posY]));
    }
    else if(labelRight){
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

  function generatePath(){
    if($('#initInfo').length != 0) {
      linePoints = JSON.parse($('#initInfo').text());
      id2List = JSON.parse($('#idList').text());
      counter = idList.length;
      $('#initInfo').remove();
      $('#idList').remove();
    }

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
      if(labelLeft){
        if(leftPoints.length == 0){
          alert("Please label the left points");
          return;
        }
        else{
          var lPoints = JSON.parse(JSON.stringify(leftPoints));
	  lPoints.push(points[0]);
          if(type == SEAM){
            var maxLeftAngle = getMaxAngle(lPoints, 'vertical');
            if(maxLeftAngle > neighborAngle){
        	alert("Slope of Plotted points exceeds neighbor range! Left");
          	return;
       	    }
            setTimeout(find_seam_vertical(values.gradientX,lPoints,leftLines,n_neighbors,'left'),0);
          }
          else{//MANUAL
            linePath = getLinearPath(lPoints);
            displayPath(linePath,'left',true);
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

        else if(labelRight){
          if(rightPoints.length == 0){
            alert("Please label the right points");
            return;
          }
          else{
            var rPoints = JSON.parse(JSON.stringify(rightPoints));
            rPoints.push(points[points.length -1]);
            if(type == SEAM){
              var maxRightAngle = getMaxAngle(rPoints,'vertical');
              if(maxRightAngle > neighborAngle){
                  alert("Slope of Plotted points exceeds neighbor range! Right");
                  return;
              }
              setTimeout(find_seam_vertical(values.gradientX,rPoints,rightLines,n_neighbors,'right'),0);
            }
            else{//MANUAL
              linePath = getLinearPath(rPoints);
              displayPath(linePath,'right',true);
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
        else if(labelTop){
          if(type == SEAM){
            var maxAngle = getMaxAngle(points,'horizontal');
            if(maxAngle > neighborAngle){
              alert("Slope of Plotted points exceeds neighbor range! Top");
              return;
            }
            setTimeout(find_seam_horizontal(values.gradient,points, topLines,n_neighbors,'top'), 0 );
          }
          else{//MANUAL
            linePath = getLinearPath(points);
            displayPath(linePath,'top',true);
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
        else if(labelBottom){
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
            var maxAngle = getMaxAngle(bPoints,'horizontal');
            if(maxAngle > neighborAngle){
              alert("Slope of Plotted points exceeds neighbor range! Bottom");
              return;
            }
            setTimeout(find_seam_horizontal(values.gradient,bPoints,bottomLines ,n_neighbors,'bottom'), 0 );
          }
          else{//MANUAL
            linePath = getLinearPath(bPoints);
            displayPath(linePath,'bottom',true);
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

  $(document).keypress(function(e) {
    if(e.which == 13) {
      e.preventDefault();
      generatePath();
    }
  });

  $('#makePath').click(function(e){
    e.preventDefault();
    generatePath();
  });

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

  $('#checkout').click(function(e){
    e.preventDefault();
    var checkout = confirm("Are you sure you want to sign out?");
    if(checkout){
      returnImage();
      $('#mainImage').remove();
      clearInfo();
      $('#container').append('<h2>Checked out</h2>');
    }
  });

  $('#skipImg').click(function(e){
    e.preventDefault();
    returnImage();
    clearInfo();
    $('#gradientInfo').remove();
    $('#markDone').attr('checked', false);
    $('#markBad').attr('checked',false);
    $('#inputNeighbors').val('5');
    updateMainImage();
  });

  $('#manualSubmit').click(function(e){
    e.preventDefault();
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
      var submit = confirm("Are you sure you want to submit this?");
      var points = JSON.parse(JSON.stringify(linePoints));
        if($('#pathtopInfo').length == 0) {
          alert('Please Generate the Top Path First');
        }
        else{
          if(submit){
            sendPath(done,badTopPoints,badBottomPoints,badLeftPoints,badRightPoints);
            updated = true;
          }
        }
    }
    if(updated){
      clearInfo();
      $('#markDone').attr('checked', false);
      $('#markBad').attr('checked',false);
      $('#inputNeighbors').val('5');
      $('#gradientInfo').remove();
      updateMainImage();
    }
  });
  $(window).bind('beforeunload',function(){
    return 'are you sure you want to leave?';
  });
});
