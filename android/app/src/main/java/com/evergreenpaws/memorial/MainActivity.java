package com.evergreenpaws.memorial;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private static final int FILE_CHOOSER_REQ = 1001;
    private static final String LIVE_URL = "https://littlewinnerstep-us.github.io/Babychloe/";
    private static final String LOCAL_FALLBACK_URL = "file:///android_asset/index.html?apk=1";
    private WebView web;
    private ValueCallback<Uri[]> filePathCallback;
    private boolean fellBack = false;

    @SuppressWarnings("deprecation")
    private void applyApkFullscreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        View decor = getWindow().getDecorView();
        decor.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyApkFullscreen();

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setUserAgentString(s.getUserAgentString() + " EvergreenPawsAPK/1");

        web.setWebViewClient(new WebViewClient() {
            private void triggerFallback(WebView view) {
                if (!fellBack) {
                    fellBack = true;
                    view.loadUrl(LOCAL_FALLBACK_URL);
                }
            }

            @Override
            public void onReceivedError(
                    WebView view,
                    WebResourceRequest request,
                    WebResourceError error) {
                if (Build.VERSION.SDK_INT >= 21
                        && request != null
                        && request.isForMainFrame()
                        && request.getUrl() != null
                        && request.getUrl().toString().startsWith(LIVE_URL)) {
                    triggerFallback(view);
                }
            }

            @Override
            @SuppressWarnings("deprecation")
            public void onReceivedError(
                    WebView view,
                    int errorCode,
                    String description,
                    String failingUrl) {
                if (failingUrl != null && failingUrl.startsWith(LIVE_URL)) {
                    triggerFallback(view);
                }
            }

            @Override
            public void onReceivedHttpError(
                    WebView view,
                    WebResourceRequest request,
                    WebResourceResponse errorResponse) {
                if (Build.VERSION.SDK_INT >= 21
                        && request != null
                        && request.isForMainFrame()
                        && request.getUrl() != null
                        && request.getUrl().toString().startsWith(LIVE_URL)
                        && errorResponse != null
                        && errorResponse.getStatusCode() >= 400) {
                    triggerFallback(view);
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams fileChooserParams) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                String mimeType = "image/*";
                String chooserTitle = "Choose Pet Photo";
                if (fileChooserParams != null && fileChooserParams.getAcceptTypes() != null) {
                    for (String t : fileChooserParams.getAcceptTypes()) {
                        if (t != null && t.contains("audio")) {
                            mimeType = "audio/*";
                            chooserTitle = "Choose Background Music";
                            break;
                        }
                    }
                }
                intent.setType(mimeType);
                try {
                    startActivityForResult(
                            Intent.createChooser(intent, chooserTitle),
                            FILE_CHOOSER_REQ);
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
                return true;
            }
        });
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.loadUrl(LIVE_URL + "?apk=1&t=" + System.currentTimeMillis());
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyApkFullscreen();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQ && filePathCallback != null) {
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.evaluateJavascript(
                "window.__evergreenSetAppForeground&&window.__evergreenSetAppForeground(false)",
                null);
        web.onPause();
        web.pauseTimers();
    }

    @Override
    protected void onResume() {
        super.onResume();
        applyApkFullscreen();
        web.onResume();
        web.resumeTimers();
        web.evaluateJavascript(
                "window.__evergreenSetAppForeground&&window.__evergreenSetAppForeground(true)",
                null);
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}
