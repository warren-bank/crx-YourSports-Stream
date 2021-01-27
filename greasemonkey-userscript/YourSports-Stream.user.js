// ==UserScript==
// @name         YourSports Stream
// @description  Removes clutter to reduce CPU load. Can transfer video stream to alternate video players: WebCast-Reloaded, ExoAirPlayer.
// @version      0.4.2
// @match        *://yoursports.stream/*
// @match        *://*.yoursports.stream/*
// @match        *://findsports.stream/ustv.php*
// @match        *://*.findsports.stream/ustv.php*
// @icon         http://yoursports.stream/favicon.ico
// @run-at       document-idle
// @homepage     https://github.com/warren-bank/crx-YourSports-Stream/tree/greasemonkey-userscript
// @supportURL   https://github.com/warren-bank/crx-YourSports-Stream/issues
// @downloadURL  https://github.com/warren-bank/crx-YourSports-Stream/raw/greasemonkey-userscript/greasemonkey-userscript/YourSports-Stream.user.js
// @updateURL    https://github.com/warren-bank/crx-YourSports-Stream/raw/greasemonkey-userscript/greasemonkey-userscript/YourSports-Stream.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// https://www.chromium.org/developers/design-documents/user-scripts

var user_options = {
  "script_injection_delay_ms":    500,
  "redirect_to_webcast_reloaded": true,
  "force_http":                   true,
  "force_https":                  false
}

var payload = function(){
  const path  = window.location.pathname + window.location.search
  const regex = {
    iframe_holder: /^\/live(?:\.php)?\?v=/i,
    iframe_page:   /^\/(?:ing\/|ustv\.php)/i
  }

  if (regex.iframe_holder.test(path)) {
    let iframe_html = document.getElementById('player').outerHTML

    document.head.innerHTML = ''
    document.body.innerHTML = iframe_html
  }
  else if (regex.iframe_page.test(path)) {

    // optionally, transfer video stream to alternate player
    if (window.redirect_to_webcast_reloaded) {
      const get_raw_hls_url = function(){
        if (window.mustave) return window.mustave

        const regex   = /\s*=\s*atob\('([^']+)'\)/
        const scripts = [...document.querySelectorAll('script')]
        let hls_url   = null
        let script, txt, matches

        while (!hls_url && scripts.length) {
          script  = scripts.shift()
          txt     = script.innerText
          matches = regex.exec(txt)

          if ((matches !== null) && (matches.length >= 2)) {
            let base64 = matches[1]
            hls_url = atob(base64)
          }
        }

        return hls_url
      }

      const get_hls_url = function(){
        let hls_url = get_raw_hls_url()

        if (hls_url && (hls_url[0] === '/')) {
          hls_url = window.location.protocol + '//' + window.location.host + hls_url
        }

        return hls_url
      }

      const get_referer_url = function() {
        let referer_url
        try {
          referer_url = top.location.href
        }
        catch(e) {
          referer_url = window.location.href
        }
        return referer_url
      }

      const get_webcast_reloaded_url = (hls_url, vtt_url, referer_url) => {
        let encoded_hls_url, encoded_vtt_url, encoded_referer_url, webcast_reloaded_base, webcast_reloaded_url

        encoded_hls_url       = encodeURIComponent(encodeURIComponent(btoa(hls_url)))
        encoded_vtt_url       = vtt_url ? encodeURIComponent(encodeURIComponent(btoa(vtt_url))) : null
        referer_url           = referer_url ? referer_url : get_referer_url()
        encoded_referer_url   = encodeURIComponent(encodeURIComponent(btoa(referer_url)))

        webcast_reloaded_base = {
          "https": "https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html",
          "http":  "http://webcast-reloaded.surge.sh/index.html"
        }

        webcast_reloaded_base = (window.force_http)
                                  ? webcast_reloaded_base.http
                                  : (window.force_https)
                                     ? webcast_reloaded_base.https
                                     : (hls_url.toLowerCase().indexOf('http:') === 0)
                                        ? webcast_reloaded_base.http
                                        : webcast_reloaded_base.https

        webcast_reloaded_url  = webcast_reloaded_base + '#/watch/' + encoded_hls_url + (encoded_vtt_url ? ('/subtitle/' + encoded_vtt_url) : '') + '/referer/' + encoded_referer_url
        return webcast_reloaded_url
      }

      const redirect_to_url = function(url) {
        if (!url) return

        try {
          top.location = url
        }
        catch(e) {
          window.location = url
        }
      }

      const process_video_url = (hls_url) => {
        if (hls_url && window.redirect_to_webcast_reloaded) {
          // transfer video stream

          redirect_to_url(get_webcast_reloaded_url(hls_url))
        }
      }

      process_video_url(get_hls_url())
    }
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

var get_hash_code = function(str){
  var hash, i, char
  hash = 0
  if (str.length == 0) {
    return hash
  }
  for (i = 0; i < str.length; i++) {
    char = str.charCodeAt(i)
    hash = ((hash<<5)-hash)+char
    hash = hash & hash  // Convert to 32bit integer
  }
  return Math.abs(hash)
}

var inject_function = function(_function){
  var inline, script, head

  inline = _function.toString()
  inline = '(' + inline + ')()' + '; //# sourceURL=crx_extension.' + get_hash_code(inline)
  inline = document.createTextNode(inline)

  script = document.createElement('script')
  script.appendChild(inline)

  head = document.head
  head.appendChild(script)
}

var inject_options = function(){
  var _function = `function(){
    window.redirect_to_webcast_reloaded = ${user_options['redirect_to_webcast_reloaded']}
    window.force_http                   = ${user_options['force_http']}
    window.force_https                  = ${user_options['force_https']}
  }`
  inject_function(_function)
}

var bootstrap = function(){
  inject_options()
  inject_function(payload)
}

setTimeout(
  bootstrap,
  user_options['script_injection_delay_ms']
)
