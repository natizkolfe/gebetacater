/**
 * cPanel / TMDHosting Node.js Selector startup file.
 * Application startup file must be: app.js
 * Uses process.env.PORT from the host — do not hardcode a port.
 *
 * Before Start App, run once in Terminal (after activating the Node env):
 *   npm install
 *   npm run build
 */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

if (!process.env.NODE_ENV) process.env.NODE_ENV = "production";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error handling", req.url, err);
        res.statusCode = 500;
        res.end("internal server error");
      }
    }).listen(port, hostname, (err) => {
      if (err) throw err;
      console.log(`Gebeta ready on http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start Gebeta", err);
    process.exit(1);
  });
