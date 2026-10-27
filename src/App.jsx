import React, { useState, useMemo } from 'react';
import Header from './components/Header';
import EmailInput from './components/EmailInput';
import ResultsTable from './components/ResultsTable';
import { verifyEmails } from './services/verificationService';
import './App.css';

/**
 * Parses raw input text into non-empty, trimmed lines.
 * Preserves duplicate lines and original order.
 * Ignores empty or whitespace-only lines.
 */
function parseEmailLines(rawText) {
  if (!rawText) return [];
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function App() {
  const [inputValue, setInputValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [hasValidated, setHasValidated] = useState(false);

  // Parse lines reactively to provide accurate live counter
  const parsedLines = useMemo(() => parseEmailLines(inputValue), [inputValue]);
  const nonEmptyCount = parsedLines.length;

  const handleInputChange = (newText) => {
    setInputValue(newText);
    if (errorMessage && parseEmailLines(newText).length > 0) {
      setErrorMessage('');
    }
  };

  const handleValidate = async () => {
    const linesToValidate = parseEmailLines(inputValue);

    if (linesToValidate.length === 0) {
      setErrorMessage('Please enter at least one email address before validating.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      // Send real HTTP POST request to Python Flask backend at http://127.0.0.1:5000/api/verify
      const response = await verifyEmails(linesToValidate);
      setResults(response.results);
      setSummary(response.summary);
      setHasValidated(true);
    } catch (err) {
      setErrorMessage(
        err.message || 'An unexpected error occurred while communicating with the verification backend.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = () => {
    setInputValue('');
    setErrorMessage('');
    setResults([]);
    setSummary(null);
    setHasValidated(false);
  };

  return (
    <div className="app-container">
      <main className="main-content">
        <Header />

        <EmailInput
          inputValue={inputValue}
          onInputChange={handleInputChange}
          onValidate={handleValidate}
          onClear={handleClearAll}
          isLoading={isLoading}
          nonEmptyCount={nonEmptyCount}
          errorMessage={errorMessage}
        />

        <ResultsTable
          results={results}
          summary={summary}
          hasValidated={hasValidated}
        />
      </main>
    </div>
  );
}
