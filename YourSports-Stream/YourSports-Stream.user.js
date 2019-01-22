// ==UserScript==
// @name YourSports Stream
// @description Removes clutter and reduces CPU load.
// @version 0.1.0
// @match *://yoursports.stream/live.php?v=*
// @icon http://yoursports.stream/favicon.ico
// ==/UserScript==

// https://www.chromium.org/developers/design-documents/user-scripts

var payload = function(){
  var iframe_html = document.getElementById('player').outerHTML

  document.head.innerHTML = ''
  document.body.innerHTML = iframe_html
}

var inject_payload = function(){
  var inline, script, head

  inline = document.createTextNode(
    '(' + payload.toString() + ')()'
  )

  script = document.createElement('script')
  script.appendChild(inline)

  head = document.getElementsByTagName('head')[0]
  head.appendChild(script)
}

if (document.readyState === 'complete'){
  inject_payload()
}
else {
  document.onreadystatechange = function(){
    if (document.readyState === 'complete'){
      inject_payload()
    }
  }
}
