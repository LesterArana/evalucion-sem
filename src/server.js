// src/server.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use(express.static(path.join(__dirname, '..', 'public')));


app.get('/api/professors', async (_req, res) => {
  try {
    const rows = await prisma.professor.findMany({ orderBy: { name: 'asc' } });
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/api/evaluations', async (req, res) => {
  try {
    const { professorId, q1, q2, q3, q4, q5, comment } = req.body || {};
    const isInt = (n) => Number.isInteger(n);
    const inRange = (n) => isInt(n) && n >= 1 && n <= 5;

    if (!isInt(professorId) || professorId <= 0)
      return res.status(400).json({ error: 'professorId inválido' });

    if (![q1, q2, q3, q4, q5].every(inRange))
      return res.status(400).json({ error: 'q1..q5 deben ser enteros de 1 a 5' });

    const text = (comment ?? '').trim();
    if (!text) return res.status(400).json({ error: 'El comentario es obligatorio' });

    const prof = await prisma.professor.findUnique({ where: { id: professorId } });
    if (!prof) return res.status(404).json({ error: 'Professor not found' });

    const saved = await prisma.evaluation.create({
      data: { professorId, q1, q2, q3, q4, q5, comment: text }
    });

    res.status(201).json({ id: saved.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/api/results', async (req, res) => {
  try {
    const professorId = Number(req.query.professorId);
    if (!Number.isInteger(professorId) || professorId <= 0)
      return res.status(400).json({ error: 'Usa ?professorId= (entero > 0)' });

    const professor = await prisma.professor.findUnique({ where: { id: professorId } });
    if (!professor) return res.status(404).json({ error: 'Professor not found' });

    const profAgg = await prisma.evaluation.aggregate({
      _count: { _all: true },
      _avg: { q1: true, q2: true, q3: true, q4: true, q5: true },
      where: { professorId }
    });

    const totalAgg = await prisma.evaluation.aggregate({
      _count: { _all: true },
      _avg: { q1: true, q2: true, q3: true, q4: true, q5: true }
    });

    const round2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
    const avg5 = (a) =>
      a._count._all === 0
        ? null
        : round2(((a._avg.q1 ?? 0) + (a._avg.q2 ?? 0) + (a._avg.q3 ?? 0) + (a._avg.q4 ?? 0) + (a._avg.q5 ?? 0)) / 5);

    res.json({
      professor: { id: professor.id, name: professor.name, course: professor.course },
      responsesCount: profAgg._count._all,
      professorAvg: avg5(profAgg),
      seminarAvg: avg5(totalAgg)
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`API Postgres lista en http://localhost:${PORT}`));
}

export default app;
