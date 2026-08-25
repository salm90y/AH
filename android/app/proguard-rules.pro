# Proguard rules for MovieRoomApp
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.movieroom.app.** { *; }
-dontwarn android.webkit.**
