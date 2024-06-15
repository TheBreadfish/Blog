const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');

const MarkdownIt = require('markdown-it');  // Correctly require markdown-it
const markdown = new MarkdownIt({ html: true });  // Create an instance of markdown-it

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

async function listTextFiles(dir) {
    try {
        const files = await fs.readdir(dir);
        const textFiles = files.filter(file => file.endsWith('.txt'));
        return textFiles;
    } catch (error) {
        console.error(`Error reading the directory: ${error.message}`);
        return [];
    }
}

let pageListFormatted = '<ul>';
var hiddenPages = '';

const initializePageList = async () => {
    const pageList = await listTextFiles(path.join(__dirname, 'pages'));
    hiddenPages = JSON.parse(await readFile(path.join(__dirname, 'page-blacklist') + '.json')).hidden
    console.log('Pages: ', pageList);

    for (let i = 0; i < pageList.length; i++) {
        if (!hiddenPages.includes(pageList[i])) {
            pageListFormatted += `
            <li><a href="${path.join('pages', pageList[i]).replace('.txt', '')}"> ${pageList[i]} </a></li>
            `
        }
    }
    pageListFormatted += '</ul>'
};

initializePageList();


async function addHeader(formattedContent, pageName) {
    var pageHeader = (await readFile(path.join(__dirname, '/pages/header.html'))).toString()
    pageHeader = pageHeader.replace('$$-INSERT_PAGE_NAME-$$', pageName)

    return `
    ${pageHeader} <div id="content"> ${formattedContent} </div>

    <script>
        window.onload = function() {
            twemoji.parse(document.body, {folder: 'svg', ext: '.svg'})
        }
    </script>
    `
}

const getContentType = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ico': 'image/vnd.microsoft.icon'
    };

    return mimeTypes[ext] || 'application/octet-stream';
};


/*
SERVER CODE
*/


const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;

    console.log(req.method, pathname);
    

    if (req.method === "GET" && pathname === "/") {
        //WELCOME PAGE

        const pagesDir = path.join(__dirname, 'pages');
        const recentFile = await getMostRecentFile(pagesDir);

        if (recentFile) {
            res.writeHead(200, { "Content-Type": "text/html" });
            
            var fileContent = (await readFile(path.join(__dirname, 'pages/welcome.txt')))
            fileContent = fileContent.replace('$$-INSERT_PAGE_LINK-$$', '/pages/' + recentFile).replace('$$-INSERT_PAGE_TITLE-$$', recentFile + '.txt')
            formattedContent = format(fileContent).replace('$$-INSERT_PAGE_DIR-$$', pageListFormatted)

            res.end(await addHeader(formattedContent, 'welcome.txt | Home | TBF'));
        } else {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end("404: No recent file found");
        }
    } else if (req.method === "GET" && pathname.startsWith("/pages/")) {
        //BLOG PAGES

        if (!hiddenPages.includes(pathname.replace('/pages/', '') + '.txt')) {
            res.writeHead(200, { "Content-Type": "text/html" });
            
            const filePath = path.join(__dirname, 'pages', `${pathname.replace('/pages/', '')}.txt`);
            const markdownContent = await readFile(filePath);
            const formattedContent = format(markdownContent);

            res.end(await addHeader(formattedContent, `${pathname.replace('/pages/', '')}.txt | Blog | TBF`));
        }   else {
            res.writeHead(403, { "Content-Type": "text/html"})
            res.end('403: Page Hidden, why are you trying to find random files on here wtf? See the <a href="https://github.com/TheBreadfish/Blog">github</a> for the page smh.')
        }
        
    } else if (req.method === "GET" && pathname.startsWith("/files/")) {
        // BLOG IMAGES / FILES
        const filePath = path.join(__dirname, pathname);
        try {
            const fileContent = await fs.readFile(filePath);
            const contentType = getContentType(filePath);

            res.writeHead(200, { "Content-Type": contentType });
            res.end(fileContent);
        } catch (error) {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end("404: File not found, 💀");
        }
    } else {
        res.writeHead(404, { "Content-Type": "text/html" })
        res.end("404: Page not found, are you an idiot? There is no page here.")
    }
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
