import { startServer } from "@swiftly/core/lib/server"
import routes from "./routes"

startServer(routes, __dirname);
