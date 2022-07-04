const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const ModuleFilenameHelpers = require("webpack/lib/ModuleFilenameHelpers");

class ZipStreamPlugin {
  static defaultOptions = {
    setupArchiver: (archive) => archive,
    path: "",
    filename: "",
    include: null,
    exclude: null,
  };

  constructor(options = {}) {
    this.options = { ...ZipStreamPlugin.defaultOptions, ...options };
  }

  apply(compiler) {
    const pluginName = ZipStreamPlugin.name;
    const { webpack } = compiler;
    const { Compilation } = webpack;

    const outputPath = this.options.path || compilation.options.output.path;
    const outputFile = path.resolve(outputPath, this.options.filename);

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
        },
        (assets) => {
          const filterFn = ModuleFilenameHelpers.matchObject.bind(null, {
            include: this.options.include,
            exclude: this.options.exclude,
          });

          let files = Object.keys(assets);
          files = files.filter(filterFn);

          let archive = archiver("zip", {
            zlib: { level: 9 },
          });

          this.options.setupArchiver(archive);

          if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath);
          const output = fs.createWriteStream(outputFile);
          archive.pipe(output);

          output.on("close", function () {
            console.log(archive.pointer() + " total bytes");
            console.log(
              "output:-> archiver has been finalized and the output file descriptor has closed."
            );
          });

          output.on("end", function () {
            console.log("output:-> Data has been drained");
          });

          archive.on("error", function (err) {
            throw err;
          });

          files.forEach((file) => {
            const buffer = Buffer.from(file);
            archive.append(buffer, { name: file });
          });

          archive.finalize().then(() => {
            console.log("\nZipping is completed!");
          });
        }
      );
    });
  }
}

module.exports = ZipStreamPlugin;
