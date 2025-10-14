const http = require("http");
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5051;

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, port: PORT, time: new Date().toISOString() }));
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found", path: req.url }));
});

server.listen(PORT, () => {
  console.log(`Proxy up on http://localhost:${PORT}`);
});
