add image in pubspac.yaml
Now run these commands:
cd mobile
flutter pub get
flutter pub run flutter_launcher_icons
dart run flutter_native_splash:create
This will:
1. Generate app icons with drop_logo-withoutbg.png
2. Generate splash screens (Android + iOS) with drop_logo-withoutbg.png on white background