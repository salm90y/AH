# خطة التحويل إلى Android Native (MIGRATION_PLAN.md)

توضح هذه الخطة تفاصيل تحويل تطبيق المشاهدة الجماعية والأفلام (AH MovieRoom) بالكامل من نموذج الويب إلى تطبيق Android Native 100% باستخدام لغة Kotlin و Jetpack Compose و AndroidX Media3 ExoPlayer.

---

## 1. جدول مطابقة وتحويل الوظائف والشاشات

| الشاشة / الوظيفة في الويب | المقابل في Android Native | التقنية المستخدمة في Native | ملاحظات التنفيذ |
| :--- | :--- | :--- | :--- |
| **صفحة البداية والترحيب (LandingPage)** | `LandingScreen.kt` | Jetpack Compose + Animations | واجهة رسومية أصلية بالكامل مع تأثيرات بصرية وأزرار دخول Native |
| **تسجيل الدخول والتسجيل (LoginPage)** | `LoginScreen.kt` | Jetpack Compose Form Components | حقول إدخال `OutlinedTextField` أصلية مع معالجة التحقق وحفظ الجلسة عبر StateFlow / DataStore |
| **لوحة إدارة الغرف والاستكشاف (JoinRoom)** | `HomeScreen.kt` / `RoomDiscoveryScreen.kt` | Jetpack Compose `LazyColumn` / `Card` | إنشاء غرف مشاهدة، البحث عن غرف، تصفح الأفلام المشهورة واستكشاف التصنيفات |
| **مشغل الفيديو وغرفة المشاهدة (WatchRoom)** | `WatchRoomScreen.kt` + `MoviePlayerView.kt` | **AndroidX Media3 ExoPlayer** + Jetpack Compose | مشغل فيديو أصلي متقدم (Play/Pause, Seek, Fullscreen, Quality, Lock, HLS/MP4 streams) دون أي WebView |
| **الدردشة الحية والتفاعل داخل الغرفة** | `ChatComponent.kt` + StateFlow / Coroutines | Jetpack Compose Chat Bubbles | قائمة تفاعلية للرسائل الفورية، إرسال الرموز التعبيرية والتفاعل الجماعي |
| **لوحة الإدارة والإشراف (AdminDashboard)** | `AdminDashboardScreen.kt` | Jetpack Compose Management Views | إحصائيات السيرفر والغرف النشطة وإدارة المستخدمين |
| **محرك تشغيل الفيديو** | `ExoPlayerController.kt` | `androidx.media3.exoplayer.ExoPlayer` | تحكم كامل بدفق الفيديو (HLS, DASH, Progressive MP4) وتحكم بالصوت والسطوع |
| **الاتصال بالـ API والشبكة** | `Retrofit` / `OkHttpClient` | `ApiService.kt` + Kotlin Coroutines | طلبات HTTPS أصلية لجلب بيانات الأفلام والغرف والربط الآمن |
| **إدارة الحالة (State Management)** | `MovieRoomViewModel.kt` | `AndroidX ViewModel` + `StateFlow` | فصل طبقات MVVM وتدفق بيانات متجاوب وموثوق |

---

## 2. الهيكل المعماري البرمجي لتطبيق Android Native

```text
android/
├── app/
│   ├── build.gradle.kts
│   ├── proguard-rules.pro
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml
│           ├── kotlin/com/movieroom/app/
│           │   ├── MainActivity.kt
│           │   ├── MovieRoomApplication.kt
│           │   ├── data/
│           │   │   ├── model/ (Movie, Room, User, Message)
│           │   │   ├── api/ (ApiService, NetworkClient)
│           │   │   └── repository/ (MovieRepository, RoomRepository)
│           │   ├── player/
│           │   │   └── ExoPlayerController.kt
│           │   ├── ui/
│           │   │   ├── theme/ (Color, Theme, Type)
│           │   │   ├── components/ (PlayerView, ChatBubble, RoomCard)
│           │   │   ├── screens/ (LandingScreen, LoginScreen, HomeScreen, WatchRoomScreen, AdminScreen)
│           │   │   └── viewmodel/ (MovieRoomViewModel)
│           │   └── utils/
│           └── res/
│               ├── drawable/
│               ├── mipmap-anydpi-v26/
│               └── values/ (strings, colors, styles)
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
└── gradlew
```

---

## 3. الالتزام الصارم بشروط Native:
- **صفر WebView**: لا يوجد أي استدعاء أو استخدام لـ `WebView` أو `WebChromeClient`.
- **صفر HTML/CSS/JS**: كل الواجهات مبنية بكود Kotlin و Jetpack Compose Declarative UI.
- **مشغل الفيديو**: مشغل `AndroidX Media3 ExoPlayer` الرسمي والمبني لمكتبة أندرويد.
