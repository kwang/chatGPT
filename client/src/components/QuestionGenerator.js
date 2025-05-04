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
  IconButton,
  Tooltip
} from '@mui/material';
import { ContentCopy, Refresh, Delete } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';

function QuestionGenerator() {
  const [jobDescription, setJobDescription] = useState(() => {
    const saved = localStorage.getItem('jobDescription');
    return saved || '';
  });
  const [questions, setQuestions] = useState(() => {
    const saved = localStorage.getItem('generatedQuestions');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId] = useState(() => {
    const saved = localStorage.getItem('sessionId');
    return saved || uuidv4();
  });

  // Save to localStorage whenever jobDescription or questions change
  useEffect(() => {
    localStorage.setItem('jobDescription', jobDescription);
    localStorage.setItem('generatedQuestions', JSON.stringify(questions));
    localStorage.setItem('sessionId', sessionId);
  }, [jobDescription, questions, sessionId]);

  const generateQuestions = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jobDescription,
          sessionId 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      setQuestions(data.questions);
    } catch (error) {
      setError('Failed to generate questions. Please try again.');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const deleteQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const regenerateQuestions = () => {
    setQuestions([]);
    generateQuestions();
  };

  const clearAll = () => {
    setJobDescription('');
    setQuestions([]);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Interview Question Generator
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Enter a job description below, and we'll generate relevant interview questions.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={6}
            variant="outlined"
            label="Job Description"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
            error={!!error}
            helperText={error}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            onClick={generateQuestions}
            disabled={isLoading || !jobDescription.trim()}
            fullWidth
          >
            Generate Questions
          </Button>
          {questions.length > 0 && (
            <>
              <Button
                variant="outlined"
                onClick={regenerateQuestions}
                disabled={isLoading}
                startIcon={<Refresh />}
              >
                Regenerate
              </Button>
              <Button
                variant="outlined"
                onClick={clearAll}
                color="error"
              >
                Clear All
              </Button>
            </>
          )}
        </Box>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {questions.length > 0 && (
          <Paper variant="outlined" sx={{ mt: 3 }}>
            <List>
              {questions.map((question, index) => (
                <React.Fragment key={index}>
                  <ListItem
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Copy question">
                          <IconButton
                            edge="end"
                            onClick={() => copyToClipboard(question)}
                          >
                            <ContentCopy />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete question">
                          <IconButton
                            edge="end"
                            onClick={() => deleteQuestion(index)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={`${index + 1}. ${question}`}
                      sx={{ pr: 8 }}
                    />
                  </ListItem>
                  {index < questions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
      </Paper>
    </Container>
  );
}

export default QuestionGenerator; 