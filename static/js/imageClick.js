function updateModal(data){
  var modalData = $('#mainModalData');
  modalData.empty();
  var imageSrc = $('#mainImage').attr('src');
  var name = $('<p>');
  name.text(imageSrc);
  modalData.append(name);
  for(var i = 0; i < data.length; i++){
    var point = $('<p>');
    point.text(data[i]);
    modalData.append(point);
  }

}


$(document).ready(function(e) {

  //Set the size of container to size of image
  var overlay = $("<div class=overlay><div>").hide().appendTo("body");
  var annotationOffset = overlay.width()/2;
  overlay.remove();

  $('img').on('dragstart', function(event) { event.preventDefault(); });

  var data = [];

  $('.displayed').click(function(e) {
    var offset = $('.displayed').offset();
    var posX = e.pageX - offset.left,posY = e.pageY - offset.top;
     //var img = $('<img class=\'point\'>');
     var img = $('<div class=\'overlay\'>');
     //Have the -5 and +5 to adjust for dot size and center
     img.css('top', e.pageY-annotationOffset);
     img.css('left',e.pageX-annotationOffset);
     //img.attr('src', '/static/images/red_dot.png');
     img.appendTo('#container');
     point = [posX,posY];
     data.push(point);

  });

  $('#modalShow').click(function(e){
      updateModal(data);
      $('#TheModal').modal('show');
  });

});
