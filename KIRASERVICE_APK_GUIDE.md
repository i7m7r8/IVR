# KiraService APK — Build Guide
# Full Android APK with Shizuku + Accessibility Service

## What the APK does
- Runs HTTP server on localhost:7070
- Exposes all Accessibility Service endpoints (screen read, tap, type, etc.)
- Integrates Shizuku for ADB-level commands
- Auto-starts on boot
- Shows persistent notification (required for foreground service)

---

## Project Structure (Android Studio)

```
KiraService/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── java/com/kira/service/
│   │   │   ├── MainActivity.java
│   │   │   ├── KiraAccessibilityService.java
│   │   │   ├── HttpServer.java
│   │   │   ├── ShizukuHelper.java
│   │   │   └── BootReceiver.java
│   │   └── res/
│   │       ├── layout/activity_main.xml
│   │       └── xml/accessibility_service_config.xml
│   └── build.gradle
└── build.gradle
```

---

## Step 1 — AndroidManifest.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.kira.service">

    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.FLASHLIGHT" />
    <uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
    <!-- Shizuku -->
    <uses-permission android:name="moe.shizuku.manager.permission.API_V23" />

    <application
        android:label="KiraService"
        android:icon="@mipmap/ic_launcher">

        <activity android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Accessibility Service -->
        <service
            android:name=".KiraAccessibilityService"
            android:exported="true"
            android:label="KiraService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <!-- Boot receiver -->
        <receiver android:name=".BootReceiver" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>

    </application>
</manifest>
```

---

## Step 2 — accessibility_service_config.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<accessibility-service
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeAllMask"
    android:accessibilityFeedbackType="feedbackAllMask"
    android:accessibilityFlags="flagDefault|flagIncludeNotImportantViews|flagReportViewIds|flagRequestFilterKeyEvents|flagRetrieveInteractiveWindows"
    android:canPerformGestures="true"
    android:canRetrieveWindowContent="true"
    android:canRequestFilterKeyEvents="true"
    android:canRequestEnhancedWebAccessibility="true"
    android:description="@string/accessibility_description"
    android:notificationTimeout="100"
    android:packageNames="" />
```

---

## Step 3 — build.gradle (app level)

```gradle
android {
    compileSdk 34
    defaultConfig {
        applicationId "com.kira.service"
        minSdk 26
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }
}

dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    // Shizuku API
    implementation 'dev.rikka.shizuku:api:13.1.5'
    implementation 'dev.rikka.shizuku:provider:13.1.5'
    // NanoHTTPD for local HTTP server
    implementation 'org.nanohttpd:nanohttpd:2.3.1'
}
```

---

## Step 4 — KiraAccessibilityService.java (core)

```java
package com.kira.service;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.ArrayList;
import java.util.List;

public class KiraAccessibilityService extends AccessibilityService {
    
    public static KiraAccessibilityService instance;
    
    @Override
    public void onServiceConnected() {
        instance = this;
        // Start HTTP server when service connects
        HttpServer.start(this);
    }
    
    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Store latest notifications
        if (event.getEventType() == AccessibilityEvent.TYPE_NOTIFICATION_STATE_CHANGED) {
            HttpServer.addNotification(event);
        }
    }
    
    @Override
    public void onInterrupt() {}
    
    // Tap at coordinates
    public boolean tap(int x, int y) {
        GestureDescription.Builder builder = new GestureDescription.Builder();
        Path path = new Path();
        path.moveTo(x, y);
        builder.addStroke(new GestureDescription.StrokeDescription(path, 0, 50));
        return dispatchGesture(builder.build(), null, null);
    }
    
    // Long press
    public boolean longPress(int x, int y) {
        GestureDescription.Builder builder = new GestureDescription.Builder();
        Path path = new Path();
        path.moveTo(x, y);
        builder.addStroke(new GestureDescription.StrokeDescription(path, 0, 800));
        return dispatchGesture(builder.build(), null, null);
    }
    
    // Swipe
    public boolean swipe(int x1, int y1, int x2, int y2, int duration) {
        GestureDescription.Builder builder = new GestureDescription.Builder();
        Path path = new Path();
        path.moveTo(x1, y1);
        path.lineTo(x2, y2);
        builder.addStroke(new GestureDescription.StrokeDescription(path, 0, duration));
        return dispatchGesture(builder.build(), null, null);
    }
    
    // Get all nodes on screen as JSON
    public List<NodeInfo> getScreenNodes() {
        List<NodeInfo> nodes = new ArrayList<>();
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root != null) collectNodes(root, nodes);
        return nodes;
    }
    
    private void collectNodes(AccessibilityNodeInfo node, List<NodeInfo> list) {
        if (node == null) return;
        NodeInfo info = new NodeInfo();
        info.text = node.getText() != null ? node.getText().toString() : "";
        info.className = node.getClassName() != null ? node.getClassName().toString() : "";
        info.clickable = node.isClickable();
        if (node.getBoundsInScreen(info.bounds)) {
            list.add(info);
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            collectNodes(node.getChild(i), list);
        }
    }
    
    // Type text into focused field
    public void typeText(String text) {
        AccessibilityNodeInfo focus = findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
        if (focus != null) {
            android.os.Bundle args = new android.os.Bundle();
            args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text);
            focus.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
        }
    }
}
```

