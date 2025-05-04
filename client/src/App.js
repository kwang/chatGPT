import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Box,
  CircularProgress,
  IconButton
} from '@mui/material';
import { Mic, MicOff, VolumeUp, VolumeOff } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
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
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
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

  return (
    <Container maxWidth="md" sx={{ height: '100vh', py: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          p: 2
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom align="center">
          AI Voice Interview Assistant
        </Typography>
        
        {serverStatus === 'checking' && (
          <Box sx={{ textAlign: 'center', my: 2 }}>
            <CircularProgress size={24} />
            <Typography>Connecting to server...</Typography>
          </Box>
        )}

        {serverStatus === 'error' && (
          <Box sx={{ textAlign: 'center', my: 2, color: 'error.main' }}>
            <Typography>Unable to connect to server. Please check if the server is running.</Typography>
          </Box>
        )}

        {serverStatus === 'connected' && (
          <>
            <Box 
              sx={{ 
                flex: 1, 
                overflowY: 'auto', 
                mb: 2,
                p: 2,
                backgroundColor: '#f5f5f5',
                borderRadius: 1
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
                      backgroundColor: message.role === 'user' ? '#e3f2fd' : '#fff'
                    }}
                  >
                    <Typography>{message.content}</Typography>
                  </Paper>
                </Box>
              ))}
              {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <IconButton 
                onClick={toggleListening}
                color={isListening ? 'error' : 'primary'}
                sx={{ mr: 1 }}
              >
                {isListening ? <MicOff /> : <Mic />}
              </IconButton>
              
              <IconButton 
                onClick={toggleSpeaking}
                color={isSpeaking ? 'primary' : 'default'}
                sx={{ mr: 1 }}
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
                  />
                  <Button 
                    variant="contained" 
                    type="submit"
                    disabled={isLoading || (!input.trim() && !isListening)}
                  >
                    Send
                  </Button>
                </Box>
              </form>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
}

export default App; 