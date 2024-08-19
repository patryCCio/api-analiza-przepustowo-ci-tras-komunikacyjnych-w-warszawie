import { getPort, initServer } from "./app.js";

(async () => {
    const PORT = await getPort();
    initServer(PORT);
})();





