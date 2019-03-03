# Blizzard 4 Toolchain
In a chrome app

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
