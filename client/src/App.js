import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Box,
  CircularProgress,
  IconButton,
  Tabs,
  Tab,
  ThemeProvider,
  createTheme
} from '@mui/material';
import { Mic, MicOff, VolumeUp, VolumeOff } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import QuestionGenerator from './components/QuestionGenerator';
import AnswerEvaluator from './components/AnswerEvaluator';
import './App.css';

// Create a custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    secondary: {
      main: '#f50057',
      light: '#ff4081',
      dark: '#c51162',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9))',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            color: '#2196f3',
            fontWeight: 'bold',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 'bold',
        },
      },
    },
  },
});

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [activeTab, setActiveTab] = useState(0);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const toggleSpeaking = () => {
    setIsSpeaking(!isSpeaking);
  };

  const speakText = useCallback((text) => {
    if (!isSpeaking) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      setIsLoading(false);
    };
    speechRef.current.speak(utterance);
  }, [isSpeaking]);

  const handleSubmit = useCallback(async (e, voiceInput = null) => {
    if (e) e.preventDefault();
    const userMessage = voiceInput || input.trim();
    if (!userMessage) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      console.log('Sending message to server...');
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId
        }),
      });

      console.log('Server response:', response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Server data:', data);
      const aiResponse = data.response;
      setMessages(prev => {
        const newMessages = [...prev, { role: 'assistant', content: aiResponse }];
        
        // Save to interview history if it's a Q&A pair
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant') {
          const interviewHistory = JSON.parse(localStorage.getItem('interviewHistory') || '[]');
          interviewHistory.push({
            question: prev[prev.length - 1].content,
            answer: userMessage,
            timestamp: new Date().toISOString()
          });
          localStorage.setItem('interviewHistory', JSON.stringify(interviewHistory));
        }
        
        return newMessages;
      });
      speakText(aiResponse);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = 'Sorry, there was an error connecting to the server. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
      speakText(errorMessage);
      setServerStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [input, sessionId, speakText]);

  // Test server connection
  useEffect(() => {
    const testServerConnection = async () => {
      try {
        console.log('Testing server connection...');
        const response = await fetch('http://localhost:3001/api/test');
        console.log('Server response:', response);
        if (response.ok) {
          const data = await response.json();
          console.log('Server data:', data);
          setServerStatus('connected');
        } else {
          console.error('Server response not OK:', response.status);
          setServerStatus('error');
        }
      } catch (error) {
        console.error('Server connection error:', error);
        setServerStatus('error');
      }
    };

    testServerConnection();
  }, []);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSubmit(null, transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Initialize speech synthesis
    speechRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (speechRef.current) {
        speechRef.current.cancel();
      }
    };
  }, [handleSubmit]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
        py: 4
      }}>
        <Container maxWidth="lg">
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
              AI Interview Assistant
            </Typography>

            <Box 
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider', 
                mb: 3,
                '& .MuiTabs-indicator': {
                  backgroundColor: 'primary.main',
                  height: 3,
                }
              }}
            >
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange} 
                centered
                sx={{
                  '& .MuiTab-root': {
                    fontSize: '1.1rem',
                    py: 2,
                  }
                }}
              >
                <Tab label="Question Generator" />
                <Tab label="Interview" />
                <Tab label="Answer Evaluator" />
              </Tabs>
            </Box>

            {serverStatus === 'checking' && (
              <Box sx={{ textAlign: 'center', my: 4 }}>
                <CircularProgress size={40} color="primary" />
                <Typography sx={{ mt: 2, color: 'text.secondary' }}>
                  Connecting to server...
                </Typography>
              </Box>
            )}

            {serverStatus === 'error' && (
              <Box 
                sx={{ 
                  textAlign: 'center', 
                  my: 4, 
                  p: 3,
                  bgcolor: 'error.light',
                  color: 'error.contrastText',
                  borderRadius: 2
                }}
              >
                <Typography>
                  Unable to connect to server. Please check if the server is running.
                </Typography>
              </Box>
            )}

            {serverStatus === 'connected' && (
              <>
                {activeTab === 0 && <QuestionGenerator />}
                {activeTab === 1 && (
                  <>
                    <Box 
                      sx={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        mb: 2,
                        p: 2,
                        backgroundColor: '#f8f9fa',
                        borderRadius: 2,
                        minHeight: '400px',
                        maxHeight: '600px'
                      }}
                    >
                      {messages.map((message, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                            mb: 2
                          }}
                        >
                          <Paper
                            elevation={1}
                            sx={{
                              p: 2,
                              maxWidth: '70%',
                              backgroundColor: message.role === 'user' 
                                ? 'primary.light' 
                                : 'background.paper',
                              color: message.role === 'user' 
                                ? 'primary.contrastText' 
                                : 'text.primary',
                              borderRadius: 2,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          >
                            <Typography>{message.content}</Typography>
                          </Paper>
                        </Box>
                      ))}
                      {isLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                          <CircularProgress size={24} color="primary" />
                        </Box>
                      )}
                      <div ref={messagesEndRef} />
                    </Box>

                    <Box 
                      sx={{ 
                        display: 'flex', 
                        gap: 1, 
                        alignItems: 'center',
                        p: 2,
                        backgroundColor: 'background.paper',
                        borderRadius: 2,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      <IconButton 
                        onClick={toggleListening}
                        color={isListening ? 'error' : 'primary'}
                        sx={{ 
                          mr: 1,
                          '&:hover': {
                            backgroundColor: isListening ? 'error.light' : 'primary.light',
                          }
                        }}
                      >
                        {isListening ? <MicOff /> : <Mic />}
                      </IconButton>
                      
                      <IconButton 
                        onClick={toggleSpeaking}
                        color={isSpeaking ? 'primary' : 'default'}
                        sx={{ 
                          mr: 1,
                          '&:hover': {
                            backgroundColor: isSpeaking ? 'primary.light' : 'action.hover',
                          }
                        }}
                      >
                        {isSpeaking ? <VolumeUp /> : <VolumeOff />}
                      </IconButton>

                      <form onSubmit={handleSubmit} style={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Type your message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading || isListening}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                              }
                            }}
                          />
                          <Button 
                            variant="contained" 
                            type="submit"
                            disabled={isLoading || (!input.trim() && !isListening)}
                            sx={{
                              px: 4,
                              '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              }
                            }}
                          >
                            Send
                          </Button>
                        </Box>
                      </form>
                    </Box>
                  </>
                )}
                {activeTab === 2 && <AnswerEvaluator />}
              </>
            )}
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App; 