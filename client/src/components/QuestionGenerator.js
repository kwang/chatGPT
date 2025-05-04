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
          Interview Question Generator
        </Typography>

        <Typography 
          variant="body1" 
          color="text.secondary" 
          paragraph
          sx={{ mb: 4 }}
        >
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
            onClick={generateQuestions}
            disabled={isLoading || !jobDescription.trim()}
            fullWidth
            sx={{
              py: 1.5,
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }
            }}
          >
            Generate Questions
          </Button>
          {questions.length > 0 && (
            <Button
              variant="outlined"
              onClick={regenerateQuestions}
              disabled={isLoading}
              startIcon={<Refresh />}
              sx={{
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }
              }}
            >
              Regenerate
            </Button>
          )}
        </Box>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress color="primary" />
          </Box>
        )}

        {questions.length > 0 && (
          <Paper 
            variant="outlined" 
            sx={{ 
              mt: 3,
              borderRadius: 2,
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}
          >
            <List>
              {questions.map((question, index) => (
                <React.Fragment key={index}>
                  <ListItem
                    sx={{
                      backgroundColor: index % 2 === 0 ? 'background.paper' : 'action.hover',
                      '&:hover': {
                        backgroundColor: 'action.selected',
                      }
                    }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Copy question">
                          <IconButton
                            edge="end"
                            onClick={() => copyToClipboard(question)}
                            sx={{
                              '&:hover': {
                                backgroundColor: 'primary.light',
                                color: 'primary.contrastText',
                              }
                            }}
                          >
                            <ContentCopy />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete question">
                          <IconButton
                            edge="end"
                            onClick={() => deleteQuestion(index)}
                            color="error"
                            sx={{
                              '&:hover': {
                                backgroundColor: 'error.light',
                                color: 'error.contrastText',
                              }
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={`${index + 1}. ${question}`}
                      sx={{ 
                        pr: 8,
                        '& .MuiListItemText-primary': {
                          color: 'text.primary',
                          fontWeight: 500,
                        }
                      }}
                    />
                  </ListItem>
                  {index < questions.length - 1 && (
                    <Divider sx={{ opacity: 0.5 }} />
                  )}
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