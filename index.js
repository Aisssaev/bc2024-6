const express = require('express');
const { Command } = require('commander');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const {readFileSync, readdirSync, writeFileSync, existsSync, unlinkSync, mkdirSync} = require("fs");
const app = express();
const program = new Command();


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.text());

program
    .option('-h, --host <host>', 'address of the server', '0.0.0.0')
    .option('-p, --port <port>', 'port of the server', 3000)
    .option('-c, --cache <path>', 'path to cache directory', 'cache')

program.parse(process.argv);
const options = program.opts();

const cacheDir = options.cache;
if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
}

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API Documentation',
            version: '1.0.0',
            description: 'Документація вашого API',
        },
        servers: [
            {
                url: 'http://localhost:3000',
            },
        ],
    },
    apis: ['./index.js'], // Шлях до ваших файлів з API
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * components:
 *   schemas:
 *     Note:
 *       type: object
 *       required:
 *         - name
 *         - text
 *       properties:
 *         name:
 *           type: string
 *           description: Назва нотатки
 *         text:
 *           type: string
 *           description: Вміст нотатки
 *       example:
 *         name: "example.txt"
 *         text: "Це приклад нотатки."
 */

/**
 * @swagger
 * /UploadForm.html:
 *   get:
 *     summary: Отримати HTML-форму для завантаження
 *     responses:
 *       200:
 *         description: HTML-форма успішно завантажена
 *       404:
 *         description: Файл форми не знайдено
 */
app.get('/UploadForm.html', (req, res) => {
    const formPath = path.join(__dirname, 'UploadForm.html');
    if (!existsSync(formPath)) {
        return res.status(404).send('Form not found');
    }
    res.sendFile(formPath);
});

/**
 * @swagger
 * /notes/{noteName}:
 *   get:
 *     summary: Отримати нотатку за назвою
 *     parameters:
 *       - in: path
 *         name: noteName
 *         schema:
 *           type: string
 *         required: true
 *         description: Назва нотатки
 *     responses:
 *       200:
 *         description: Нотатка знайдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Note'
 *       404:
 *         description: Нотатку не знайдено
 */
app.get('/notes/:noteName', (req, res) => {
    const notePath = path.join(cacheDir, req.params.noteName);
    if (!existsSync(notePath)) {
        return res.status(404).send('Not Found');
    }

    const noteContent = readFileSync(notePath, 'utf-8');
    res.send(noteContent);
});

/**
 * @swagger
 * /notes/{noteName}:
 *   put:
 *     summary: Оновити існуючу нотатку
 *     parameters:
 *       - in: path
 *         name: noteName
 *         schema:
 *           type: string
 *         required: true
 *         description: Назва нотатки
 *     requestBody:
 *       required: true
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *     responses:
 *       200:
 *         description: Нотатка оновлена
 *       404:
 *         description: Нотатку не знайдено
 */
app.put('/notes/:noteName', (req, res) => {
    const notePath = path.join(cacheDir, req.params.noteName);
    if (!existsSync(notePath)) {
        return res.status(404).send('Not Found');
    }

    const newContent = req.body;
    writeFileSync(notePath, newContent, 'utf-8');
    res.send('Note updated');
});

/**
 * @swagger
 * /notes/{noteName}:
 *   delete:
 *     summary: Видалити нотатку за назвою
 *     parameters:
 *       - in: path
 *         name: noteName
 *         schema:
 *           type: string
 *         required: true
 *         description: Назва нотатки
 *     responses:
 *       200:
 *         description: Нотатка видалена
 *       404:
 *         description: Нотатку не знайдено
 */
app.delete('/notes/:noteName', (req, res) => {
    const notePath = path.join(cacheDir, req.params.noteName);
    if (!existsSync(notePath)) {
        return res.status(404).send('Not Found');
    }

    unlinkSync(notePath);
    res.send('Note deleted');
});

/**
 * @swagger
 * /notes:
 *   get:
 *     summary: Отримати список усіх нотаток
 *     responses:
 *       200:
 *         description: Список нотаток
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Note'
 */
app.get('/notes', (req, res) => {
    const notes = readdirSync(cacheDir).map((fileName) => {
        const content = readFileSync(path.join(cacheDir, fileName), 'utf-8');
        return { name: fileName, text: content };
    });

    res.status(200).json(notes);
});

/**
 * @swagger
 * /write:
 *   post:
 *     summary: Створити нову нотатку
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note_name:
 *                 type: string
 *               note:
 *                 type: string
 *             required:
 *               - note_name
 *               - note
 *             example:
 *               note_name: "example.txt"
 *               note: "Це приклад нотатки."
 *     responses:
 *       201:
 *         description: Нотатка створена
 *       400:
 *         description: Поганий запит
 */
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


// Запуск сервера
app.listen(options.port, options.host, () => {
    console.log(`Server running at http://${options.host}:${options.port}`);
});
