// ==UserScript==
// @name         YourSports Stream
// @description  Removes clutter and reduces CPU load.
// @version      0.3.0
// @match        *://yoursports.stream/*
// @icon         http://yoursports.stream/favicon.ico
// @run-at       document-idle
// @homepage     https://github.com/warren-bank/crx-YourSports-Stream
// @supportURL   https://github.com/warren-bank/crx-YourSports-Stream/issues
// @downloadURL  https://github.com/warren-bank/crx-YourSports-Stream/raw/greasemonkey-userscript/greasemonkey-userscript/YourSports-Stream.user.js
// @updateURL    https://github.com/warren-bank/crx-YourSports-Stream/raw/greasemonkey-userscript/greasemonkey-userscript/YourSports-Stream.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// https://www.chromium.org/developers/design-documents/user-scripts

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
  else if (path === '/') {
    setTimeout(() => {
      const list = window.document.body.classList
      if (list.contains('pace-running')) {
        list.replace('pace-running', 'pace-done')
      }
    }, 7500)
  }
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
