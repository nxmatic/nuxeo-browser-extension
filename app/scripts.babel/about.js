$.ajax({
  method: 'GET',
  url: 'manifest.json',
  dataType: 'json',
  mimeType: 'application/json',
  success: function(data){
    console.log(data.version);
    $('#version').html(data.version);
  }
});