var payload = function(){
  const path  = window.location.pathname + window.location.search
  const regex = {
    iframe_holder: /^\/live(?:\.php)?\?v=/i,
    iframe_page:   /^\/ing\//i
  }

  if (regex.iframe_holder.test(path)) {
    let iframe_html = document.getElementById('player').outerHTML

    document.head.innerHTML = ''
    document.body.innerHTML = iframe_html
  }
  else if (regex.iframe_page.test(path)) {
    let iframe_holder = document.getElementById('player')

    try {
      ;[...iframe_holder.children].forEach(el => {
        if (! el.hasAttribute('data-player')) el.remove()
      })

      // ================
      // DOMException: play() failed because the user didn't interact with the document first
      // ================
      // iframe_holder.querySelector(':scope > [data-player] .player-poster.clickable').click()
    }
    catch(error){}
  }
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
