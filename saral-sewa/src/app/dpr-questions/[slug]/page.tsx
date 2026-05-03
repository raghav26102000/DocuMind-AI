// app/dpr-questions/[slug]/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Head from "next/head";
import { useWebSocket } from "../../hooks/useWebSocket";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import "filepond/dist/filepond.min.css";

// Register the FilePond plugins
registerPlugin(
  FilePondPluginFileValidateType,
  FilePondPluginFileValidateSize,
  FilePondPluginImagePreview
);

interface Question {
  key: string;
  question: string;
  type?: "text" | "textarea" | "select" | "radio" | "checkbox" | "number";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
  error?: string;
  questions?: Question[];
  status?: string;
}

interface UploadedFile {
  filename: string;
  size: number;
  file?: File;
}

const getStoredFileMetadata = (): UploadedFile[] => {
  if (typeof window === "undefined") return [];

  const storedData = sessionStorage.getItem("dpr_extra_documents");
  if (storedData) {
    try {
      return JSON.parse(storedData) as UploadedFile[];
    } catch (e) {
      console.error(
        "Error parsing dpr_extra_documents from sessionStorage:",
        e
      );
      return [];
    }
  }
  return [];
};

const DPRQuestionsPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slug = params.slug as string;
  const applicationId = searchParams.get("applicationId");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>("Initializing...");
  const [completed, setCompleted] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [waitingForInput, setWaitingForInput] = useState(false);

  // File upload state
  const [extraDocuments, setExtraDocuments] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [pdfApprovalPending, setPdfApprovalPending] = useState(false);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>("");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token") || ""
      : "";

  // Create WebSocket URL
  const wsUrl = useMemo(() => {
    if (!slug || !token) return null;

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(
      "http://",
      "ws://"
    )?.replace("https://", "wss://");

    return `${baseUrl}/schemes/${slug}/dpr?token=${encodeURIComponent(token)}`;
  }, [slug, token]);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    console.log("Raw WebSocket message received:", event.data);

    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log("Parsed WebSocket message:", message);

      switch (message.type) {
        case "status":
          setStatus(message.data || message.message || "Processing...");
          break;

        case "user_input_request":
          console.log(
            "Received user_input_request with data type:",
            typeof message.data
          );
          console.log("Data length:", message.data?.length);
          console.log(
            "Data preview (first 200 chars):",
            message.data?.toString().substring(0, 200)
          );

          setSubmitting(false);
          setAnswers({});

          try {
            let questionsArray;

            if (typeof message.data === "string") {
              let cleanedData = message.data
                .replace(/\\_/g, "_")
                .replace(/\\'/g, "'")
                .replace(/\\\\/g, "\\")
                .trim();

              console.log(
                "Cleaned data preview:",
                cleanedData.substring(0, 200)
              );

              try {
                questionsArray = JSON.parse(cleanedData);
                console.log("Successfully parsed cleaned JSON");
              } catch (secondParseError) {
                console.error(
                  "Second JSON parse also failed:",
                  secondParseError
                );
                const match = cleanedData.match(/"questions"\s*:\s*(\[.*\])/);
                if (match) {
                  console.log("Attempting to extract questions array...");
                  questionsArray = JSON.parse(match[1]);
                } else {
                  throw secondParseError;
                }
              }
            } else if (Array.isArray(message.data)) {
              questionsArray = message.data;
            } else if (
              message.data &&
              typeof message.data === "object" &&
              message.data.questions
            ) {
              questionsArray = message.data.questions;
            } else {
              throw new Error("Unexpected data format: " + typeof message.data);
            }

            console.log("Final questions array:", questionsArray);
            console.log("Questions count:", questionsArray?.length);

            if (Array.isArray(questionsArray) && questionsArray.length > 0) {
              const transformedQuestions = questionsArray.map(
                (q: any, index: number) => {
                  const cleanKey = q.key
                    ? q.key.replace(/[^a-zA-Z0-9_-]/g, "_")
                    : `question_${index}`;

                  return {
                    key: cleanKey,
                    question: q.question || "Please provide your answer",
                    type: q.type || "text",
                    required: q.required !== false,
                    options: q.options || [],
                    placeholder: q.placeholder || "Enter your answer...",
                  };
                }
              );

              console.log(
                "Successfully transformed",
                transformedQuestions.length,
                "questions"
              );
              setQuestions(transformedQuestions);
              setWaitingForInput(true);
              setStatus(
                `Please answer the ${transformedQuestions.length} questions below and optionally upload relevant documents`
              );
            } else {
              console.error("Questions array is invalid:", {
                isArray: Array.isArray(questionsArray),
                length: questionsArray?.length,
                type: typeof questionsArray,
              });
              setProcessError("No valid questions received from server");
            }
          } catch (parseError) {
            console.error("Critical error parsing questions:", parseError);
            console.error("Error message:", parseError.message);
            console.error("Full raw data:", message.data);
            setProcessError(`Failed to parse questions: ${parseError.message}`);
          }
          break;

          case 'dpr_result':
            setCompleted(false); // Don't mark as completed yet
            setPdfApprovalPending(true); // Show approval interface
            setSubmitting(false);
            setStatus('DPR generated successfully! Please review and approve.');
            
            if (message.data) {
              setPdfData(message.data);
              setPdfFileName(message.file_name || 'DPR.pdf');
              
              const pdfBlob = new Blob([
                Uint8Array.from(atob(message.data), c => c.charCodeAt(0))
              ], { type: 'application/pdf' });
              
              const url = URL.createObjectURL(pdfBlob);
              const a = document.createElement('a');
              a.href = url;
              a.download = message.file_name || 'DPR.pdf';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
            break;

        case "error":
          setProcessError(
            message.data ||
              message.error ||
              "An error occurred during DPR generation"
          );
          setStatus("Error occurred");
          setSubmitting(false);
          break;

        default:
          console.log("Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
      setSubmitting(false);
    }
  }, []);

  // WebSocket connection handlers
  const handleWebSocketOpen = useCallback(() => {
    console.log("WebSocket connected to DPR service");
    setStatus("Connected - Waiting for questions...");
  }, []);

  const handleWebSocketError = useCallback((event: Event) => {
    console.error("WebSocket error:", event);
    setStatus("Connection error - Please check your internet connection");
    setSubmitting(false);
  }, []);

  const handleWebSocketClose = useCallback(
    (event: CloseEvent) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
      if (event.code !== 1000 && !completed) {
        setStatus("Connection lost - Attempting to reconnect...");
        setSubmitting(false);
      }
    },
    [completed]
  );

  // Initialize WebSocket
  const {
    connected,
    connecting,
    error: wsError,
    reconnectCount,
    sendMessage,
    connect: reconnect,
  } = useWebSocket(wsUrl, {
    onOpen: handleWebSocketOpen,
    onMessage: handleWebSocketMessage,
    onError: handleWebSocketError,
    onClose: handleWebSocketClose,
    shouldReconnect: !completed,
    reconnectAttempts: 5,
    reconnectInterval: 2000,
  });

  // Handle answer changes
  const handleAnswerChange = useCallback((questionKey: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionKey]: value,
    }));
  }, []);

  // Handle file upload changes
  const handleFileChange = useCallback((fileItems: any[]) => {
    setExtraDocuments(fileItems);

    // Update uploaded files list for display
    const files = fileItems.map((item) => ({
      filename: item.file.name,
      size: item.file.size,
      file: item.file,
    }));
    setUploadedFiles(files);
  }, []);

  // Validate all required questions
  const validateAnswers = useCallback(() => {
    const requiredQuestions = questions.filter((q) => q.required);
    const missingAnswers = requiredQuestions.filter((q) => {
      const answer = answers[q.key];
      return (
        !answer ||
        answer === "" ||
        (Array.isArray(answer) && answer.length === 0)
      );
    });

    return {
      isValid: missingAnswers.length === 0,
      missingQuestions: missingAnswers,
    };
  }, [questions, answers]);


  const handleApprovePDF = useCallback(async () => {
    setSubmitting(true);
    setStatus('Sending approval to server...');
    
    try {
      const approvalMessage = {
        type: 'user_confirm_response',
        data: true
      };
      
      const sent = sendMessage(approvalMessage);
      
      if (sent) {
        setCompleted(true);
        setPdfApprovalPending(false);
        setStatus('PDF approved and submitted successfully!');
      } else {
        throw new Error('Failed to send approval message');
      }
    } catch (error) {
      console.error('Error approving PDF:', error);
      setStatus('Failed to send approval. Please try again.');
      setSubmitting(false);
    }
  }, [sendMessage]);
  
  const handleRejectPDF = useCallback(async () => {
    setSubmitting(true);
    setStatus('Sending rejection to server...');
    
    try {
      const rejectionMessage = {
        type: 'user_confirm_response',
        data: false
      };
      
      const sent = sendMessage(rejectionMessage);
      
      if (sent) {
        // Reset to questions state so user can try again
        setPdfApprovalPending(false);
        setWaitingForInput(true);
        setAnswers({});
        setStatus('PDF rejected. Please answer the questions again for a new DPR.');
        setSubmitting(false);
      } else {
        throw new Error('Failed to send rejection message');
      }
    } catch (error) {
      console.error('Error rejecting PDF:', error);
      setStatus('Failed to send rejection. Please try again.');
      setSubmitting(false);
    }
  }, [sendMessage]);
  

  const handleDocumentUpload = useCallback(async () => {
    if (uploadedFiles.length === 0) {
      console.warn("Attempted to upload but missing files, slug, or token.");
      return;
    }

    // 2. Construct the target URL
    const uploadUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/schemes/${slug}/dpr/documents`;

    // 3. Create the FormData payload
    const formData = new FormData();
    uploadedFiles.forEach((fileItem) => {
      // fileItem.file is the raw File object from FilePond
      if (fileItem.file) {
        formData.append("extra_documents", fileItem.file, fileItem.filename);
      }
    });

    try {
      // 4. Send the files via standard HTTP POST
      const response = await fetch(uploadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // Handle HTTP error status codes (4xx, 5xx)
        const errorText = await response.text();
        throw new Error(
          `Upload failed with status ${response.status}: ${errorText}`
        );
      }

      const result = await response.json();
    } catch (e) {
      console.error("Manual file upload failed:", e);
    }
  }, [uploadedFiles, slug, token]);

  // Submit all answers and files
  const handleSubmitAllAnswers = useCallback(async () => {
    const validation = validateAnswers();

    if (!validation.isValid) {
      const questionTexts = validation.missingQuestions
        .map((q) => q.question)
        .join("\n- ");
      alert(
        `Please answer the following required questions:\n- ${questionTexts}`
      );
      return;
    }

    setSubmitting(true);
    setStatus("Sending your answers and documents...");
    setWaitingForInput(false);

    console.log("POSTing attached documents...");
    await handleDocumentUpload();
    console.log("Sent.");

    // Prepare the message with answers and file information
    const message = {
      type: "user_input_response",
      data: {
        answers: answers,
        extra_documents: uploadedFiles.map((file) => ({
          filename: file.filename,
          size: file.size,
        })),
      },
    };

    console.log("Sending answers and file info:", message);
    const sent = sendMessage(message);

    if (!sent) {
      alert(
        "Failed to send answers. Please check your connection and try again."
      );
      setSubmitting(false);
      setWaitingForInput(true);
      setStatus("Failed to send answers - Please try again");
    } else {
      setStatus("Processing your answers and documents...");
    }
  }, [answers, uploadedFiles, validateAnswers, sendMessage]);

  // Navigation functions
  const goBack = useCallback(() => {
    if (applicationId) {
      router.push(`/applications/${applicationId}`);
    } else {
      router.back();
    }
  }, [router, applicationId]);

  // Render question input based on type
  const renderQuestion = useCallback(
    (question: Question, index: number) => {
      const value = answers[question.key] || "";

      const commonProps = {
        required: question.required,
        disabled: submitting,
      };

      switch (question.type) {
        case "text":
          return (
            <input
              type="text"
              className="form-control"
              placeholder={question.placeholder || "Enter your answer..."}
              value={value}
              onChange={(e) => handleAnswerChange(question.key, e.target.value)}
              {...commonProps}
            />
          );

        case "number":
          return (
            <input
              type="number"
              className="form-control"
              placeholder={question.placeholder || "Enter a number..."}
              value={value}
              min={question.validation?.min}
              max={question.validation?.max}
              onChange={(e) => handleAnswerChange(question.key, e.target.value)}
              {...commonProps}
            />
          );

        case "textarea":
          return (
            <textarea
              className="form-control"
              rows={4}
              placeholder={
                question.placeholder || "Enter your detailed answer..."
              }
              value={value}
              onChange={(e) => handleAnswerChange(question.key, e.target.value)}
              {...commonProps}
            />
          );

        case "select":
          return (
            <select
              className="form-select"
              value={value}
              onChange={(e) => handleAnswerChange(question.key, e.target.value)}
              {...commonProps}
            >
              <option value="">Select an option...</option>
              {question.options?.map((option, optIndex) => (
                <option key={optIndex} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );

        case "radio":
          return (
            <div>
              {question.options?.map((option, optIndex) => (
                <div key={optIndex} className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="radio"
                    id={`${question.key}-${optIndex}`}
                    name={question.key}
                    value={option}
                    checked={value === option}
                    onChange={(e) =>
                      handleAnswerChange(question.key, e.target.value)
                    }
                    {...commonProps}
                  />
                  <label
                    className="form-check-label"
                    htmlFor={`${question.key}-${optIndex}`}
                  >
                    {option}
                  </label>
                </div>
              ))}
            </div>
          );

        case "checkbox":
          return (
            <div>
              {question.options?.map((option, optIndex) => {
                const checked = Array.isArray(value)
                  ? value.includes(option)
                  : false;
                return (
                  <div key={optIndex} className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`${question.key}-${optIndex}`}
                      value={option}
                      checked={checked}
                      onChange={(e) => {
                        const currentValues = Array.isArray(value) ? value : [];
                        if (e.target.checked) {
                          handleAnswerChange(question.key, [
                            ...currentValues,
                            option,
                          ]);
                        } else {
                          handleAnswerChange(
                            question.key,
                            currentValues.filter((v) => v !== option)
                          );
                        }
                      }}
                      {...commonProps}
                    />
                    <label
                      className="form-check-label"
                      htmlFor={`${question.key}-${optIndex}`}
                    >
                      {option}
                    </label>
                  </div>
                );
              })}
            </div>
          );

        default:
          return (
            <input
              type="text"
              className="form-control"
              placeholder={question.placeholder || "Enter your answer..."}
              value={value}
              onChange={(e) => handleAnswerChange(question.key, e.target.value)}
              {...commonProps}
            />
          );
      }
    },
    [answers, submitting, handleAnswerChange]
  );

  // Calculate progress - only count answers for current questions
  const answeredCount = useMemo(() => {
    if (questions.length === 0) return 0;

    const currentQuestionKeys = new Set(questions.map((q) => q.key));
    return Object.keys(answers).filter((key) => {
      if (!currentQuestionKeys.has(key)) return false;

      const answer = answers[key];
      return (
        answer !== undefined &&
        answer !== "" &&
        (!Array.isArray(answer) || answer.length > 0)
      );
    }).length;
  }, [questions, answers]);

  const progress =
    questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  // Loading state
  if (connecting || (!connected && !wsError && !processError)) {
    return (
      <>
        <Head>
          <title>DPR Questions - Connecting...</title>
        </Head>
        <div className="container-fluid">
          <div className="row">
            <div className="col-12 text-center py-5">
              <div
                className="spinner-border text-primary mb-3"
                role="status"
                style={{ width: "3rem", height: "3rem" }}
              >
                <span className="visually-hidden">Loading...</span>
              </div>
              <h3>Connecting to DPR Service</h3>
              <p className="text-muted">{status}</p>
              {reconnectCount > 0 && (
                <p className="text-warning">
                  Reconnection attempt: {reconnectCount}
                </p>
              )}
              <button
                className="btn btn-outline-secondary mt-3"
                onClick={goBack}
              >
                ← Cancel and Go Back
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (wsError || processError) {
    return (
      <>
        <Head>
          <title>DPR Questions - Error</title>
        </Head>
        <div className="container-fluid">
          <div className="row">
            <div className="col-12 text-center py-5">
              <div className="alert alert-danger">
                <h4 className="alert-heading">⚠️ Connection Error</h4>
                <p>{wsError || processError}</p>
                <hr />
                <div className="d-flex justify-content-center gap-2">
                  <button className="btn btn-primary" onClick={reconnect}>
                    🔄 Try Again
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={goBack}
                  >
                    ← Go Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (pdfApprovalPending) {
    return (
      <>
        <Head>
          <title>DPR Generated - Review Required</title>
        </Head>
        <div className="container-fluid">
          <div className="row">
            <div className="col-12 text-center py-5">
              <div className="card border-warning">
                <div className="card-header bg-warning text-dark">
                  <h2 className="mb-0">📄 DPR Generated - Review Required</h2>
                </div>
                <div className="card-body p-5">
                  <div className="mb-4">
                    <h4 className="mb-3">Your Detailed Project Report has been generated!</h4>
                    <p className="lead">
                      The PDF should have been downloaded automatically. Please review the document and let us know if you approve it.
                    </p>
                    <div className="alert alert-info">
                      <strong>📁 File:</strong> {pdfFileName}
                    </div>
                  </div>
                  
                  <div className="d-flex justify-content-center gap-3">
                    <button 
                      className="btn btn-success btn-lg px-4" 
                      onClick={handleApprovePDF}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          ✅ Approve & Submit
                        </>
                      )}
                    </button>
                    
                    <button 
                      className="btn btn-danger btn-lg px-4" 
                      onClick={handleRejectPDF}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          ❌ Reject & Retry
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="mt-4 pt-3 border-top">
                    <small className="text-muted">
                      <strong>Note:</strong> Approving will save the DPR to your documents. 
                      Rejecting will let you answer the questions again to generate a new DPR.
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Completion state
  if (completed) {
    return (
      <>
        <Head>
          <title>DPR Generation Complete</title>
        </Head>
        <div className="container-fluid">
          <div className="row">
            <div className="col-12 text-center py-5">
              <div className="alert alert-success">
                <h2 className="alert-heading">🎉 DPR Generation Complete!</h2>
                <p className="lead">
                  Your Detailed Project Report has been generated successfully
                  and should have been downloaded automatically.
                </p>
                <hr />
                <p>
                  You can now return to your application to view or generate
                  another DPR document.
                </p>
                <button
                  className="btn btn-success btn-lg mt-3"
                  onClick={goBack}
                >
                  📋 Return to Application
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>DPR Questions - {slug}</title>
      </Head>

      <div className="container-fluid">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="page-heading mb-1">
                  🏗️ DPR Generation Questionnaire
                </h1>
                <p className="text-muted">
                  Please answer the following questions to generate your
                  Detailed Project Report
                </p>
              </div>
              <div>
                <button className="btn btn-outline-secondary" onClick={goBack}>
                  ← Back to Application
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="row mb-3">
          <div className="col-12">
            <div
              className={`alert ${
                connected ? "alert-success" : "alert-warning"
              }`}
            >
              <div className="d-flex align-items-center">
                <div className="me-2">
                  {connected ? "🟢 Connected" : "🟡 Connecting..."} - {status}
                </div>
                {!connected && (
                  <button
                    className="btn btn-sm btn-outline-primary ms-auto"
                    onClick={reconnect}
                    disabled={connecting}
                  >
                    🔄 Reconnect
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {questions.length > 0 && (
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted">Progress</span>
                    <div className="d-flex gap-2">
                      <span className="badge bg-primary">
                        {answeredCount} of {questions.length} answered
                      </span>
                      {uploadedFiles.length > 0 && (
                        <span className="badge bg-info">
                          {uploadedFiles.length} file
                          {uploadedFiles.length !== 1 ? "s" : ""} attached
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="progress" style={{ height: "10px" }}>
                    <div
                      className="progress-bar bg-gradient"
                      role="progressbar"
                      style={{ width: `${progress}%` }}
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Questions Form */}
        {questions.length > 0 && waitingForInput && (
          <div className="row">
            {/* Questions Section */}
            <div className="col-lg-8 mb-4">
              <div className="card shadow-lg border-0">
                <div className="card-header bg-gradient bg-primary text-white">
                  <h5 className="mb-0">
                    📝 DPR Questions ({questions.length} total)
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    {questions.map((question, index) => (
                      <div key={question.key} className="col-12 mb-4">
                        <div className="card h-100">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <label className="form-label fw-bold mb-0">
                                {index + 1}. {question.question}
                                {question.required && (
                                  <span className="text-danger ms-1">*</span>
                                )}
                              </label>
                              {answers[question.key] && (
                                <span className="badge bg-success">✓</span>
                              )}
                            </div>
                            <div>{renderQuestion(question, index)}</div>
                            {question.required && (
                              <small className="text-muted mt-1 d-block">
                                <span className="text-danger">*</span> This
                                field is required
                              </small>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="col-lg-4">
              <div className="card shadow-lg border-0">
                <div className="card-header bg-gradient bg-info text-white">
                  <h5 className="mb-0">📎 Additional Documents (Optional)</h5>
                </div>
                <div className="card-body">
                  <p className="text-muted small mb-3">
                    Upload any relevant documents that might help with your DPR
                    generation (proposals, estimates, drawings, etc.)
                  </p>

                  <FilePond
                    files={extraDocuments}
                    onupdatefiles={handleFileChange}
                    allowMultiple={true}
                    maxFiles={10}
                    maxFileSize="50MB"
                    acceptedFileTypes={[
                      "application/pdf",
                      "image/jpeg",
                      "image/png",
                      "application/msword",
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                      "application/vnd.ms-excel",
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                      "text/plain",
                    ]}
                    labelIdle='Drag & Drop or <span class="filepond--label-action">Browse</span> relevant documents (PDF, DOC, XLS, TXT, Images)'
                    name="extra_documents"
                    allowRevert={true}
                    allowRemove={true}
                    allowReorder={true}
                  />

                  {uploadedFiles.length > 0 && (
                    <div className="mt-3">
                      <h6 className="mb-2">Attached Files:</h6>
                      <ul className="list-group list-group-flush">
                        {uploadedFiles.map((file, index) => (
                          <li
                            key={index}
                            className="list-group-item d-flex justify-content-between align-items-center py-2"
                          >
                            <div className="small">
                              <i className="bi bi-file-earmark me-1"></i>
                              {file.filename}
                            </div>
                            <span className="badge bg-secondary rounded-pill">
                              {(file.size / 1024 / 1024).toFixed(1)}MB
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Section */}
            <div className="col-12 mt-4">
              <div className="card border-success">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-1">Ready to generate your DPR?</h5>
                      <div className="small text-muted">
                        Questions answered: {answeredCount} of{" "}
                        {questions.length}
                        {uploadedFiles.length > 0 && (
                          <span className="ms-2">
                            | Documents attached: {uploadedFiles.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn btn-success btn-lg px-4"
                      onClick={handleSubmitAllAnswers}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Processing...
                        </>
                      ) : (
                        <>🚀 Generate DPR</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Waiting for Questions */}
        {connected && questions.length === 0 && !waitingForInput && (
          <div className="row">
            <div className="col-lg-6 mx-auto text-center py-5">
              <div className="card border-0 shadow-sm">
                <div className="card-body p-5">
                  <div className="mb-4">
                    <div
                      className="spinner-border text-primary mb-3"
                      role="status"
                      style={{ width: "3rem", height: "3rem" }}
                    >
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                  <h4 className="mb-3">🤔 Preparing Your Questions...</h4>
                  <p className="text-muted mb-0">
                    Our AI is analyzing your scheme requirements and preparing
                    personalized questions for your DPR. This usually takes
                    30-60 seconds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="row mt-5">
          <div className="col-12">
            <div className="card border-0 bg-light">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h6 className="mb-2">💡 Need Help?</h6>
                    <p className="mb-0 small text-muted">
                      Answer each question as accurately as possible. Questions
                      marked with a red asterisk (*) are required. You can also
                      upload additional documents that might be relevant to your
                      project. Fill out all questions and then submit them
                      together.
                    </p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <small className="text-muted">
                      Connected: {connected ? "✅" : "❌"} | Questions:{" "}
                      {questions.length} | Answered: {answeredCount} | Files:{" "}
                      {uploadedFiles.length}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Information (Development Only) */}
        {process.env.NODE_ENV === "development" && (
          <div className="row mt-4">
            <div className="col-12">
              <details className="mb-3">
                <summary className="text-muted small">
                  🔧 Debug Information
                </summary>
                <div className="mt-2 p-3 bg-light rounded">
                  <div className="row">
                    <div className="col-md-6">
                      <small className="text-muted d-block">
                        Scheme: <code>{slug}</code>
                      </small>
                      <small className="text-muted d-block">
                        Application ID: <code>{applicationId}</code>
                      </small>
                      <small className="text-muted d-block">
                        WebSocket URL: <code>{wsUrl}</code>
                      </small>
                      <small className="text-muted d-block">
                        Connected: <code>{String(connected)}</code>
                      </small>
                      <small className="text-muted d-block">
                        Waiting for Input:{" "}
                        <code>{String(waitingForInput)}</code>
                      </small>
                    </div>
                    <div className="col-md-6">
                      <small className="text-muted d-block">
                        Questions Loaded: <code>{questions.length}</code>
                      </small>
                      <small className="text-muted d-block">
                        Answers Count:{" "}
                        <code>{Object.keys(answers).length}</code>
                      </small>
                      <small className="text-muted d-block">
                        Files Count: <code>{uploadedFiles.length}</code>
                      </small>
                      <small className="text-muted d-block">
                        Reconnect Count: <code>{reconnectCount}</code>
                      </small>
                      <small className="text-muted d-block">
                        Status: <code>{status}</code>
                      </small>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-top">
                    <small className="text-muted d-block">
                      Questions:{" "}
                      <code>
                        {JSON.stringify(
                          questions.map((q) => ({
                            key: q.key,
                            question: q.question.substring(0, 50) + "...",
                          }))
                        )}
                      </code>
                    </small>
                    <small className="text-muted d-block">
                      Answers: <code>{JSON.stringify(answers)}</code>
                    </small>
                    <small className="text-muted d-block">
                      Files:{" "}
                      <code>
                        {JSON.stringify(
                          uploadedFiles.map((f) => ({
                            name: f.filename,
                            size: f.size,
                          }))
                        )}
                      </code>
                    </small>
                  </div>
                </div>
              </details>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DPRQuestionsPage;
