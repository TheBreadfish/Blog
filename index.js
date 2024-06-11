const http = require('http');
const fs = require('fs').promises;
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
        return undefined;
    }
}

function fileExists(filePath) {
    try {
        fs.accessSync(filePath, fs.constants.F_OK);
        return true;
    } catch (err) {
        return false;
    }
}

async function createFile(filePath, fileContent) {
    try {
        await fs.writeFile(filePath, fileContent);
        console.log('File created successfully:', filePath);
    } catch (err) {
        console.error('Error creating the file:', err);
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
            `Redirecting you to ./pages/${currentDate}.txt

            <script>
                window.location.href = './pages/${currentDate}';
            </script>`;

        res.end(file);
    } else if (req.method === "GET" && pathname.startsWith("/pages/")) {
        res.writeHead(200, { "Content-Type": "text/html"});

        file = format(readFile(pathname.replace('/pages/', '/pages-source/')))
        
        res.end(file);
    }

    // Helper function to check if a file exists
    async function fileExists(path) {
        try {
            await fs.promises.access(path);
            return true;
        } catch {
            return false;
        }
    }
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
