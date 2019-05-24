$(document).ready(e => {
  $('.col.label').each((i, elt) => {
    var div = $(elt);
    div.addClass('col-4 col-md-3');
  });
  $('.col.value').each((i, elt) => {
    var div = $(elt);
    div.addClass('col-8 col-md-9');
  });
});
