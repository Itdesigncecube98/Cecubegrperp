package com.cecube.dashboard;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PunchTrackingService extends Service {
    public static final String ACTION_START = "com.cecube.dashboard.START_PUNCH_TRACKING";
    public static final String ACTION_STOP = "com.cecube.dashboard.STOP_PUNCH_TRACKING";

    private static final String TAG = "PunchTrackingService";
    private static final String CHANNEL_ID = "attendance_tracking";
    private static final int NOTIFICATION_ID = 2002;
    private static final int MAX_QUEUED_POINTS = 2000;
    private static final int MAX_POINTS_PER_UPLOAD = 100;
    private static final long STATUS_CHECK_INTERVAL_MS = 20000L;
    private static final String PREFS_NAME = "punch_tracking";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Runnable statusPoll = new Runnable() {
        @Override
        public void run() {
            executor.execute(PunchTrackingService.this::checkPunchStatus);
            handler.postDelayed(this, STATUS_CHECK_INTERVAL_MS);
        }
    };

    private LocationManager locationManager;
    private LocationListener locationListener;
    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private PowerManager.WakeLock wakeLock;
    private String employeeId;
    private String baseUrl;
    private String cookie;
    private String attendanceDate;
    private boolean tracking;
    private boolean stopped;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        connectivityManager = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        registerNetworkCallback();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopService();
            return START_NOT_STICKY;
        }

        SharedPreferences preferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        if (intent != null && ACTION_START.equals(intent.getAction())) {
            employeeId = intent.getStringExtra("employeeId");
            baseUrl = intent.getStringExtra("baseUrl");
            cookie = intent.getStringExtra("cookie");
            String storedEmployeeId = preferences.getString("employeeId", null);
            if (storedEmployeeId != null && !storedEmployeeId.equals(employeeId)) {
                clearQueuedPoints();
            }
            preferences.edit()
                    .putString("employeeId", employeeId)
                    .putString("baseUrl", baseUrl)
                    .putString("cookie", cookie)
                    .apply();
        } else {
            employeeId = preferences.getString("employeeId", null);
            baseUrl = preferences.getString("baseUrl", null);
            cookie = preferences.getString("cookie", null);
        }

        if (employeeId == null || baseUrl == null || cookie == null || cookie.isEmpty()) {
            stopSelf();
            return START_NOT_STICKY;
        }

        stopped = false;
        startForeground(NOTIFICATION_ID, buildNotification());
        handler.removeCallbacks(statusPoll);
        handler.post(statusPoll);
        return START_STICKY;
    }

    private void registerNetworkCallback() {
        if (connectivityManager == null) return;
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(Network network) {
                executor.execute(() -> {
                    checkPunchStatus();
                    if (tracking) flushQueuedPoints();
                });
            }

            @Override
            public void onCapabilitiesChanged(Network network, NetworkCapabilities capabilities) {
                if (capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)) {
                    executor.execute(() -> {
                        checkPunchStatus();
                        if (tracking) flushQueuedPoints();
                    });
                }
            }
        };
        try {
            connectivityManager.registerDefaultNetworkCallback(networkCallback);
        } catch (RuntimeException error) {
            Log.e(TAG, "Could not register network reconnect listener", error);
        }
    }

    private void checkPunchStatus() {
        if (stopped || employeeId == null || baseUrl == null || cookie == null) return;
        HttpResult result = request(
                "GET",
                baseUrl + "/api/attendance/live-location?trackingStatus=1",
                null
        );
        if (result == null) return;
        if (result.statusCode == 401) {
            Log.w(TAG, "Attendance tracking session expired; stopping location monitor");
            stopService();
            return;
        }
        if (result.statusCode != 200) {
            Log.w(TAG, "Attendance tracking status request failed: " + result.statusCode);
            return;
        }

        try {
            JSONObject status = new JSONObject(result.body);
            boolean shouldTrack = status.optBoolean("tracking", false);
            if (shouldTrack) {
                String nextAttendanceDate = status.optString("date", null);
                attendanceDate = nextAttendanceDate;
                startLocationUpdates();
                flushQueuedPoints();
            } else {
                stopLocationUpdates();
                attendanceDate = null;
                flushQueuedPoints();
            }
        } catch (Exception error) {
            Log.e(TAG, "Could not read attendance tracking status", error);
        }
    }

    private void startLocationUpdates() {
        if (tracking || stopped) return;
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
                ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Location permission is not available");
            return;
        }

        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        if (locationManager == null) return;
        locationListener = location -> executor.execute(() -> recordLocation(location));
        try {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 15000L, 10f, locationListener);
            }
            locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 20000L, 25f, locationListener);
            PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
            if (powerManager != null && (wakeLock == null || !wakeLock.isHeld())) {
                wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "CeCube:AttendanceLocation");
                wakeLock.acquire();
            }
            tracking = true;
            updateNotification("Location sharing is active during your open attendance punch.");
        } catch (SecurityException | IllegalArgumentException error) {
            Log.e(TAG, "Could not start punch location updates", error);
            stopLocationUpdates();
        }
    }

    private void recordLocation(Location location) {
        if (!tracking || stopped) return;
        try {
            JSONObject point = new JSONObject();
            point.put("id", UUID.randomUUID().toString());
            point.put("latitude", location.getLatitude());
            point.put("longitude", location.getLongitude());
            point.put("accuracy", location.hasAccuracy() ? location.getAccuracy() : JSONObject.NULL);
            point.put("timestamp", toIsoTimestamp(location.getTime()));
            point.put("date", attendanceDate);

            JSONArray queue = readQueuedPoints();
            queue.put(point);
            while (queue.length() > MAX_QUEUED_POINTS) {
                queue.remove(0);
            }
            saveQueuedPoints(queue);
            flushQueuedPoints();
        } catch (Exception error) {
            Log.e(TAG, "Could not queue punch location", error);
        }
    }

    private void flushQueuedPoints() {
        if (stopped) return;
        while (!stopped) {
            JSONArray queue = readQueuedPoints();
            if (queue.length() == 0) return;

            JSONArray batch = new JSONArray();
            String batchDate = queue.optJSONObject(0) == null
                    ? null
                    : queue.optJSONObject(0).optString("date", null);
            boolean[] selected = new boolean[queue.length()];
            int batchSize = 0;
            for (int index = 0; index < queue.length(); index++) {
                if (batchSize >= MAX_POINTS_PER_UPLOAD) break;
                JSONObject point = queue.optJSONObject(index);
                if (point != null && batchDate != null && batchDate.equals(point.optString("date", null))) {
                    batch.put(point);
                    selected[index] = true;
                    batchSize++;
                }
            }
            if (batchSize == 0) {
                Log.w(TAG, "Punch location queue contains an invalid point");
                return;
            }

            JSONObject payload = new JSONObject();
            try {
                payload.put("points", batch);
            } catch (Exception error) {
                Log.e(TAG, "Could not prepare punch location upload", error);
                return;
            }

            HttpResult result = request(
                    "POST",
                    baseUrl + "/api/attendance/live-location",
                    payload.toString()
            );
            if (result == null) return;
            if (result.statusCode == 401) {
                stopService();
                return;
            }
            if (result.statusCode == 409) {
                Log.w(TAG, "Queued locations were rejected for attendance date " + batchDate);
                return;
            }
            if (result.statusCode == 400) {
                Log.w(TAG, "Discarding invalid or expired queued locations for attendance date " + batchDate +
                        ": " + result.body);
                JSONArray remaining = new JSONArray();
                for (int index = 0; index < queue.length(); index++) {
                    if (!selected[index]) remaining.put(queue.optJSONObject(index));
                }
                saveQueuedPoints(remaining);
                continue;
            }
            if (result.statusCode < 200 || result.statusCode >= 300) {
                Log.w(TAG, "Punch location upload failed: " + result.statusCode);
                return;
            }

            JSONArray remaining = new JSONArray();
            for (int index = 0; index < queue.length(); index++) {
                if (!selected[index]) remaining.put(queue.optJSONObject(index));
            }
            saveQueuedPoints(remaining);
        }
    }

    private HttpResult request(String method, String requestUrl, @Nullable String body) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(requestUrl).openConnection();
            connection.setRequestMethod(method);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Cookie", cookie);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(15000);
            if (body != null) {
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setDoOutput(true);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(body.getBytes(StandardCharsets.UTF_8));
                }
            }

            int statusCode = connection.getResponseCode();
            InputStream stream = statusCode >= 400 ? connection.getErrorStream() : connection.getInputStream();
            StringBuilder responseBody = new StringBuilder();
            if (stream != null) {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) responseBody.append(line);
                }
            }
            return new HttpResult(statusCode, responseBody.toString());
        } catch (Exception error) {
            Log.i(TAG, "Location upload will retry after network is available", error);
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private JSONArray readQueuedPoints() {
        String value = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).getString("queuedPoints", "[]");
        try {
            return new JSONArray(value);
        } catch (Exception error) {
            Log.e(TAG, "Could not read saved punch location queue", error);
            return new JSONArray();
        }
    }

    private void saveQueuedPoints(JSONArray queue) {
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit()
                .putString("queuedPoints", queue.toString())
                .apply();
    }

    private void clearQueuedPoints() {
        saveQueuedPoints(new JSONArray());
    }

    private String toIsoTimestamp(long timestamp) {
        SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
        return formatter.format(new Date(timestamp));
    }

    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Attendance monitoring active")
                .setContentText("Location is shared only while an attendance punch is open.")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void updateNotification(String text) {
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Attendance monitoring active")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(NOTIFICATION_ID, notification);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Attendance location",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private void stopLocationUpdates() {
        if (locationManager != null && locationListener != null) {
            try {
                locationManager.removeUpdates(locationListener);
            } catch (SecurityException error) {
                Log.w(TAG, "Location permission changed while stopping updates", error);
            }
        }
        locationListener = null;
        locationManager = null;
        tracking = false;
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        wakeLock = null;
        if (!stopped) updateNotification("Location is shared only while an attendance punch is open.");
    }

    private void stopService() {
        stopped = true;
        handler.removeCallbacks(statusPoll);
        stopLocationUpdates();
        clearQueuedPoints();
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().clear().apply();
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        stopped = true;
        handler.removeCallbacks(statusPoll);
        stopLocationUpdates();
        if (connectivityManager != null && networkCallback != null) {
            try {
                connectivityManager.unregisterNetworkCallback(networkCallback);
            } catch (RuntimeException error) {
                Log.w(TAG, "Could not unregister network listener", error);
            }
        }
        executor.shutdownNow();
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private static final class HttpResult {
        final int statusCode;
        final String body;

        HttpResult(int statusCode, String body) {
            this.statusCode = statusCode;
            this.body = body;
        }
    }
}
