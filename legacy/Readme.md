## 📦 Features

- Fully tested on **Termux, Linux, and Panels**.  
- **222+ commands** for groups, media, fun, utilities, AI, and more.  
- **Auto-typing** simulation.  
- Media folder support for images, stickers, and icons.  
- Fully customizable and 

## 🚀 Installation Guide (Termux)

Follow these step-by-step commands to deploy the bot:

### Step 1: Update & Install Required Packages
```bash
pkg update && pkg upgrade -y
pkg install nodejs -y
pkg install git -y
pkg install ffmpeg -y
pkg install libwebp -y
pkg install imagemagick -y
```

> Tip: If prompted with "Do you want to continue? [Y/n]", type y and press Enter. ✅



---

Step 2: Clone Repo & Setup
```bash


termux-setup-storage
```
Step 3: Install Node Modules
```bash
npm install
```
Step 4: Clean Hidden Auth Files
```bash
rm -rf auth_info/*
```
Step 5: Run The Bot
```bash
npm start
```
✅ Bonus: Auto reload
```bash
node index.js
```