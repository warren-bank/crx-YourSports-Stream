// ==UserScript==
// @name         YourSports Stream
// @description  Watch videos in external player.
// @version      1.0.0
// @match        *://yoursports.stream/*
// @match        *://*.yoursports.stream/*
// @icon         http://yoursports.stream/favicon.ico
// @run-at       document-end
// @homepage     https://github.com/warren-bank/crx-YourSports-Stream/tree/webmonkey-userscript/es6
// @supportURL   https://github.com/warren-bank/crx-YourSports-Stream/issues
// @downloadURL  https://github.com/warren-bank/crx-YourSports-Stream/raw/webmonkey-userscript/es6/webmonkey-userscript/YourSports-Stream.user.js
// @updateURL    https://github.com/warren-bank/crx-YourSports-Stream/raw/webmonkey-userscript/es6/webmonkey-userscript/YourSports-Stream.user.js
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

const get_hls_url = () => {
  if (unsafeWindow.mustave)
    return unsafeWindow.mustave

  if (unsafeWindow.rbnhd)
    return atob(unsafeWindow.rbnhd)

  let hls_url = null

  try {
    const scripts = [...unsafeWindow.document.querySelectorAll('script')].map(script => script.innerText)

    const regexs  = [
      /\s*=\s*atob\('([^']+)'\)/,
      [
        /['"]source['"]\s*:\s*\{\s*['"]hls['"]\s*:\s*atob\(rbnhd\)\s*\}/,
        /var\s+rbnhd\s*=\s*['"]([^'"]+)['"]/
      ]
    ]

    let i, j, regex_test, regex_match, script, matches

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

// =============================================================================

const get_referer_url = () => {
  let referer_url
  try {
    referer_url = unsafeWindow.top.location.href
  }
  catch(e) {
    referer_url = unsafeWindow.location.href
  }
  return referer_url
}

// =============================================================================

let is_iframe_processed = false

const process_iframe = () => {
  if (is_iframe_processed) return true

  try {
    const iFrame = unsafeWindow.document.querySelector('iframe#player')
    if (!iFrame) throw ''

    const iWin = iFrame.contentWindow
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

const process_page = (show_error) => {
  let success = false

  if (process_iframe()) {
    const hls_url = get_hls_url()

    if (hls_url) {
      const extras = ['referUrl', get_referer_url()]

      GM_startIntent(/* action= */ 'android.intent.action.VIEW', /* data= */ hls_url, /* type= */ 'application/x-mpegurl', /* extras: */ ...extras);
      success = true
    }
  }

  if (!success && show_error) {
    const url_path = unsafeWindow.location.pathname.toLowerCase()

    if ((url_path.indexOf('/live') === 0) || (url_path.indexOf('/ing/') === 0))
      GM_toastShort('video not found')
  }

  return success
}

// =============================================================================

const remove_unnecessary_DOM = () => {
  try {
    const $       = window.jQuery
    const $body   = $('body')
    const $iframe = $('iframe#player')

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

let count = 15

let timer = unsafeWindow.setInterval(
  () => {
    if (count <= 1) unsafeWindow.clearInterval(timer)
    if (count <= 0) return
    if (process_page((count === 1)))
      count = 0
    else
      count--
  },
  1000
)
