const os = require("os");
const path = require("path");
const fs = require("fs");
const fsE = require("fs-extra");
const archiver = require("archiver");
const ModuleFilenameHelpers = require("webpack/lib/ModuleFilenameHelpers");

const isFunc = (fn) => typeof fn === "function";

class ZipStreamPlugin {
  static defaultOptions = {
    customizeArchiver: null,
    allowDefaults: true,
    path: "",
    filename: "",
    extension: "zip",
    include: null,
    exclude: null,
  };

  constructor(options = {}) {
    this.options = { ...ZipStreamPlugin.defaultOptions, ...options };
  }

  getFiles(dir, filterMethod) {
    const files = [];

    const filterMd = isFunc(filterMethod) ? filterMethod : () => true;
    // get all files recursively
    const fn = (dirPath) => {
      const dirFiles = fs.readdirSync(dirPath);
      for (const file of dirFiles) {
        const absolutePath = path.resolve(dirPath, file);

        if (filterMd(absolutePath)) {
          if (fs.statSync(absolutePath).isDirectory()) {
            fn(absolutePath);
          } else {
            files.push(absolutePath);
          }
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

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation = compilation;
      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
        },
        (assets) => {}
      );
    });

    compiler.hooks.done.tap(pluginName, async (stats) => {
      const { path: distPath } = stats.compilation.options.output;

      const outputPath = path.resolve(distPath, this.options.path);

      let outputFile = path.resolve(outputPath, this.options.filename);

      if (!path.extname(outputFile).length && this.options.extension !== null) {
        outputFile += this.options.extension;
      }

      const tempPath = os.tmpdir() + "/zip-stream/";

      const filterFn = ModuleFilenameHelpers.matchObject.bind(null, {
        include: this.options.include,
        exclude: this.options.exclude,
      });

      const getRelativePath = (absolutePath, dir) => {
        return [absolutePath].toString().replace(dir.toString() + "/", "");
      };

      let archive = archiver("zip", {
        zlib: { level: 9 },
      });

      archive.on("error", function (err) {
        throw err;
      });

      fsE.ensureDirSync(outputPath);

      if (isFunc(this.options.customizeArchiver)) {
        this.options.customizeArchiver(archive);
      }

      if (this.options.allowDefaults) {
        const output = fs.createWriteStream(outputFile);
        archive.pipe(output);

        fsE.ensureDirSync(tempPath);

        const files = this.getFiles(distPath, (absolutePath) => {
          const relativeFilePath = getRelativePath(absolutePath, distPath);
          return filterFn(relativeFilePath);
        });

        files.forEach((absolutePath) => {
          const relativeFilePath = getRelativePath(absolutePath, distPath);
          const tempFilePath = tempPath + relativeFilePath;

          fsE.copySync(absolutePath, tempFilePath);
        });

        archive.directory(tempPath, false);
      }

      await archive.finalize();

      fsE.emptyDirSync(tempPath);
    });
  }
}

module.exports = ZipStreamPlugin;
