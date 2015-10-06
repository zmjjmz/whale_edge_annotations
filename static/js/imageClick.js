function zeros(dimensions){
  var array = [];
  for (var i = 0; i < dimensions[0]; ++i) {
        array.push(dimensions.length == 1 ? 0 : zeros(dimensions.slice(1)));
    }

    return array;
}

function setPassThrough(array, pt){
  for(var i = 0; i < array.length; i++){
    array[i][pt[0]] = Number.NEGATIVE_INFINITY;
  }
  array[pt[1]][pt[0]] = 0;
}

function getCost(row, col, i, gradient_y_image, cost){
  if(row + i < 0 || row+1 >= array.length){
    return Number.NEGATIVE_INFINITY;
  }
  else{
    return cost[row+i][col-1] + gradient_y_image[row,col];
  }
}

function getCandidates(row, col, gradient_y_image, cost, neighbor_range){
  var candidates = [];
  for(i in neighbor_range){
    candidates.push(getCost(row,col,i,gradient_y_image,cost))
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

function find_seam(yGradient, start,end, n_neighbors){
  alert("STARTING");
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
  //TODO be able to pick additional points
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
    path_cost += cost[curr_y,col];
    path.append(curr_y);
    next_ = curr_y + back[curr_y,col];
    curr_y = next_;
  }
  alert("DONE");
  return path;
}

function updateModal(data){
  var modalData = $('#mainModalData');
  modalData.empty();
  for(var i = 0; i < data.length; i++){
    var point = $('<p>');
    point.text(data[i]);
    modalData.append(point);
  }
}

function updateMainImage(){
    $.post( "/image", function( data ) {
      $('#mainImage').attr("src", data.image);
      $('#mainImage').attr("alt", data.id);
      yGradient = data.imgSrc
      $('#mainImage').css('width',yGradient[0].length)
      $('#mainImage').css('height', yGradient.length)
    });
}


$(document).ready(function(e) {

  //Set the size of container to size of image
  var overlay = $("<div class=overlay><div>").hide().appendTo("body");
  var annotationOffset = overlay.width()/2;
  overlay.remove();
  //Load first image for user
  updateMainImage();

  $('img').on('dragstart', function(event) { event.preventDefault(); });
  var Ptdata = [];
  var yGradient = false;
  var startPoint = false;
  var startLocaiton;
  var endPoint = false;
  var endLocaiton;
  var imageData;
  var path = false;
  $('.displayed').click(function(e) {
    var offset = $('.displayed').offset();
    var posX = e.pageX - offset.left,posY = e.pageY - offset.top;
    var img;
    if(!startPoint){
        img = $('<div class=\'overlay\' id=\'start\'>');
        startPoint = true;
        startLocation = [posX,posY];
    }
    else if(!endPoint){
        img = $('<div class=\'overlay\' id=\'end\'>');
        endPoint = true;
        endLocation = [posX,posY];
    }
    else{
        img = $('<div class=\'overlay\' id=\'other\'>');
        point = [posX,posY];
        Ptdata.push(point);
    }
    img.css('top', e.pageY-annotationOffset);
    img.css('left',e.pageX-annotationOffset);
    img.appendTo('#container');

  });

  $('#modalShow').click(function(e){
      updateModal(Ptdata);
      $('#TheModal').modal('show');
  });

  $('#submitData').click(function(e){
      if(startPoint && endPoint){

        setTimeout( path = find_seam(yGradient, startLocaiton,endLocaiton, 3), 0 );

        /*
      	var toSubmit = {'id':$('#mainImage').attr("alt"), 'points':Ptdata};
      	Ptdata = [];
        startPoint = false;
        endPoint = false;
      	$( ".overlay" ).remove();
      	$.ajax({
		type: 'POST',
    		contentType: 'application/json',
    		url: '/path',
    		dataType : 'json',
    		data : JSON.stringify(toSubmit),
    		complete : function(result) {

              }
        });
        */
      }
      else{
      	alert("Please Label start and end points before submitting");
      }
  });

});
