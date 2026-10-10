package com.cecubegroup.myapp;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int PUNCH_LOCATION_PERMISSION_REQUEST = 7402;
    private String pendingLocationEndpoint;
    private String pendingLocationCookie;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getBridge().getWebView().addJavascriptInterface(new PunchTrackingBridge(this), "AndroidPunchTracking");
    }

    public void requestPunchLocationTracking(String endpoint, String cookie) {
        pendingLocationEndpoint = endpoint;
        pendingLocationCookie = cookie;

        boolean hasLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean hasNotifications = Build.VERSION.SDK_INT < 33 ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        if (hasLocation && hasNotifications) {
            startPunchLocationService();
            return;
        }

        String[] permissions;
        if (Build.VERSION.SDK_INT >= 33) {
            permissions = new String[] {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.POST_NOTIFICATIONS
            };
        } else {
            permissions = new String[] {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            };
        }
        ActivityCompat.requestPermissions(this, permissions, PUNCH_LOCATION_PERMISSION_REQUEST);
    }

    public void stopPunchLocationTracking() {
        Intent intent = new Intent(this, PunchLocationService.class);
        intent.setAction(PunchLocationService.ACTION_STOP);
        startService(intent);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != PUNCH_LOCATION_PERMISSION_REQUEST) return;

        boolean hasLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean hasNotifications = Build.VERSION.SDK_INT < 33 ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        if (hasLocation && hasNotifications && pendingLocationEndpoint != null && pendingLocationCookie != null) {
            startPunchLocationService();
        } else {
            reportPunchLocationError("Location and notification permissions are required while Punch In location sharing is active.");
        }
        pendingLocationEndpoint = null;
        pendingLocationCookie = null;
    }

    private void startPunchLocationService() {
        if (pendingLocationEndpoint == null || pendingLocationCookie == null) return;
        Intent intent = new Intent(this, PunchLocationService.class);
        intent.setAction(PunchLocationService.ACTION_START);
        intent.putExtra("endpoint", pendingLocationEndpoint);
        intent.putExtra("cookie", pendingLocationCookie);
        ContextCompat.startForegroundService(this, intent);
    }

    private void reportPunchLocationError(String message) {
        if (getBridge() == null) return;
        String jsonMessage = org.json.JSONObject.quote(message);
        getBridge().getWebView().evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('punch-location-tracking-error',{detail:" + jsonMessage + "}))",
            null
        );
    }
}
