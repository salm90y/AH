# مشروع تطبيق MovieRoom (سهرة ممتعة) - Android Native الكامل 🎬🍿

تطبيق **Android Native حقيقي 100%** لمشاهدة الأفلام والغرف التفاعلية الجماعية، مبني باستخدام مكتبات جوجل الرسمية للأندرويد: **Kotlin + Jetpack Compose + AndroidX Media3 ExoPlayer**.

---

## 🛠️ البنية التقنية (Native Tech Stack)

- **اللغة الأساسية**: Kotlin 1.9.22
- **واجهات المستخدم**: Jetpack Compose (Material3) مع دعم كامل للـ RTL والتصميم الداكن الفاخر.
- **مشغل الفيديو**: **AndroidX Media3 ExoPlayer** (v1.2.1) لدعم البث المباشر (HLS, DASH, Progressive MP4).
- **إدارة الحالة**: Kotlin Coroutines & StateFlow.
- **معالجة الصور**: Coil Compose (v2.5.0).
- **الشبكة وAPI**: Retrofit 2 + OkHttp3 Logging Interceptor.
- **نظام البناء**: Gradle Kotlin DSL (`.gradle.kts`) و Gradle 8.5.

---

## 🚫 خلو تام من أي مكونات هجينة أو ويب

- **لا يوجد أي WebView أو WebChromeClient**.
- **لا يوجد أي كود HTML أو CSS أو JavaScript لواجهة التطبيق**.
- **لا يوجد Capacitor أو Cordova أو React Native أو Flutter**.

---

## 📱 متطلبات التشغيل والبناء

- **الحد الأدنى للنظام (minSdk)**: Android 7.0 (API 24)
- **الإصدار المستهدف (targetSdk)**: Android 14 (API 34)
- **إصدار الجافا المطلوبة**: Java JDK 17
- **بيئة التطوير**: Android Studio Hedgehog / Iguana / Jellyfish فما فوق.

---

## 🚀 أوامر البناء والتشغيل

```bash
# الانتقال إلى مجلد أندرويد
cd android

# تنظيف البناء
./gradlew clean

# بناء ملف APK للتجربة والتثبيت
./gradlew assembleDebug --no-daemon

# مسار ملف الـ APK الناتج:
# android/app/build/outputs/apk/debug/app-debug.apk
```
