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
      updateModal(data);
      $('#TheModal').modal('show');
  });
  
  $('#submitData').click(function(e){
      if(startPoint && endPoint){
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
      }
      else{
      	alert("Please Label start and end points before submitting");
      }
  });

});
