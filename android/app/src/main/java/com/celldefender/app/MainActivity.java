package com.celldefender.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {
    private WebView webView;
    private static final String APP_VERSION = "1.0.0";
    private static final String GAME_URL = "file:///android_asset/www/index.html";
    private static final String UPDATE_URL = "https://api.github.com/repos/insushim/iwenglishdefen/releases/latest";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 풀스크린
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.setBackgroundColor(0xFF0D0A1A);

        webView.loadUrl(GAME_URL);

        // 업데이트 체크
        checkForUpdate();
    }

    private void checkForUpdate() {
        new Thread(() -> {
            try {
                URL url = new URL(UPDATE_URL);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(5000);

                BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream())
                );
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();

                JSONObject json = new JSONObject(sb.toString());
                String latestTag = json.optString("tag_name", "").replace("v", "");
                String downloadUrl = "";

                // APK 다운로드 URL 찾기
                var assets = json.optJSONArray("assets");
                if (assets != null) {
                    for (int i = 0; i < assets.length(); i++) {
                        var asset = assets.getJSONObject(i);
                        if (asset.getString("name").endsWith(".apk")) {
                            downloadUrl = asset.getString("browser_download_url");
                            break;
                        }
                    }
                }

                if (!latestTag.isEmpty() && !latestTag.equals(APP_VERSION)) {
                    final String dlUrl = downloadUrl;
                    runOnUiThread(() -> showUpdateDialog(latestTag, dlUrl));
                }
            } catch (Exception e) {
                // 업데이트 체크 실패 무시
            }
        }).start();
    }

    private void showUpdateDialog(String version, String downloadUrl) {
        new AlertDialog.Builder(this)
            .setTitle("업데이트 available")
            .setMessage("새 버전 v" + version + " 이 있습니다.\n업데이트하시겠습니까?")
            .setPositiveButton("업데이트", (d, w) -> {
                if (!downloadUrl.isEmpty()) {
                    android.content.Intent intent = new android.content.Intent(
                        android.content.Intent.ACTION_VIEW,
                        android.net.Uri.parse(downloadUrl)
                    );
                    startActivity(intent);
                }
            })
            .setNegativeButton("나중에", null)
            .show();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
