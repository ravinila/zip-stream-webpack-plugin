# zip-stream-webpack-plugin

A webpack plugin to zip the output files which is highly customizable.

## Install

```
npm install --save-dev zip-stream-webpack-plugin
```

## Usage

webpack.config.js

```js
var ZipStreamPlugin = require('zip-stream-webpack-plugin');

module.exports = {
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'main.js'
    },
    plugins: [
        new ZipStreamPlugin({
            // optional: defaults to webpack's output path & filename
            path: 'targets',
            filename: 'final_build.zip'

            // optional: include/exclude files, here exclude has high precedence over include
            exclude: [/__MAC*/, /DS_Store/, /.js.map/,],
            include: null,

            extension: "zip", // defaults to zip if no extension specified in output filename

            // optional: defaults to noop
            // it uses Archiver to zip the output directory
            customizeArchiver: (archive) => {
                // here archiver can be costomized 
                // see https://www.npmjs.com/package/archiver
            },

            // optional: the default behaviour of this plugin is to zip entire output directory.
            // With this flag it can be disabled and customize completely with 
            // customizeArchiver
            allowDefaults: true,

        })
    ]
}
```
