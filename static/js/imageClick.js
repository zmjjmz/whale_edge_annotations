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

function getMaxAngle(points){
  points  = points.sort(function(a,b){return a[0] - b[0]});
  var maxAngle = 0;
  for(var i = 1; i < points.length; i++){
    diffY = points[i][1] - points[i-1][1];
    diffX =  points[i][0] - points[i-1][0];
    angle = Math.atan2(diffY,diffX)
    if(maxAngle < Math.abs(angle)){
	maxAngle = Math.abs(angle);
    }
  }
  return maxAngle;
}

function sendPath(path,type,start,end,linePoints, n_neighbors,done){
  var arr = { gid:$('#mainImage').attr("alt"),path: path, type: type,left:start,right:end,linePoints:linePoints,neighbors:n_neighbors,done:done, bad:false };
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
  var img = null;
  if(id == null){
    img = $('<div class=overlay id2='+id2.toString()+'>');
  }
  else{
    img = $('<div class=overlay id='+id+' id2='+id2.toString()+'>');
  }
  var offset = $('.displayed').offset();
  var posX = point[0] + offset.left;
  posY = point[1] + offset.top;
  img.css('top', posY);
  img.css('left',posX);
  img.appendTo('#container');
}


function displayPath(path,type){
  $('.'+type+'Path').remove();
  for(var i = 0; i < path.length; i++){
    var offset = $('.displayed').offset();
    var posX = path[i][0] + offset.left;
    posY = path[i][1] + offset.top;
    if(type == 'seam'){
      img = $('<div class=seamPath >');
    }
    else{
      img = $('<div class=manualPath >');
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
      for(var j = points[i-1][0]+1; j < points[i][0]; j++){
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

function find_seam(yGradient, start,end,linePoints, n_neighbors){
  if(n_neighbors % 2 != 1){
    alert("n_neighbors is not an odd number");
    return;
  }
  var neighbor_range = []
  for(var i = -1 * Math.floor(n_neighbors/2); i < 1 + Math.floor(n_neighbors/2); i++){
    neighbor_range.push(i);
  }
  for(var i = 0; i < linePoints.length; i++){
    yGradient = setPassThrough(yGradient, linePoints[i]);
  }
  var cost = zeros([yGradient.length, yGradient[0].length ])
  var back = zeros([yGradient.length, yGradient[0].length ])

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
  $('.overlay').remove();
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
  if(n_neighbors == ''){
    n_neighbors = $('#inputNeighbors').attr('placeholder');
  }
  return parseInt(n_neighbors);
}

function findNewStart(idList){
  var id = 0
  var x = $("[id2="+idList[0]+"]").position().left;
  for(var i = 1; i < idList.length; i++){
    if($("[id2="+idList[i]+"]").position().left < x){
	x = $("[id2="+idList[i]+"]").position().left;
	id = i;
    }
  }
  $("[id2="+idList[id]+"]").attr('id','start');
}

function findNewEnd(idList){
  var id = 0
  var x = $("[id2="+idList[0]+"]").position().left;
  for(var i = 1; i < idList.length; i++){
    if($("[id2="+idList[i]+"]").position().left > x){
	x = $("[id2="+idList[i]+"]").position().left;
	id = i;
    }
  }
  $("[id2="+idList[id]+"]").attr('id','end');
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
  var linePoints = [];
  var linePath = [];
  var counter = 0;
  var id2List = [];

  $('img').on('dragstart', function(event) { event.preventDefault(); });

  $('#togglePath').click(function(e){
    e.preventDefault();
    $('.'+type+'Path').toggle();
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
  
  function clearInfo(){
    linePoints = [];
    linePath = [];
    counter = 0;
    id2List = [];
    $('#pathInfo').remove();
    $('#initInfo').remove();
    $('#idList').remove();
    $('.overlay').remove();
    $('.seamPath').remove();
    $('.manualPath').remove();
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
      attr = $("[id2="+id+"]").attr('id');
      id2List.pop();
      linePoints.pop();
      $("[id2="+id+"]").remove();
      if(attr == 'start' && id2List.length > 0){
        findNewStart(id2List);	
      }
      else if(attr == 'end' && id2List.length > 1){
	findNewEnd(id2List);
      }
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
    if(linePoints.length == 0){
      img = $('<div class=overlay id=start id2=' + counter  + '>');
    }
    else if(linePoints.length == 1){
      img = $('<div class=overlay id=end id2=' + counter + '>');
    }
    else{
      if(e.pageX < $('#start').position().left){
        $('#start').removeAttr('id');
        img = $('<div class=overlay id=start id2=' + counter + '>');
      }
      else if(e.pageX > $('#end').position().left){
        $('#end').removeAttr('id');
        img = $('<div class=overlay id=end id2='+ counter + '>');
      }
      else{
        img = $('<div class=overlay id2='+ counter + '>');
      }
    }
    linePoints.push(floorPoint([posX,posY]));
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
    if(type == SEAM){
      if(linePoints.length >= 2){
        var points  = JSON.parse(JSON.stringify(linePoints));
        points = points.sort(function(a,b){return a[0] - b[0]});
        var maxAngle = getMaxAngle(points);
        var n_neighbors = getNumberOfNeighbors();
        var neighborAngle = Math.abs(Math.atan2(Math.floor(n_neighbors/2),1));
        if(maxAngle > neighborAngle){
	  alert("Slope of Plotted points exceeds neighbor range!");
	  return;
	}
        var gid = $('#mainImage').attr("alt");
        if($('#gradientInfo').length != 0){
          var values = JSON.parse($('#gradientInfo').text());
          if(values.gid != gid){
	    alert("Still loading data please wait to submit");
            return;
	  }
          setTimeout(find_seam(values.gradient, points[0],points[points.length-1],points, n_neighbors), 0 );
        }
        else{
          alert("Still loading data please wait to submit");
          return;
        }
      }
      else{
        alert("Please Label start and end points before submitting");
      }
    }
    else{//MANUAL
      linePath = getLinearPath(linePoints)
      displayPath(linePath,'manual')
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
    $('#inputNeighbors').val($('#inputNeighbors').attr('placeholder'));
    updateMainImage();
  });

  $('#manualSubmit').click(function(e){
    e.preventDefault();
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
      if(type == SEAM){
        if($('#pathInfo').length == 0) {
          alert('Please Generate the Path First');
        }
        else{
          path = JSON.parse($('#pathInfo').text());
          if(submit){
            points  = points.sort(function(a,b){return a[0] - b[0]});
            sendPath(path,'seam',points[0],points[points.length-1],linePoints, n_neighbors,done);
            updated = true;
          }
        }
      }
      else{
        if(linePath.length == 0){
          alert('Please Generate the Path First');
        }
        else{
          path = linePath;
          if(!endPoint){
            points  = points.sort(function(a,b){return a[0] - b[0]});
            startLocation = points[0];
            endLocation = points[points.length-1];
          }
          if(submit){
            sendPath(path,'manual',startLocation,endLocation,linePoints, n_neighbors,done);
            updated = true;
          }
        }
      }
    }
    if(updated){
      clearInfo();
      $('#markDone').attr('checked', false);
      $('#markBad').attr('checked',false);
      $('#inputNeighbors').val($('#inputNeighbors').attr('placeholder'));
      $('#gradientInfo').remove();
      updateMainImage();
    }
  });
  $(window).bind('beforeunload',function(){
    return 'are you sure you want to leave?';
  });
});
