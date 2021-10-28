<table><tr>
  <td colspan="4"><img src="/assets/screenshots/emulator.png?raw=true"></td>
</tr><tr>
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
* [Online in web browser](https://danielfspencer.github.io/blizzard-4/) (tested in Firefox and Chrome)
* [Downloadable version](https://github.com/danielfspencer/blizzard-4/releases/latest) (pre-built portable binaries)

### Documentation
The documentation is written in Markdown and can be [viewed here](/manual/docs/introduction.md). It is also available in-app under the "Manual" section in the sidebar.

### Building from source
To get the source for the latest released version, type:

```bash
git clone https://github.com/danielfspencer/blizzard-4
cd blizzard-4
```

Install the libraries required by Electron with:
```bash
npm install
```

Run the app with:

```bash
npm start
```

You can also build a portable binary for your current OS with the following command:

```bash
npm run dist
```
 The generated executable is found in the ```electron_dist/``` folder.

### License
Code released under GNU General Public License v3.0.
Copyright &copy; Daniel Spencer.

[3rd Party Licences](manual/docs/licences.md)
