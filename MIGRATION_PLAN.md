# خطة تحويل مشروع سهرة ممتعة إلى Android Native بالكامل (MIGRATION_PLAN.md)

| الوظيفة القديمة | التقنية القديمة | التنفيذ Native الجديد | الملفات المسؤولة | حالة التنفيذ |
| :--- | :--- | :--- | :--- | :--- |
| **واجهة البداية وتسجيل الدخول** | React Forms + Tailwind | Jetpack Compose Native Form (`OutlinedTextField`, `Button`) | `LoginScreen.kt` | ✅ مكتمل |
| **استكشاف الأفلام والتصنيفات** | React State + DOM list | Jetpack Compose `LazyColumn` & `LazyRow` مع فلاتر حية | `HomeScreen.kt` | ✅ مكتمل |
| **تفاصيل الفيلم والمعلومات** | React Route (`/movie/:id`) | Native Compose Detail Screen مع ملصقات عالية الدقة | `MovieDetailScreen.kt` | ✅ مكتمل |
| **البحث والتصفية** | JavaScript client-filter | Compose Search Screen مع تفاعل مباشر و StateFlow | `SearchScreen.kt` | ✅ مكتمل |
| **قائمة المفضلة** | LocalStorage / Web State | Native Repository Flow مع تحديث فوري للحالة | `FavoritesScreen.kt` | ✅ مكتمل |
| **مشغل الفيديو والبث المباشر** | ReactPlayer / HTML5 Video | **AndroidX Media3 ExoPlayer** (HLS, DASH, Progressive MP4) | `NativeVideoPlayer.kt`, `ExoPlayerController.kt` | ✅ مكتمل |
| **غرفة المشاهدة الجماعية والدردشة** | WebSocket / React State | Compose WatchRoom Screen + Live Chat Bubbles | `WatchRoomScreen.kt` | ✅ مكتمل |
| **الإعدادات وحساب المستخدم** | HTML Tabs | Native Profile & Playback Settings Screen | `SettingsScreen.kt` | ✅ مكتمل |
| **الاتصال بالخادم والشبكة** | Axios / Fetch API | Retrofit 2 + OkHttp 3 Logging Client | `ApiService.kt`, `NetworkClient.kt` | ✅ مكتمل |
| **إدارة الحالة ودورة الحياة** | React Hooks | Kotlin Coroutines, StateFlow, ComponentActivity | `MainActivity.kt`, `MovieRoomApp.kt` | ✅ مكتمل |
