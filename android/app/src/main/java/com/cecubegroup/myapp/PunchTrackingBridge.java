package com.cecubegroup.myapp;

import android.net.Uri;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

public class PunchTrackingBridge {
    private final MainActivity activity;

    PunchTrackingBridge(MainActivity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void startPunchTracking() {
        activity.runOnUiThread(() -> {
            WebView webView = activity.getBridge().getWebView();
            String pageUrl = webView.getUrl();
            Uri pageUri = Uri.parse(pageUrl == null ? "" : pageUrl);
            if (!"https".equalsIgnoreCase(pageUri.getScheme()) ||
                !"cecubeerp.duckdns.org".equalsIgnoreCase(pageUri.getHost())) {
                reportError("Secure app connection is required for background location tracking.");
                return;
            }

            String cookie = CookieManager.getInstance().getCookie(pageUrl);
            if (cookie == null || !cookie.contains("cecube_session=")) {
                reportError("Your secure app session is unavailable. Please sign in again.");
                return;
            }

            String endpoint = pageUri.getScheme() + "://" + pageUri.getAuthority() + "/api/attendance/live-location";
            activity.requestPunchLocationTracking(endpoint, cookie);
        });
    }

    @JavascriptInterface
    public void stopPunchTracking() {
        activity.runOnUiThread(activity::stopPunchLocationTracking);
    }

    private void reportError(String message) {
        String jsonMessage = org.json.JSONObject.quote(message);
        activity.getBridge().getWebView().evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('punch-location-tracking-error',{detail:" + jsonMessage + "}))",
            null
        );
    }
}