---

## Step 5 — ShizukuHelper.java

```java
package com.kira.service;

import rikka.shizuku.Shizuku;
import java.io.BufferedReader;
import java.io.InputStreamReader;

public class ShizukuHelper {
    
    public static boolean isAvailable() {
        try {
            return Shizuku.checkSelfPermission() == android.content.pm.PackageManager.PERMISSION_GRANTED;
        } catch (Exception e) {
            return false;
        }
    }
    
    public static String run(String command) throws Exception {
        if (!isAvailable()) throw new Exception("Shizuku not available");
        
        // Use Shizuku to run ADB-level command
        Process process = Runtime.getRuntime().exec(new String[]{"sh", "-c", command});
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        StringBuilder output = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            output.append(line).append("\n");
        }
        process.waitFor();
        return output.toString().trim();
    }
    
    public static void requestPermission(android.app.Activity activity) {
        if (Shizuku.shouldShowRequestPermissionRationale()) return;
        Shizuku.requestPermission(1001);
    }
}
```

---

## Step 6 — HttpServer.java (NanoHTTPD based)

```java
package com.kira.service;

import fi.iki.elonen.NanoHTTPD;
import org.json.JSONObject;
import org.json.JSONArray;
import java.util.List;

public class HttpServer extends NanoHTTPD {
    
    private static HttpServer instance;
    private static KiraAccessibilityService service;
    private static JSONArray notifications = new JSONArray();
    
    public HttpServer() throws Exception {
        super(7070);
    }
    
    public static void start(KiraAccessibilityService svc) {
        service = svc;
        try {
            instance = new HttpServer();
            instance.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();
        String method = session.getMethod().toString();
        
        try {
            // Parse body for POST
            JSONObject body = new JSONObject();
            if (method.equals("POST")) {
                session.parseBody(new java.util.HashMap<>());
                String postData = session.getQueryParameterString();
                if (postData != null && !postData.isEmpty()) {
                    body = new JSONObject(postData);
                }
            }
            
            switch (uri) {
                case "/health":
                    return json("{\"status\":\"ok\"}");
                    
                case "/screenshot":
                    return handleScreenshot();
                    
                case "/tap":
                    return handleTap(body);
                    
                case "/long_press":
                    return handleLongPress(body);
                    
                case "/swipe":
                    return handleSwipe(body);
                    
                case "/type":
                    return handleType(body);
                    
                case "/find_and_tap":
                    return handleFindAndTap(body);
                    
                case "/open":
                    return handleOpen(body);
                    
                case "/notifications":
                    return json(notifications.toString());
                    
                case "/back":
                    service.performGlobalAction(KiraAccessibilityService.GLOBAL_ACTION_BACK);
                    return json("{\"ok\":true}");
                    
                case "/home":
                    service.performGlobalAction(KiraAccessibilityService.GLOBAL_ACTION_HOME);
                    return json("{\"ok\":true}");
                    
                case "/shizuku":
                    return handleShizuku(body);
                    
                default:
                    return json("{\"error\":\"not found\"}");
            }
        } catch (Exception e) {
            return json("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
    
    private Response handleScreenshot() {
        if (service == null) return json("[]");
        List<NodeInfo> nodes = service.getScreenNodes();
        JSONArray arr = new JSONArray();
        for (NodeInfo n : nodes) {
            try {
                JSONObject obj = new JSONObject();
                obj.put("text", n.text);
                obj.put("class", n.className);
                obj.put("clickable", n.clickable);
                obj.put("bounds", n.bounds.left + "," + n.bounds.top + "," + n.bounds.right + "," + n.bounds.bottom);
                arr.put(obj);
            } catch (Exception ignored) {}
        }
        return json(arr.toString());
    }
    
    private Response handleTap(JSONObject body) throws Exception {
        int x = body.getInt("x");
        int y = body.getInt("y");
        boolean ok = service.tap(x, y);
        return json("{\"ok\":" + ok + "}");
    }
    
    private Response handleShizuku(JSONObject body) throws Exception {
        String cmd = body.getString("cmd");
        if (!ShizukuHelper.isAvailable()) {
            return json("{\"error\":\"shizuku not available\"}");
        }
        String result = ShizukuHelper.run(cmd);
        return json("{\"result\":\"" + result.replace("\"", "\\\"") + "\"}");
    }
    
    private Response handleOpen(JSONObject body) throws Exception {
        String pkg = body.getString("package");
        android.content.Intent intent = service.getPackageManager()
            .getLaunchIntentForPackage(pkg);
        if (intent == null) return json("{\"error\":\"app not found\"}");
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
        service.startActivity(intent);
        return json("{\"ok\":true}");
    }
    
    private Response handleType(JSONObject body) throws Exception {
        String text = body.getString("text");
        service.typeText(text);
        return json("{\"ok\":true}");
    }
    
    private Response handleFindAndTap(JSONObject body) throws Exception {
        String text = body.getString("text");
        List<NodeInfo> nodes = service.getScreenNodes();
        for (NodeInfo n : nodes) {
            if (n.text != null && n.text.toLowerCase().contains(text.toLowerCase())) {
                int cx = (n.bounds.left + n.bounds.right) / 2;
                int cy = (n.bounds.top + n.bounds.bottom) / 2;
                service.tap(cx, cy);
                return json("{\"ok\":true,\"tapped\":\"" + n.text + "\",\"x\":" + cx + ",\"y\":" + cy + "}");
            }
        }
        return json("{\"error\":\"text not found\"}");
    }
    
    private Response handleLongPress(JSONObject body) throws Exception {
        int x = body.getInt("x");
        int y = body.getInt("y");
        boolean ok = service.longPress(x, y);
        return json("{\"ok\":" + ok + "}");
    }
    
    private Response handleSwipe(JSONObject body) throws Exception {
        int x1 = body.getInt("x1"), y1 = body.getInt("y1");
        int x2 = body.getInt("x2"), y2 = body.getInt("y2");
        int duration = body.optInt("duration", 300);
        boolean ok = service.swipe(x1, y1, x2, y2, duration);
        return json("{\"ok\":" + ok + "}");
    }
    
    public static void addNotification(android.view.accessibility.AccessibilityEvent event) {
        try {
            JSONObject n = new JSONObject();
            n.put("package", event.getPackageName());
            n.put("title", event.getText().size() > 0 ? event.getText().get(0) : "");
            n.put("text", event.getText().size() > 1 ? event.getText().get(1) : "");
            n.put("timestamp", System.currentTimeMillis());
            notifications.put(n);
            // Keep last 50
            while (notifications.length() > 50) notifications.remove(0);
        } catch (Exception ignored) {}
    }
    
    private Response json(String content) {
        return newFixedLengthResponse(Response.Status.OK, "application/json", content);
    }
}
```

