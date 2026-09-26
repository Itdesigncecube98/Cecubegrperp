package com.cecube.dashboard;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class TripTrackingService extends Service {
    public static final String ACTION_START = "com.cecube.dashboard.START_TRIP_TRACKING";
    public static final String ACTION_STOP = "com.cecube.dashboard.STOP_TRIP_TRACKING";
    private static final String CHANNEL_ID = "trip_tracking";
    private LocationManager locationManager;
    private LocationListener locationListener;
    private String pingUrl;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopTracking();
            stopSelf();
            return START_NOT_STICKY;
        }
        if (intent != null && ACTION_START.equals(intent.getAction())) {
            pingUrl = intent.getStringExtra("pingUrl");
            startTracking();
        }
        return START_STICKY;
    }

    private void startTracking() {
        createNotificationChannel();
        startForeground(2001, buildNotification());
        if (pingUrl == null || ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) return;

        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        locationListener = location -> sendPing(location);
        locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 10000L, 10f, locationListener);
        locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 15000L, 25f, locationListener);
    }

    private void sendPing(Location location) {
        new Thread(() -> {
            try {
                HttpURLConnection connection = (HttpURLConnection) new URL(pingUrl).openConnection();
                connection.setRequestMethod("POST");
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                connection.setDoOutput(true);
                String body = "{\"latitude\":" + location.getLatitude() + ",\"longitude\":" + location.getLongitude() + "}";
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(body.getBytes(StandardCharsets.UTF_8));
                }
                connection.getResponseCode();
                connection.disconnect();
            } catch (Exception ignored) {
                // The next location update retries automatically.
            }
        }).start();
    }

    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Trip tracking active")
                .setContentText("Your live location is being tracked. You may close Recent Apps.")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Trip tracking", NotificationManager.IMPORTANCE_LOW);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private void stopTracking() {
        if (locationManager != null && locationListener != null) locationManager.removeUpdates(locationListener);
        locationListener = null;
        locationManager = null;
    }

    @Override
    public void onDestroy() {
        stopTracking();
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Keep the foreground service alive when the app is swiped from Recent Apps.
        super.onTaskRemoved(rootIntent);
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
