$(document).ready(e => {
  const iconClasses = 'fas fa-info-circle';
  $('i.help, i.help-simple').each((i, tag) => {
    $(tag).addClass(iconClasses);
  });
  $('i.help-simple').each((i, tag) => {
    let elt = $(tag);
    elt.attr('data-trigger', 'hover')
       .addClass('help')
       .popover();
  });

  function temperature() {
    let form = $('<form>' +
                 '<input type="number" width="5" name="c" />' +
                 '<button type="submit"><i class="fas fa-calculator"></i></button>' +
                 '</form>');
    form.on('submit', e => {
      e.preventDefault();
      let c = parseInt(form.find('input[name=c]').val().trim());
      let f = '';
      if (!isNaN(c))
        $('input[name=temperature]').val((32 + c * 1.8).toFixed());
      form.closest('.popover').popover('hide');
    });
    let div = $('<div></div>');
    div.append('<p>Ambient temperature in Farenheiht at which the motor was used; the box below converts from Celcius</p>');
    div.append(form);
    return div;
  }
  $('i.help-temp').addClass(iconClasses)
                  .popover({
                    content: temperature,
                    html: true,
                    trigger: 'manual',
                  }).on("mouseenter", function () {
                    let icon = this;
                    $(this).popover("show");
                    $(".popover").on("mouseleave", function () {
                      console.log("leave");
                      $(icon).popover('hide');
                    });
                  }).on("mouseleave", function () {
                    let icon = this;
                    setTimeout(function () {
                      if (!$(".popover:hover").length)
                        $(icon).popover("hide");
                    }, 100);
                  });
});
