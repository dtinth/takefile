const fastify = require("fastify")();
const fs = require("fs");
const util = require("util");
const path = require("path");
const { pipeline } = require("stream");
const pump = util.promisify(pipeline);
const Ajv = require("ajv");
const ajv = new Ajv();

const config = (() => {
  try {
    const schema = {
      type: "object",
      properties: {
        port: { type: "integer" },
        host: { type: "string" },
      },
      required: ["port", "host"],
    };
    const data = JSON.parse(
      fs.readFileSync(
        path.join(process.env.HOME, ".takefile.config.json"),
        "utf8"
      )
    );
    const validate = ajv.compile(schema);
    const valid = validate(data);
    if (!valid) {
      throw new Error("Invalid config: " + ajv.errorsText(validate.errors));
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `No config file found. Please create a config file at \`~/.takefile.config.json\` containing the "port" and "host" properties.`
      );
    }
    throw error;
  }
})();

fastify.register(require("fastify-multipart"));

fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "public"),
});

fastify.post("/", async function (req, reply) {
  const data = await req.file();
  const target = path.join("/tmp/takefile", path.basename(data.filename));
  fs.mkdirSync("/tmp/takefile", { recursive: true });
  console.log("Receiving %s to %s", data.filename, target);
  await pump(data.file, fs.createWriteStream(target));

  reply.send("done!");
});

fastify.listen(3099, "100.89.240.124", (err) => {
  if (err) throw err;
  console.log(`server listening on ${fastify.server.address().port}`);
});
