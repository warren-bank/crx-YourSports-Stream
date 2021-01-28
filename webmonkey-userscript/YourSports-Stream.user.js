// ==UserScript==
// @name         YourSports Stream
// @description  Watch videos in external player.
// @version      2.0.0
// @match        *://yoursports.stream/*
// @match        *://*.yoursports.stream/*
// @match        *://yrsprts.stream/*
// @match        *://*.yrsprts.stream/*
// @match        *://findsports.stream/*
// @match        *://*.findsports.stream/*
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
    follow_path: /^\/(?:ing\/|ustv\.php)/i
  }
}

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
      resolved.sameorigin = (url.toLowerCase().replace(regex.url_parsers.host_pre, '').indexOf( unsafeWindow.location.host.toLowerCase() ) === 0)
  }
  else if (resolved.href[0] === '/') {
    // url is an absolute path
    resolved.path = resolved.href
    resolved.href = unsafeWindow.location.protocol + '//' + unsafeWindow.location.host + resolved.path
  }
  else {
    // url is a relative path
    resolved.path = unsafeWindow.location.pathname.replace(regex.url_parsers.path_post, '') + resolved.href
    resolved.href = unsafeWindow.location.protocol + '//' + unsafeWindow.location.host + resolved.path
  }

  return resolved
}

const get_hls_url = () => {
  if (unsafeWindow.mustave)
    return unsafeWindow.mustave

  if (unsafeWindow.rbnhd)
    return unsafeWindow.rbnhd

  let hls_url = null

  try {
    const scripts = [...unsafeWindow.document.querySelectorAll('script')].map(script => script.innerText)

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

// =============================================================================

const tunnel_into_iframe_window = (iFrame) => {
  if (iFrame.contentWindow.document)
    unsafeWindow = iFrame.contentWindow
}

const redirect_to_iframe = (resolved) => {
  const urlFrame  = resolved.href
  const urlParent = unsafeWindow.location.href
  GM_loadUrl(urlFrame, 'Referer', urlParent)
}

const process_iframe = () => {
  const iFrames = [...unsafeWindow.document.querySelectorAll('iframe')]
  if (!iFrames.length) return false

  let iFrame, urlFrame, resolved
  for (let i=0; i < iFrames.length; i++) {
    iFrame   = iFrames[i]
    urlFrame = iFrame.getAttribute('src')

    if (urlFrame) {
      resolved = resolve_url(urlFrame)

      if (regex.iframes.follow_path.test(resolved.path)) {
        try {
          tunnel_into_iframe_window(iFrame)
          return true
        }
        catch(e) {
          redirect_to_iframe(resolved)
          return false
        }
      }
    }
  }

  return false
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

const process_page = (show_error) => {
  while (process_iframe()) {}

  let success = false

  if (!success) {
    const hls_url = get_hls_url()

    if (hls_url) {
      const resolved = resolve_url(hls_url)
      const extras   = ['referUrl', unsafeWindow.location.href]

      GM_startIntent(/* action= */ 'android.intent.action.VIEW', /* data= */ resolved.href, /* type= */ 'application/x-mpegurl', /* extras: */ ...extras);
      success = true
    }
  }

  if (!success && show_error) {
    const url_path = unsafeWindow.location.pathname.toLowerCase()

    if (url_path.indexOf('/live') === 0) {
      remove_unnecessary_DOM()
      GM_toastShort('video not found')
    }
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