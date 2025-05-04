import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from '@mui/material';
import { ExpandMore, Refresh, Delete } from '@mui/icons-material';

function AnswerEvaluator() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [evaluations, setEvaluations] = useState({});

  // Load interview history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('interviewHistory');
    if (savedHistory) {
      setInterviewHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save interview history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('interviewHistory', JSON.stringify(interviewHistory));
  }, [interviewHistory]);

  const evaluateAnswer = async (q, a) => {
    if (!q.trim() || !a.trim()) {
      setError('Please provide both question and answer');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('Sending evaluation request:', { question: q, answer: a });
      const response = await fetch('http://localhost:3001/api/evaluate-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question: q,
          answer: a
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to evaluate answer');
      }

      const data = await response.json();
      console.log('Received evaluation:', data);
      return data.evaluation;
    } catch (error) {
      console.error('Error evaluating answer:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvaluate = async () => {
    try {
      const result = await evaluateAnswer(question, answer);
      setEvaluation(result);
      // Add to evaluations map
      setEvaluations(prev => ({
        ...prev,
        [`${question}-${answer}`]: result
      }));
    } catch (error) {
      setError(error.message || 'Failed to evaluate answer. Please try again.');
    }
  };

  const evaluateAll = async () => {
    setIsLoading(true);
    setError('');

    try {
      const newEvaluations = {};
      for (const item of interviewHistory) {
        try {
          const evaluation = await evaluateAnswer(item.question, item.answer);
          newEvaluations[`${item.question}-${item.answer}`] = evaluation;
        } catch (error) {
          console.error(`Failed to evaluate: ${item.question}`, error);
        }
      }
      setEvaluations(newEvaluations);
    } catch (error) {
      setError('Failed to evaluate some answers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setQuestion('');
    setAnswer('');
    setEvaluation(null);
    setEvaluations({});
  };

  const deleteEvaluation = (key) => {
    setEvaluations(prev => {
      const newEvaluations = { ...prev };
      delete newEvaluations[key];
      return newEvaluations;
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3,
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{
            color: 'primary.main',
            fontWeight: 'bold',
            mb: 4,
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          Answer Evaluator
        </Typography>

        {interviewHistory.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
              Interview History
            </Typography>
            <Button
              variant="contained"
              onClick={evaluateAll}
              disabled={isLoading}
              startIcon={<Refresh />}
              sx={{ mb: 2 }}
            >
              Evaluate All Answers
            </Button>
            <List>
              {interviewHistory.map((item, index) => (
                <Accordion key={index} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>
                      Q{index + 1}: {item.question.substring(0, 50)}...
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="subtitle2" gutterBottom>
                      Question:
                    </Typography>
                    <Typography paragraph>{item.question}</Typography>
                    <Typography variant="subtitle2" gutterBottom>
                      Answer:
                    </Typography>
                    <Typography paragraph>{item.answer}</Typography>
                    {evaluations[`${item.question}-${item.answer}`] && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Evaluation:
                        </Typography>
                        <Chip 
                          label={`${evaluations[`${item.question}-${item.answer}`].score}/10`} 
                          color={evaluations[`${item.question}-${item.answer}`].score >= 7 ? "success" : 
                                evaluations[`${item.question}-${item.answer}`].score >= 5 ? "warning" : "error"}
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {evaluations[`${item.question}-${item.answer}`].suggestions}
                        </Typography>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </List>
          </Box>
        )}

        <Typography 
          variant="body1" 
          color="text.secondary" 
          paragraph
          sx={{ mb: 4 }}
        >
          Enter your interview question and answer to receive detailed feedback and suggestions for improvement.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            label="Interview Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter the interview question..."
            error={!!error}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          <TextField
            fullWidth
            multiline
            rows={6}
            variant="outlined"
            label="Your Answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter your answer..."
            error={!!error}
            helperText={error}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            onClick={handleEvaluate}
            disabled={isLoading || !question.trim() || !answer.trim()}
            fullWidth
            sx={{
              py: 1.5,
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }
            }}
          >
            Evaluate Answer
          </Button>
          {evaluation && (
            <Button
              variant="outlined"
              onClick={clearAll}
              color="error"
              sx={{
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }
              }}
            >
              Clear All
            </Button>
          )}
        </Box>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress color="primary" />
          </Box>
        )}

        {evaluation && (
          <Paper 
            variant="outlined" 
            sx={{ 
              mt: 3, 
              p: 3,
              borderRadius: 2,
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{
                color: 'primary.main',
                fontWeight: 'bold',
                mb: 3
              }}
            >
              Evaluation Results
            </Typography>
            
            <Stack spacing={3}>
              <Box>
                <Typography 
                  variant="subtitle1" 
                  gutterBottom
                  sx={{ fontWeight: 'bold' }}
                >
                  Overall Score
                </Typography>
                <Chip 
                  label={`${evaluation.score}/10`} 
                  color={evaluation.score >= 7 ? "success" : evaluation.score >= 5 ? "warning" : "error"}
                  sx={{ 
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    py: 1
                  }}
                />
              </Box>

              <Box>
                <Typography 
                  variant="subtitle1" 
                  gutterBottom
                  sx={{ fontWeight: 'bold' }}
                >
                  Strengths
                </Typography>
                <List>
                  {evaluation.strengths.map((strength, index) => (
                    <ListItem 
                      key={index}
                      sx={{
                        backgroundColor: 'success.light',
                        color: 'success.contrastText',
                        borderRadius: 1,
                        mb: 1,
                        '&:last-child': { mb: 0 }
                      }}
                    >
                      <ListItemText primary={strength} />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Box>
                <Typography 
                  variant="subtitle1" 
                  gutterBottom
                  sx={{ fontWeight: 'bold' }}
                >
                  Areas for Improvement
                </Typography>
                <List>
                  {evaluation.improvements.map((improvement, index) => (
                    <ListItem 
                      key={index}
                      sx={{
                        backgroundColor: 'warning.light',
                        color: 'warning.contrastText',
                        borderRadius: 1,
                        mb: 1,
                        '&:last-child': { mb: 0 }
                      }}
                    >
                      <ListItemText primary={improvement} />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Box>
                <Typography 
                  variant="subtitle1" 
                  gutterBottom
                  sx={{ fontWeight: 'bold' }}
                >
                  Suggestions
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2,
                    backgroundColor: 'info.light',
                    color: 'info.contrastText',
                    borderRadius: 1
                  }}
                >
                  <Typography variant="body2">
                    {evaluation.suggestions}
                  </Typography>
                </Paper>
              </Box>
            </Stack>
          </Paper>
        )}
      </Paper>
    </Container>
  );
}

export default AnswerEvaluator; 