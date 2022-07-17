const fs = require("fs");
const { resolve } = require("path");
const archiver = require("archiver");
const ModuleFilenameHelpers = require("webpack/lib/ModuleFilenameHelpers");
const path = require("path");

class ZipStreamPlugin {
  static defaultOptions = {
    customizeArchiver: null,
    noDefaultDehaviour: false,
    path: "",
    filename: "",
    extension: "zip",
    include: null,
    exclude: null,
  };

  constructor(options = {}) {
    this.options = { ...ZipStreamPlugin.defaultOptions, ...options };
  }

  getFiles(dir) {
    const files = [];
    // get all files recursively
    const fn = (dirPath) => {
      const dirFiles = fs.readdirSync(dirPath);
      for (const file of dirFiles) {
        const absolutePath = resolve(dirPath, file);
        if (fs.statSync(absolutePath).isDirectory()) {
          fn(absolutePath);
        } else {
          files.push(absolutePath);
        }
      }
    };

    fn(dir);

    return files;
  }

  apply(compiler) {
    const pluginName = ZipStreamPlugin.name;
    const { webpack } = compiler;
    const { Compilation } = webpack;

    let distPath;

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation = compilation;
      distPath = compilation.options.output.path;

      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
        },
        (assets) => {}
      );
    });

    compiler.hooks.done.tap(pluginName, (stats) => {
      const outputPath = this.options.path || distPath;

      let outputFile = resolve(outputPath, this.options.filename);

      if (!path.extname(outputFile).length && this.options.extension !== null) {
        outputFile += this.options.extension;
      }

      const filterFn = ModuleFilenameHelpers.matchObject.bind(null, {
        include: this.options.include,
        exclude: this.options.exclude,
      });

      let archive = archiver("zip", {
        zlib: { level: 9 },
      });

      archive.on("error", function (err) {
        throw err;
      });

      if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath);

      if (typeof this.options.customizeArchiver === "function") {
        this.options.customizeArchiver(archive);
      }
      if (!this.options.noDefaultDehaviour) {
        const output = fs.createWriteStream(outputFile);
        archive.pipe(output);

        const files = this.getFiles(distPath);

        files.forEach((file) => {
          const relativeFilePath = [file].toString().replace(distPath, "");
          console.log({ relativeFilePath }, filterFn(relativeFilePath));
          if (!filterFn(relativeFilePath)) {
            try {
              fs.unlinkSync(file);
            } catch (error) {
              console.log(error);
            }
          }
        });

        archive.directory(distPath, false);
      }

      archive.finalize().then(() => {
        const { path, filename } = stats.compilation.options.output;
        console.log({ stats });
      });
    });
  }
}

module.exports = ZipStreamPlugin;
