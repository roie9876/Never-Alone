# 🛠️ Xcode & CocoaPods Setup for Task 5.1

**Status:** Required before starting Flutter macOS development  
**Time:** 1-2 hours (Xcode download is large ~12GB)

---

## 📋 Current Status

From `flutter doctor` output:
```
[✗] Xcode - develop for iOS and macOS
    ✗ Xcode installation is incomplete; a full installation is necessary for iOS and macOS
      development.
```

**You have:** Command Line Tools (already installed ✅)  
**You need:** Full Xcode app + CocoaPods

---

## 🚀 Installation Steps

### Option 1: Install Xcode from App Store (Recommended)

1. **Open App Store**
   ```bash
   open -a "App Store"
   ```

2. **Search for "Xcode"** and click "Install" or "Get"
   - **Size:** ~12GB download
   - **Time:** 30-60 minutes depending on internet speed

3. **After installation completes:**
   ```bash
   # Switch to Xcode command line tools
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   
   # Run first launch setup
   sudo xcodebuild -runFirstLaunch
   
   # Accept license agreement
   sudo xcodebuild -license accept
   ```

4. **Verify Xcode installation:**
   ```bash
   xcodebuild -version
   ```
   
   Expected output:
   ```
   Xcode 15.x
   Build version xxxxx
   ```

---

### Option 2: Download Xcode from Apple Developer (Alternative)

If App Store is slow or unavailable:

1. Visit: https://developer.apple.com/xcode/
2. Click "Download Xcode"
3. Login with Apple ID
4. Download Xcode_15.x.xip file
5. Extract and move to /Applications
6. Run setup commands from Option 1, step 3

---

## 📦 Install CocoaPods

CocoaPods is required for iOS/macOS dependencies.

```bash
# Install CocoaPods via Homebrew (recommended)
brew install cocoapods

# Or install via RubyGems
sudo gem install cocoapods

# Verify installation
pod --version
```

Expected output:
```
1.15.x
```

---

## ✅ Verify Complete Setup

After installing both Xcode and CocoaPods:

```bash
flutter doctor
```

Expected output (Xcode section):
```
[✓] Xcode - develop for iOS and macOS (Xcode 15.x)
    • Xcode at /Applications/Xcode.app/Contents/Developer
    • Build 15Xxx
    • CocoaPods version 1.15.x
```

---

## 🎯 Alternative: Use Xcode Command Line Tools Only (Quick Start)

If you want to **start immediately** without waiting for full Xcode download:

### For MVP/Development Only:
You can try using just Command Line Tools (already installed) for basic Flutter development:

```bash
# Install Rosetta 2 (needed for some tools on Apple Silicon)
softwareupdate --install-rosetta --agree-to-license

# Enable macOS desktop in Flutter
flutter config --enable-macos-desktop

# Try creating project
cd "/Users/robenhai/Never Alone"
flutter create --platforms=macos --org=com.neveralone --project-name=never_alone_app frontend_flutter
```

**Note:** This may work for basic development but **full Xcode is required** for:
- Building release versions
- Code signing
- App Store distribution
- Full debugging capabilities

---

## 📊 What to Do Now

### Immediate Path (Skip Xcode for now):

1. ✅ **Install CocoaPods** (5 minutes)
   ```bash
   brew install cocoapods
   ```

2. ✅ **Try creating Flutter project** (see "Alternative" section above)

3. ✅ **Work on UI code** (can develop/test without full Xcode)

4. ⏳ **Install full Xcode in background** (while you code)

### Full Setup Path (Recommended for production):

1. ⏳ **Start Xcode download from App Store** (30-60 min)
2. ☕ **Take a break** while it downloads
3. ✅ **Run Xcode setup commands** (5 min)
4. ✅ **Install CocoaPods** (5 min)
5. ✅ **Run `flutter doctor`** to verify
6. ✅ **Create Flutter project** and start Task 5.1

---

## 🆘 Troubleshooting

### Issue: "Xcode license not accepted"
```bash
sudo xcodebuild -license accept
```

### Issue: "xcrun: error: invalid active developer path"
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

### Issue: CocoaPods installation fails
```bash
# Update Ruby
brew install ruby

# Try installing again
sudo gem install cocoapods
```

---

## 🚀 Next Steps After Setup

Once `flutter doctor` shows Xcode is ready:

1. Return to **TASK_5.1_GUIDE.md**
2. Start from **Step 1: Create Flutter Project**
3. Continue with Task 5.1 implementation

---

*Created: November 11, 2025*
