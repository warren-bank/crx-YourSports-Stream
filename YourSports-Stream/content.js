var payload = function(){
  var iframe_html = document.getElementById('player').outerHTML

  document.head.innerHTML = ''
  document.body.innerHTML = iframe_html
}

var inject_function = function(_function){
  var inline, script, head

  inline = document.createTextNode(
    '(' + _function.toString() + ')()'
  )

  script = document.createElement('script')
  script.appendChild(inline)

  head = document.head
  head.appendChild(script)
}

if (document.readyState === 'complete'){
  inject_function(payload)
}
else {
  document.addEventListener("DOMContentLoaded", function(event) {
    inject_function(payload)
  })
}
