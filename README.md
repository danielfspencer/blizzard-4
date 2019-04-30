![Screenshot of emulator](/assets/screenshots/emulator.png?raw=true)

<img src="/assets/screenshots/ping_pong.gif?raw=true" height="300" align="right">

# Blizzard 4 Toolchain

TODO: Introduction

## Ways to use:

* Online (no install required) - https://danielfspencer.github.io/blizzard-4/
* Prebuilt binaries ([electron](https://github.com/electron/electron) app) - https://github.com/danielfspencer/blizzard-4/releases/latest
* Google Chrome App (will be depricated soon) - [Chrome Web Store](https://chrome.google.com/webstore/detail/blizzard-4/objgfaegobaokaihpdlnaifgkmkbgbaf)
* Build from source - see below

## Building as an Electron App

To get the source for the latest released version, type:

```
git clone -b gh-pages --depth=1 https://github.com/danielfspencer/blizzard-4
```

Install the libraries required by Electron with:
```
cd blizzard-4
npm install
```

Then use the following to build a portable binary for your current OS. The generated executable is found in the ```electron_dist/``` folder.

```
npm run dist
```

Optionally, you can just run the app with:

```
npm start
```
