$(function() {
  $.get('manifest.json').then(function(txt) {
    console.log(JSON.parse(txt).version);
    $('#version').html(JSON.parse(txt).version);
  });
});
