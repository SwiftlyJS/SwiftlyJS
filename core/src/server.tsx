
import minimist from "minimist"
import http from "http"
import { Route } from "./types";

export async function startServer(routes: Route[]) {

  const args = minimist(process.argv.slice(2));

  const port = args.port ?? 3000;

  const server = http.createServer((req, res) => {

  });

  await new Promise<void>(accept => {
    server.listen(port, accept);
  });

  console.error(`Server active and available on http://localhost:${port}/`);

}

