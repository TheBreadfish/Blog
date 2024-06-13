const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');

const MarkdownIt = require('markdown-it');  // Correctly require markdown-it
const markdown = new MarkdownIt();  // Create an instance of markdown-it

const port = 8080;

function format(markdownString) {
    return markdown.render(markdownString);  // Use the instance's render method
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

async function getMostRecentFile(dir) {
    try {
        const files = await fs.readdir(dir);
        const textFiles = files.filter(file => file.endsWith('.txt') && /^\d{4}-\d{2}-\d{2}\.txt$/.test(file));

        if (textFiles.length === 0) {
            throw new Error('No text files found');
        }

        // Extract dates from filenames and find the most recent one
        const recentFile = textFiles.reduce((latest, file) => {
            const currentDate = file.split('.txt')[0];
            return (!latest || currentDate > latest) ? currentDate : latest;
        }, null);

        return recentFile
    } catch (error) {
        console.error(`Got an error trying to read the directory: ${error.message}`);
        return null;
    }
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;

    console.log(req.method, pathname);

    if (req.method === "GET" && pathname === "/") {
        const pagesDir = path.join(__dirname, 'pages');
        const recentFile = await getMostRecentFile(pagesDir);

        if (recentFile) {
            res.writeHead(200, { "Content-Type": "text/html" });
            var fileContent = (await readFile(path.join(__dirname, 'pages/welcome.txt')))
            fileContent = fileContent.replace('$$-INSERT_PAGE_LINK-$$', '/pages/' + recentFile).replace('$$-INSERT_PAGE_TITLE-$$', recentFile + '.txt')
            formattedContent = format(fileContent)
            res.end(formattedContent);
        } else {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end("404: No recent file found");
        }
    } else if (req.method === "GET" && pathname.startsWith("/pages/")) {
        res.writeHead(200, { "Content-Type": "text/html" });

        const filePath = path.join(__dirname, 'pages', `${pathname.replace('/pages/', '')}.txt`);
        const markdownContent = await readFile(filePath);
        const formattedContent = format(markdownContent);

        res.end(formattedContent);
    } else {
        res.writeHead(404, { "Content-Type": "text/html" })
        res.end("404: Page not found, are you an idiot? There is no page here.")
    }
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
