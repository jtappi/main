const fs   = require('fs').promises;
const path = require('path');

const questionsPath = process.env.TMW_QUESTIONS_FILE ||
  path.join(__dirname, '../data/questions.json');

const getQuestions = async (req, res) => {
  try {
    const data = await fs.readFile(questionsPath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      res.status(500).json({ error: 'Failed to load questions' });
    }
  }
};

const saveQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    const newQuestion = {
      id:           Date.now(),
      question,
      answer:       null,
      creationDate: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
      answeredDate: null
    };
    let questions = [];
    try {
      const data = await fs.readFile(questionsPath, 'utf8');
      questions = JSON.parse(data);
    } catch (_) { /* file missing on first run */ }
    questions.push(newQuestion);
    await fs.writeFile(questionsPath, JSON.stringify(questions, null, 2));
    res.json(newQuestion);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save question' });
  }
};

const updateAnswer = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { question, answer } = req.body;
    const data = await fs.readFile(questionsPath, 'utf8');
    const questions = JSON.parse(data);
    const idx = questions.findIndex(q => q.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Question not found' });
    if (question && question !== questions[idx].question) {
      questions[idx].question = question;
    }
    if (answer !== undefined) {
      questions[idx].answer = answer;
      questions[idx].answeredDate = answer.trim().length > 0
        ? new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
        : null;
    }
    await fs.writeFile(questionsPath, JSON.stringify(questions, null, 2));
    res.json(questions[idx]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update question/answer' });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = await fs.readFile(questionsPath, 'utf8');
    let questions = JSON.parse(data);
    questions = questions.filter(q => q.id !== id);
    await fs.writeFile(questionsPath, JSON.stringify(questions, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete question' });
  }
};

module.exports = { getQuestions, saveQuestion, updateAnswer, deleteQuestion };
