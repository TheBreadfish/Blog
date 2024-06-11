const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');

const markdown = require('markdown-it')();

const port = 8080;

function format(markdownString) {
    return markdown.render(markdownString.toString());
}

async function readFile(filePath) {
    try {
        const data = await fs.readFile(filePath);
        return data.toString();
    } catch (error) {
        console.error(`Got an error trying to read the file: ${error.message}`);
        return "404: File not found";
    }
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;

    if (req.method === "GET" && pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });

        let currentDate = new Date();
        currentDate = currentDate.toISOString().split('T')[0];
        console.log(currentDate);

        const file =
            `Redirecting you to /pages/${currentDate}.txt

            <script>
                window.location.href = '/pages/${currentDate}';
            </script>`;

        res.end(file);
    } else if (req.method === "GET" && pathname.startsWith("/pages/")) {
        res.writeHead(200, { "Content-Type": "text/html"});

        const filePath = path.join(__dirname, pathname.substring(0, pathname.length - 1), '.txt');
        const markdownContent = await readFile(filePath);
        const formattedContent = format(markdownContent);

        res.end(formattedContent);
    }
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});