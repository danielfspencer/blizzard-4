<table><tr>
  <td colspan="4"><img src="/assets/screenshots/emulator.png?raw=true"></td>
<tr></tr>
  <td width="25%"><img src="/assets/screenshots/space_invaders.gif?raw=true"></td>
  <td width="25%"><img src="/assets/screenshots/3d_render.gif?raw=true"></td>
  <td width="25%"><img src="/assets/screenshots/snake.gif?raw=true"></td>
  <td width="25%"><img src="/assets/screenshots/ping_pong.gif?raw=true"></td>
</tr><tr>
  <td align="center"><b>Space Invaders</b></td>
  <td align="center"><b>3D Renderer</b></td>
  <td align="center"><b>Snake</b></td>
  <td align="center"><b>Ping Pong</b></td>
</tr></table>

Blizzard 4 is a RISC 16-bit computer designed for simple implementation in hardware. This web app contains an emulator, assembler, compiler and a set of example programs for the computer.

### Ways to use
* [Online in web browser](https://danielfspencer.github.io/blizzard-4/) (no install required)
* [Downloadable version](https://github.com/danielfspencer/blizzard-4/releases/latest) (pre-built portable binaries)
* [Google Chrome App](https://chrome.google.com/webstore/detail/blizzard-4/objgfaegobaokaihpdlnaifgkmkbgbaf)

### Documentation
The documentation is written in Markdown and can be [viewed here](/manual/docs/introduction.md). It is also available in-app under the "Manual" section in the sidebar.

### Building as an Electron App
To get the source for the latest released version, type:

```bash
git clone https://github.com/danielfspencer/blizzard-4
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

### License
Code released under GNU General Public License v3.0.
Copyright &copy; Daniel Spencer.
* [jQuery](http://jquery.com/) - MIT License
* [Showdown](https://github.com/showdownjs/showdown) - MIT License
* [Material Design Hamburger](https://github.com/chrisdwheatley/material-design-hamburger) - MIT License
* [jQuery Lined Textarea Plugin](http://alan.blog-city.com/jquerylinedtextarea.htm) - MIT License
* [Google Roboto Font](https://fonts.google.com/specimen/Roboto) - Apache License, Version 2.0
* [DejaVuSans font](https://dejavu-fonts.github.io/) - Bitstream Vera Fonts Copyright
* [Google Material Design Icons](https://github.com/google/material-design-icons) - Apache License, Version 2.0
