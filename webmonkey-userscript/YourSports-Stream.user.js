// ==UserScript==
// @name         YourSports Stream
// @description  Watch videos in external player.
// @version      0.0.1
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

const get_hls_url = () => {
  if (unsafeWindow.mustave)
    return unsafeWindow.mustave

  let hls_url = null

  try {
    const regex   = /\s*=\s*atob\('([^']+)'\)/
    const scripts = [...unsafeWindow.document.querySelectorAll('script')]
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

const process_iframe = () => {
  let iframe = unsafeWindow.document.querySelector('iframe#player')
  if (iframe)
    iframe = iframe.getAttribute('src')
  if (iframe)
    unsafeWindow.location = iframe
}

// =============================================================================

const process_page = () => {
  const hls_url = get_hls_url()

  if (hls_url) {
    const extras = ['referUrl', get_referer_url()]

    GM_startIntent(/* action= */ 'android.intent.action.VIEW', /* data= */ hls_url, /* type= */ 'application/x-mpegurl', /* extras: */ ...extras);
  }
  else {
    process_iframe()
  }
}

// =============================================================================

process_page()
