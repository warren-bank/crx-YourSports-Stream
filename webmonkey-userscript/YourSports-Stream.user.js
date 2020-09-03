// ==UserScript==
// @name         YourSports Stream
// @description  Watch videos in external player.
// @version      1.0.0
// @match        *://yoursports.stream/*
// @match        *://*.yoursports.stream/*
// @icon         http://yoursports.stream/favicon.ico
// @run-at       document-end
// @homepage     https://github.com/warren-bank/crx-YourSports-Stream/tree/webmonkey-userscript/es5
// @supportURL   https://github.com/warren-bank/crx-YourSports-Stream/issues
// @downloadURL  https://github.com/warren-bank/crx-YourSports-Stream/raw/webmonkey-userscript/es5/webmonkey-userscript/YourSports-Stream.user.js
// @updateURL    https://github.com/warren-bank/crx-YourSports-Stream/raw/webmonkey-userscript/es5/webmonkey-userscript/YourSports-Stream.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// =============================================================================
/*
 * page:   http://yoursports.stream/live?v=cnnnews
 * iframe: view-source:http://yoursports.stream/ing/cnn
 * source: var mustave = atob('base64 string...')
 *
 * page:   http://yoursports.stream/live?v=cbs
 * iframe: view-source:http://yoursports.stream/ing/cbs
 * source: var rbnhd = 'base64 string...';
 *         ...,'source':{'hls':atob(rbnhd)}
 */

var get_hls_url = function() {
  if (unsafeWindow.mustave)
    return unsafeWindow.mustave

  if (unsafeWindow.rbnhd)
    return atob(unsafeWindow.rbnhd)

  var hls_url = null

  try {
    var scripts
    scripts = unsafeWindow.document.querySelectorAll('script')
    scripts = Array.prototype.slice.call(scripts)
    scripts = scripts.map(function(script) {return script.innerText})

    var regexs  = [
      /\s*=\s*atob\('([^']+)'\)/,
      [
        /['"]source['"]\s*:\s*\{\s*['"]hls['"]\s*:\s*atob\(rbnhd\)\s*\}/,
        /var\s+rbnhd\s*=\s*['"]([^'"]+)['"]/
      ]
    ]

    var i, j, regex_test, regex_match, script, matches

    for (i=0; !hls_url && (i < regexs.length); i++) {
      if(regexs[i] instanceof RegExp) {
        regex_test  = regexs[i]
        regex_match = regexs[i]
      }
      else if (Array.isArray(regexs[i]) && (regexs[i].length === 2)) {
        regex_test  = regexs[i][0]
        regex_match = regexs[i][1]
      }

      for (j=0; !hls_url && (j < scripts.length); j++) {
        script = scripts[j]

        if (regex_test.test(script)) {
          matches = regex_match.exec(script)

          if ((matches !== null) && (matches.length >= 2)) {
            var base64 = matches[1]
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

// =============================================================================

var get_referer_url = function() {
  var referer_url
  try {
    referer_url = unsafeWindow.top.location.href
  }
  catch(e) {
    referer_url = unsafeWindow.location.href
  }
  return referer_url
}

// =============================================================================

var is_iframe_processed = false

var process_iframe = function() {
  if (is_iframe_processed) return true

  try {
    var iFrame = unsafeWindow.document.querySelector('iframe#player')
    if (!iFrame) throw ''

    var iWin = iFrame.contentWindow
    if (!iWin) throw ''

    unsafeWindow = iWin
    is_iframe_processed = true
    return true
  }
  catch(e) {
    return false
  }
}

// =============================================================================

var process_page = function(show_error) {
  var success = false

  if (process_iframe()) {
    var hls_url = get_hls_url()

    if (hls_url) {
      var extras = ['referUrl', get_referer_url()]

      var args = [
        'android.intent.action.VIEW',  /* action */
        hls_url,                       /* data   */
        'application/x-mpegurl'        /* type   */
      ]

      for (var i=0; i < extras.length; i++) {
        args.push(extras[i])
      }

      GM_startIntent.apply(this, args)
      success = true
    }
  }

  if (!success && show_error) {
    var url_path = unsafeWindow.location.pathname.toLowerCase()

    if ((url_path.indexOf('/live') === 0) || (url_path.indexOf('/ing/') === 0))
      GM_toastShort('video not found')
  }

  return success
}

// =============================================================================

var remove_unnecessary_DOM = function() {
  try {
    var $       = window.jQuery
    var $body   = $('body')
    var $iframe = $('iframe#player')

    if ($iframe.length === 1)
      $body.empty().append($iframe)
  }
  catch(e) {}
}

// =============================================================================

unsafeWindow.setTimeout(
  remove_unnecessary_DOM,
  5000
)

var count = 15

var timer = unsafeWindow.setInterval(
  function() {
    if (count <= 1) unsafeWindow.clearInterval(timer)
    if (count <= 0) return
    if (process_page((count === 1)))
      count = 0
    else
      count--
  },
  1000
)
