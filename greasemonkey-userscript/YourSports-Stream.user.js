// ==UserScript==
// @name         YourSports Stream
// @description  Removes clutter to reduce CPU load. Can transfer video stream to alternate video players: WebCast-Reloaded, ExoAirPlayer.
// @version      0.4.3
// @match        *://yoursports.stream/*
// @match        *://*.yoursports.stream/*
// @match        *://yrsprts.stream/*
// @match        *://*.yrsprts.stream/*
// @match        *://findsports.stream/*
// @match        *://*.findsports.stream/*
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

// =============================================================================
/*
 * page:   http://yoursports.stream/live?v=cnnnews
 * iframe: view-source:http://yoursports.stream/ing/cnnnews
 * source: var mustave = atob('base64 string...')
 *
 * page:   http://yoursports.stream/live?v=cbs
 * iframe: view-source:http://yoursports.stream/ing/cbs
 * source: var rbnhd = 'base64 string...';
 *         ...,'source':{'hls':atob(rbnhd)}
 *
 * page:   http://yoursports.stream/live?v=espn
 * iframe: view-source:http://yoursports.stream/ing/espn
 * iframe: view-source:http://eu-33.findsports.stream/ustv.php?ch=espn
 * source: var mustave = atob('base64 string...')
 */

// =============================================================================
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
    script_parsers: [
      /\s*=\s*atob\('([^']+)'\)/,
      [
        /['"]source['"]\s*:\s*\{\s*['"]hls['"]\s*:\s*atob\(rbnhd\)\s*\}/,
        /var\s+rbnhd\s*=\s*['"]([^'"]+)['"]/
      ]
    ],
    url_parsers: {
      path_pre:  /^https?:\/\/[^\/]+/i,
      path_post: /[^\/]+$/,
      host_pre:  /^https?:\/\//i,
      is_base64: /^[-a-zA-Z0-9+/]+={0,3}$/
    },
    iframes: {
      holder: /^\/live(?:\.php)?\?v=/i,
      pages:  /^\/(?:ing\/|ustv\.php)/i
    }
  }

  if (regex.iframes.holder.test(path)) {
    let iframe_html = document.getElementById('player').outerHTML

    document.head.innerHTML = ''
    document.body.innerHTML = iframe_html
  }
  else if (regex.iframes.pages.test(path)) {

    // optionally, transfer video stream to alternate player
    if (window.redirect_to_webcast_reloaded) {

      const resolve_url = (url, determine_sameorigin) => {
        if (regex.url_parsers.is_base64.test(url))
          url = atob(url)

        const resolved = {
          href: url,
          path: null
        }

        if (determine_sameorigin)
          resolved.sameorigin = true

        if (regex.url_parsers.path_pre.test(resolved.href)) {
          // url includes protocol and host
          resolved.path = resolved.href.replace(regex.url_parsers.path_pre, '')

          if (determine_sameorigin)
            resolved.sameorigin = (url.toLowerCase().replace(regex.url_parsers.host_pre, '').indexOf( window.location.host.toLowerCase() ) === 0)
        }
        else if (resolved.href[0] === '/') {
          // url is an absolute path
          resolved.path = resolved.href
          resolved.href = window.location.protocol + '//' + window.location.host + resolved.path
        }
        else {
          // url is a relative path
          resolved.path = window.location.pathname.replace(regex.url_parsers.path_post, '') + resolved.href
          resolved.href = window.location.protocol + '//' + window.location.host + resolved.path
        }

        return resolved
      }

      const get_hls_url = () => {
        if (window.mustave)
          return window.mustave

        if (window.rbnhd)
          return window.rbnhd

        let hls_url = null

        try {
          const scripts = [...window.document.querySelectorAll('script')].map(script => script.innerText)

          let i, j, regex_test, regex_match, script, matches

          for (i=0; !hls_url && (i < regex.script_parsers.length); i++) {
            if(regex.script_parsers[i] instanceof RegExp) {
              regex_test  = regex.script_parsers[i]
              regex_match = regex.script_parsers[i]
            }
            else if (Array.isArray(regex.script_parsers[i]) && (regex.script_parsers[i].length === 2)) {
              regex_test  = regex.script_parsers[i][0]
              regex_match = regex.script_parsers[i][1]
            }

            for (j=0; !hls_url && (j < scripts.length); j++) {
              script = scripts[j]

              if (regex_test.test(script)) {
                matches = regex_match.exec(script)

                if ((matches !== null) && (matches.length >= 2)) {
                  let base64 = matches[1]
                  hls_url = atob(base64)
                }
              }
            }
          }
        }
        catch(e) {
          hls_url = null
        }

        return hls_url
      }

      const get_webcast_reloaded_url = (hls_url, vtt_url, referer_url) => {
        let encoded_hls_url, encoded_vtt_url, encoded_referer_url, webcast_reloaded_base, webcast_reloaded_url

        encoded_hls_url       = encodeURIComponent(encodeURIComponent(btoa(hls_url)))
        encoded_vtt_url       = vtt_url ? encodeURIComponent(encodeURIComponent(btoa(vtt_url))) : null
        referer_url           = referer_url ? referer_url : window.location.href
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
        if (hls_url) {
          const resolved = resolve_url(hls_url)

          // transfer video stream
          redirect_to_url(get_webcast_reloaded_url( resolved.href ))
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
