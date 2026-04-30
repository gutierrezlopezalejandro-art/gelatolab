import { Capacitor } from '@capacitor/core';

/**
 * Cross-platform print utility.
 * On native (Capacitor/iOS), uses an iframe approach since window.open is unreliable in WKWebView.
 * On web, uses the traditional window.open approach.
 */
export function printHtml(html, { width = 350, height = 500 } = {}) {
  if (Capacitor.isNativePlatform()) {
    // iOS / native: use hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
  } else {
    // Web: window.open
    const w = window.open('', '_blank', `width=${width},height=${height}`);
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }
}