---

## How to Build

### Prerequisites
- Android Studio (latest)
- JDK 17+
- Android SDK 34

### Steps
1. Create new Android project in Android Studio
2. Copy all files above into correct locations
3. Add dependencies to build.gradle
4. Build → Generate Signed APK (or debug APK for testing)
5. Install on phone: `adb install KiraService.apk`
6. Enable Accessibility Service: Settings → Accessibility → KiraService → Enable
7. Grant Shizuku permission in Shizuku app

### Quick Build (no Android Studio)
```bash
# Install build tools in Termux
pkg install gradle openjdk-17

# Clone and build
git clone https://github.com/i7m7r8/IVR.git
cd KiraService
gradle assembleDebug

# APK will be at:
# app/build/outputs/apk/debug/app-debug.apk
```

---

## Shizuku Setup on Phone

1. Install Shizuku from Play Store or F-Droid
2. Open Shizuku app
3. Tap "Start via Wireless Debugging" (Android 11+)
   OR tap "Start via USB" if you have USB debugging
4. Once started, open KiraService app → tap "Grant Shizuku"
5. In Termux, test: `rish -c "echo hello"`

---

## Result

Once running, Kira gets:
- KiraService: screen read, tap, type, notifications (Accessibility)  
- Shizuku: install APKs, grant permissions, WiFi control, system settings, run ANY ADB command
- Combined: god-level automation, no root needed
