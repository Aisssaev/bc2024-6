const express = require('express');
const { Command } = require('commander');
const path = require('path');
const {readFileSync, readdirSync, writeFileSync, existsSync, unlinkSync, mkdirSync} = require("fs");
const app = express();
const program = new Command();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.text());

program
    .option('-h, --host <host>', 'address of the server', 'localhost')
    .option('-p, --port <port>', 'port of the server', 3000)
    .option('-c, --cache <path>', 'path to cache directory')

program.parse(process.argv);
const options = program.opts();

const cacheDir = options.cache;
if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
}

app.get('/UploadForm.html', (req, res) => {
    const formPath = path.join(__dirname, 'UploadForm.html');
    if (!existsSync(formPath)) {
        return res.status(404).send('Form not found');
    }
    res.sendFile(formPath);
});

app.get('/notes/:noteName', (req, res) => {
    const notePath = path.join(cacheDir, req.params.noteName);
    if (!existsSync(notePath)) {
        return res.status(404).send('Not Found');
    }

    const noteContent = readFileSync(notePath, 'utf-8');
    res.send(noteContent);
});

app.put('/notes/:noteName', (req, res) => {
    const notePath = path.join(cacheDir, req.params.noteName);
    if (!existsSync(notePath)) {
        return res.status(404).send('Not Found');
    }

    const newContent = req.body;
    writeFileSync(notePath, newContent, 'utf-8');
    res.send('Note updated');
});

app.delete('/notes/:noteName', (req, res) => {
    const notePath = path.join(cacheDir, req.params.noteName);
    if (!existsSync(notePath)) {
        return res.status(404).send('Not Found');
    }

    unlinkSync(notePath);
    res.send('Note deleted');
});

app.get('/notes', (req, res) => {
    const notes = readdirSync(cacheDir).map((fileName) => {
        const content = readFileSync(path.join(cacheDir, fileName), 'utf-8');
        return { name: fileName, text: content };
    });

    res.status(200).json(notes);
});

app.post('/write', (req, res) => {
    const { note_name, note } = req.body;

    if (!note_name || !note) {
        return res.status(400).send('Bad Request: Missing note name or content');
    }

    const notePath = path.join(cacheDir, note_name);
    if (existsSync(notePath)) {
        return res.status(400).send('Bad Request: Note already exists');
    }

    writeFileSync(notePath, note, 'utf-8');
    res.status(201).send('Note created');
});

app.get('/UploadForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'UploadForm.html'));
});

// Запуск сервера
app.listen(options.port, options.host, () => {
    console.log(`Server running at http://${options.host}:${options.port}`);
});
