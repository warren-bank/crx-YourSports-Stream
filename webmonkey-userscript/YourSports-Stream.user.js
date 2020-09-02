// ==UserScript==
// @name         YourSports Stream
// @description  Watch videos in external player.
// @version      0.0.2
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
  try {
    const iFrame = unsafeWindow.document.querySelector('iframe#player')
    if (!iFrame) throw ''

    const iWin = iFrame.contentWindow
    if (!iWin) throw ''

    unsafeWindow = iWin
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
