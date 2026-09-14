package com.cecube.dashboard;

import android.Manifest;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
	private static final int LOCATION_PERMISSION_REQUEST = 1001;

	@Override
	public void onCreate(@Nullable Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		configureWebViewLocation();
		requestLocationPermission();
	}

	private void configureWebViewLocation() {
		WebView webView = getBridge().getWebView();
		webView.getSettings().setJavaScriptEnabled(true);
		webView.getSettings().setGeolocationEnabled(true);
		webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
			@Override
			public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
				callback.invoke(origin, true, false);
			}
		});
	}

	private void requestLocationPermission() {
		boolean fineGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
				== android.content.pm.PackageManager.PERMISSION_GRANTED;
		boolean coarseGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
				== android.content.pm.PackageManager.PERMISSION_GRANTED;

		if (!fineGranted && !coarseGranted) {
			ActivityCompat.requestPermissions(
					this,
					new String[]{
							Manifest.permission.ACCESS_FINE_LOCATION,
							Manifest.permission.ACCESS_COARSE_LOCATION
					},
					LOCATION_PERMISSION_REQUEST
			);
		}
	}

}
