package com.cecube.dashboard;

import android.Manifest;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;
import android.content.Intent;
import android.os.Build;

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
		getBridge().getWebView().addJavascriptInterface(new TripTrackingBridge(), "AndroidTripTracking");
		requestLocationPermission();
		requestNotificationPermission();
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

	private void requestNotificationPermission() {
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
				ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
			ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1002);
		}
	}

	private class TripTrackingBridge {
		@JavascriptInterface
		public void startTrip(String pingUrl) {
			Intent intent = new Intent(MainActivity.this, TripTrackingService.class);
			intent.setAction(TripTrackingService.ACTION_START);
			intent.putExtra("pingUrl", pingUrl);
			if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(intent);
			else startService(intent);
		}

		@JavascriptInterface
		public void stopTrip() {
			Intent intent = new Intent(MainActivity.this, TripTrackingService.class);
			intent.setAction(TripTrackingService.ACTION_STOP);
			startService(intent);
		}
	}

}
