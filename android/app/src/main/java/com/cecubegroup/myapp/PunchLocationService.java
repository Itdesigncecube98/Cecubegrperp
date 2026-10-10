package com.cecubegroup.myapp;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PunchLocationService extends Service {
    static final String ACTION_START = "com.cecubegroup.myapp.START_PUNCH_LOCATION";
    static final String ACTION_STOP = "com.cecubegroup.myapp.STOP_PUNCH_LOCATION";
    private static final String TAG = "PunchLocationService";
    private static final String CHANNEL_ID = "punch_location_tracking";
    private static final String PREFS = "punch_location_tracking";
    private static final int NOTIFICATION_ID = 7314;
    private static final long UPDATE_INTERVAL_MS = 30_000L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();
    private LocationManager locationManager;
    private LocationListener locationListener;
    private String endpoint;
    private String cookie;
    private long lastSentAt;

    @Override
    public void onCreate() {
        super.onCreate();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopAndForget();
            return START_NOT_STICKY;
        }

        if (intent != null && ACTION_START.equals(intent.getAction())) {
            endpoint = intent.getStringExtra("endpoint");
            cookie = intent.getStringExtra("cookie");
            saveSession();
        } else if (intent == null) {
            SharedPreferences saved = getSharedPreferences(PREFS, MODE_PRIVATE);
            endpoint = saved.getString("endpoint", null);
            cookie = saved.getString("cookie", null);
        }

        if (endpoint == null || cookie == null || !hasLocationPermission()) {
            stopAndForget();
            return START_NOT_STICKY;
        }

        createNotificationChannel();
        startForeground(NOTIFICATION_ID, buildNotification());
        startLocationUpdates();
        return START_STICKY;
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void startLocationUpdates() {
        locationListener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                sendLocation(location);
            }
        };

        try {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED &&
                locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, UPDATE_INTERVAL_MS, 0, locationListener, Looper.getMainLooper());
                sendLocation(locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER));
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, UPDATE_INTERVAL_MS, 0, locationListener, Looper.getMainLooper());
                sendLocation(locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER));
            }
        } catch (SecurityException error) {
            Log.e(TAG, "Location permission was revoked during active tracking.", error);
            stopAndForget();
        }
    }

    private void sendLocation(Location location) {
        if (location == null || System.currentTimeMillis() - lastSentAt < UPDATE_INTERVAL_MS - 1_000L) return;
        lastSentAt = System.currentTimeMillis();
        networkExecutor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(endpoint).openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(15_000);
                connection.setReadTimeout(15_000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Cookie", cookie);
                JSONObject body = new JSONObject();
                body.put("latitude", location.getLatitude());
                body.put("longitude", location.getLongitude());
                body.put("accuracy", (double) location.getAccuracy());
                byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(payload);
                }

                int responseCode = connection.getResponseCode();
                if (responseCode == HttpURLConnection.HTTP_UNAUTHORIZED || responseCode == HttpURLConnection.HTTP_CONFLICT) {
                    handler.post(this::stopAndForget);
                } else if (responseCode < 200 || responseCode >= 300) {
                    Log.w(TAG, "Location update returned HTTP " + responseCode + "; will retry.");
                }
            } catch (Exception error) {
                Log.e(TAG, "Could not send a location update; a later GPS update will retry.", error);
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    private void saveSession() {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
            .putString("endpoint", endpoint)
            .putString("cookie", cookie)
            .apply();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Punch location tracking",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Shown while your live work punch location is being shared.");
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }

    private Notification buildNotification() {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = launchIntent == null ? null : PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        NotificationCompat.Builder notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("Work location sharing is active")
            .setContentText("Your live location is shared with HR until Punch Out.")
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW);
        if (pendingIntent != null) notification.setContentIntent(pendingIntent);
        return notification.build();
    }

    private void stopAndForget() {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().clear().apply();
        if (locationManager != null && locationListener != null) {
            try {
                locationManager.removeUpdates(locationListener);
            } catch (SecurityException error) {
                Log.w(TAG, "Could not remove the location listener after permission changed.", error);
            }
        }
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        if (locationManager != null && locationListener != null) {
            try {
                locationManager.removeUpdates(locationListener);
            } catch (SecurityException error) {
                Log.w(TAG, "Location permission changed while stopping the service.", error);
            }
        }
        networkExecutor.shutdownNow();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
