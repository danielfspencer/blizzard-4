![Screenshot of emulator](/assets/screenshots/emulator.png?raw=true)

<img src="/assets/screenshots/ping_pong.gif?raw=true" height="300" align="right">

Blizzard 4 is a RISC 16-bit computer. This web app contains an emulator, assembler, compiler and a set of example programs for the computer.

### Ways to use
* [Online (no install required)](https://danielfspencer.github.io/blizzard-4/)
* [Pre-built binaries](https://github.com/danielfspencer/blizzard-4/releases/latest)
* [Google Chrome App](https://chrome.google.com/webstore/detail/blizzard-4/objgfaegobaokaihpdlnaifgkmkbgbaf)

### Building as an Electron App
To get the source for the latest released version, type:

```bash
git clone -b gh-pages --depth=1 https://github.com/danielfspencer/blizzard-4
```

Install the libraries required by Electron with:
```bash
cd blizzard-4
npm install
```

Then use the following to build a portable binary for your current OS. The generated executable is found in the ```electron_dist/``` folder.

```bash
npm run dist
```

Optionally, you can just run the app with (this does not seem to work on Windows for some reason):

```bash
npm start
```

### Acknowledgements
* [jQuery](http://jquery.com/) - MIT License
* [Showdown](https://github.com/showdownjs/showdown) - MIT License
* [Material Design Hamburger](https://github.com/chrisdwheatley/material-design-hamburger) - MIT License
* [jQuery Lined Textarea Plugin](http://alan.blog-city.com/jquerylinedtextarea.htm) - MIT License
* [Google Roboto Font](https://fonts.google.com/specimen/Roboto) - Apache License, Version 2.0
* [Google Material Design Icons](https://github.com/google/material-design-icons) - Apache License, Version 2.0
