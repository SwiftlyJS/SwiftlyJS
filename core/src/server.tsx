
import minimist from "minimist"
import fs from "fs"
import path from "path"
import http from "http"
import { match } from "path-to-regexp"
import { RouteSpec } from "./types";
import { StaticRouter } from "react-router-dom/server"
import ReactDOMServer from "react-dom/server";
import mime from "mime"
import { pathExists } from "fs-extra"

export interface Request extends http.IncomingMessage {
  path: string;
}

type QueryParams = Record<string, string | null>;

function parseURL(url: string): [path: string, query: QueryParams] {
  let query: QueryParams = {};
  const i = url.indexOf('?');
  let path;
  if (i !== -1) {
    const queryStr = url.substring(i + 1);
    for (const chunk of queryStr.split('&')) {
      path = url;
      const [keyStr, valueStr] = chunk.split('=');
      const key = decodeURIComponent(keyStr);
      const value = valueStr === undefined
        ? null : decodeURIComponent(valueStr);
      query[key] = value;
    }
    path = url.substring(0, i);
  } else {
    path = url;
  }
  return [path, query];
}

export async function startServer(routeSpecList: RouteSpec[]) {

  const args = minimist(process.argv.slice(2));

  const port = args.port ?? 3000;

  const routes = routeSpecList.map(routeSpec => { 
    let path = routeSpec.path;
    if (path.endsWith('/index')) {
      path = path.substring(0, routeSpec.path.length - 6)
    }
    return {
      ...routeSpec,
      path,
      matcher: match(path),
    }
  });

  const server = http.createServer(async (req, res) => {

    const [pathname, query] = parseURL(req.url!);

    const assetPath = path.join(path.dirname(process.argv[1]), 'public', pathname);

    let stats;
    try {
      stats = await fs.promises.stat(assetPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    if (stats && stats.isFile()) {
      const extensionIndex = pathname.indexOf('.');
      if (extensionIndex !== -1) {
        const mimeType = mime.getType(pathname.substring(extensionIndex));
        if (mimeType) {
          res.setHeader('Content-Type', mimeType);
        }
      }
      fs.createReadStream(assetPath).pipe(res);
      return;
    }

    for (const route of routes) {

      const matchResult = route.matcher(pathname);

      if (matchResult) {
        const htmlStream = ReactDOMServer.renderToPipeableStream(
          <html>
            <head>
              <meta content="width=device-width, initial-scale=1" name="viewport" />
            </head>
            <body>
              <div id="root">
                <StaticRouter location={req.url!}>
                  {route.render()}
                </StaticRouter>
              </div>
              <script src="/browser.bundle.js" async defer />
            </body>
          </html>
        );
        htmlStream.pipe(res);
        return;
      }

    }

    res.statusCode = 404;
    res.end();

  });

  await new Promise<void>(accept => {
    server.listen(port, accept);
  });

  console.error(`Server active and available on http://localhost:${port}/`);

}

