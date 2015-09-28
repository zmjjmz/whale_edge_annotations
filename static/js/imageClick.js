
$(document).ready(function(e) {

  //Set the size of container to size of image

  $('img').on('dragstart', function(event) { event.preventDefault(); });

  $('.displayed').click(function(e) {
    var posX = $(this).position().left,posY = $(this).position().top;
     var img = $('<img class=\'point\'>');
     //Have the -5 and +5 to adjust for dot size and center
     img.css('top', e.pageY-5);
     img.css('left', e.pageX-5 );
     img.attr('src', '/static/images/red_dot.png');
     img.appendTo('#container');


  });

});
