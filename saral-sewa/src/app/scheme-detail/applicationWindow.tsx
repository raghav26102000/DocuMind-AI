// components/ApplicationWindow.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DocumentManager from './DocumentManager';
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import "filepond/dist/filepond.min.css";

// Register the FilePond plugins
registerPlugin(FilePondPluginFileValidateType, FilePondPluginFileValidateSize, FilePondPluginImagePreview);

interface Scheme {
  _id: string;
  name: string;
  description: string;
  department: string;
  deadline: string;
  status: 'active' | 'inactive' | 'upcoming';
}

interface RequiredDocument {
  old_title: string;
  title: string;
  document_type_code: number;
  attached: boolean;
  attached_document: any;
}

interface ApiResponse {
  status: number;
  message: string;
  data: any;
  tag: string;
}

interface ApplicationWindowProps {
  schemeSlug: string; 
  schemeId?: string;  
  onApplicationSubmit?: (applicationData: any) => void;
  onClose?: () => void;
}

const ApplicationWindow: React.FC<ApplicationWindowProps> = ({ 
  schemeSlug, 
  schemeId, 
  onApplicationSubmit,
  onClose 
}) => {
  const router = useRouter();
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingDPR, setGeneratingDPR] = useState(false);
  const [notifications, setNotifications] = useState<{id: number, type: 'success' | 'info' | 'warning' | 'error', message: string}[]>([]);
  const [applicationStatus, setApplicationStatus] = useState<'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'>('draft');
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [applicationData, setApplicationData] = useState<any>(null);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);
  
  // Extra documents state for DPR generation
  const [extraDocuments, setExtraDocuments] = useState<any[]>([]);
  const [uploadedExtraFiles, setUploadedExtraFiles] = useState<UploadedFile[]>([]);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";

  // Check if DPR documents are required
  const hasDPRDocuments = requiredDocuments.some(doc => doc.document_type_code === 26);
  const dprDocuments = requiredDocuments.filter(doc => doc.document_type_code === 26);

  useEffect(() => {
    if (schemeSlug) {
      fetchSchemeDetails();
      startOrResumeApplication();
    }
  }, [schemeSlug]);

  const fetchSchemeDetails = async () => {
    try {
      setLoading(true);
      let endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/schemes/${schemeSlug}`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result: ApiResponse = await response.json();
        if (result.status === 1 && result.data) {
          setScheme(result.data);
        } else {
          console.warn('Scheme details API returned status 0:', result.message);
          setFallbackScheme();
        }
      } else {
        console.warn(`Failed to fetch scheme details: ${response.status} ${response.statusText}`);
        setFallbackScheme();
      }
    } catch (error) {
      console.error('Error fetching scheme details:', error);
      addNotification('error', 'Failed to fetch scheme details');
      setFallbackScheme();
    } finally {
      setLoading(false);
    }
  };

  const startOrResumeApplication = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/applications/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          scheme_slug: schemeSlug,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 1) {
          setApplicationId(result.data.application_id);
          setApplicationData(result.data);
          setRequiredDocuments(result.data.required_documents || []);
          addNotification('info', result.message);
        } else {
          addNotification('error', result.message || 'Failed to start application');
        }
      } else {
        addNotification('error', 'Failed to start application');
      }
    } catch (error) {
      console.error('Start application error:', error);
      addNotification('error', 'Failed to start application');
    }
  };

  // Handle extra documents file changes
  const handleExtraFileChange = useCallback((fileItems: any[]) => {
    setExtraDocuments(fileItems);
    
    // Update uploaded files list for display
    const files = fileItems.map(item => ({
      filename: item.file.name,
      size: item.file.size,
      file: item.file
    }));
    setUploadedExtraFiles(files);
  }, []);


  const handleInitialDocumentUpload = useCallback(async () => {
    // 1. Check for files and necessary context
    if (uploadedExtraFiles.length === 0) {
        console.warn("Attempted to upload but missing files, slug, or token.");
        return;
    }

    // 2. Construct the target URL
    const uploadUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/schemes/${schemeSlug}/dpr/documents`;

    // 3. Create the FormData payload
    const formData = new FormData();
    uploadedExtraFiles.forEach((fileItem) => {
        // fileItem.file is the raw File object from FilePond
        if (fileItem.file) {
            formData.append('extra_documents', fileItem.file, fileItem.filename);
        }
    });

    try {
        // 4. Send the files via standard HTTP POST
        const response = await fetch(uploadUrl, {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            // Handle HTTP error status codes (4xx, 5xx)
            const errorText = await response.text();
            throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
        }

        const result = await response.json(); 

    } catch (e) {
        console.error("Manual file upload failed:", e);
    }

}, [uploadedExtraFiles, schemeSlug, token]);


  // Clear extra documents
  const clearExtraDocuments = useCallback(() => {
    setExtraDocuments([]);
    setUploadedExtraFiles([]);
  }, []);

  // Interactive DPR generation via WebSocket with extra documents
  const generateDPR = async () => {
    if (!applicationId || !schemeSlug) {
      addNotification('error', 'Missing application or scheme information');
      return;
    }

    try {
      setGeneratingDPR(true);
      addNotification('info', 'Starting interactive DPR generation process...');


      // TODO: set up a progress bar / loading icon / toast message to inform the user to wait for the upload to finish
      console.log("Sending Initial files ...")
      await handleInitialDocumentUpload()
      console.log("Sent.")

      // Create URL with extra documents info if any
      let url = `/dpr-questions/${schemeSlug}?applicationId=${applicationId}`;
      
      // Store extra documents info in sessionStorage for the DPR questions page
      if (uploadedExtraFiles.length > 0) {
        const fileInfo = uploadedExtraFiles.map(file => ({
          filename: file.filename,
          size: file.size
        }));
        sessionStorage.setItem('dpr_extra_documents', JSON.stringify(fileInfo));
        url += `&hasExtraFiles=true`;
      } else {
        sessionStorage.removeItem('dpr_extra_documents');
      }

      // Navigate to the DPR questions page
      router.push(url);
    } catch (error) {
      console.error('Generate DPR error:', error);
      addNotification('error', 'Failed to start DPR generation');
      setGeneratingDPR(false);
    }
  };

  const setFallbackScheme = () => {
    setScheme({
      _id: schemeId || schemeSlug,
      name: 'Government Scheme Application',
      description: 'Complete your application by uploading required documents',
      department: 'Government Department',
      deadline: '',
      status: 'active'
    });
  };

  const addNotification = (type: 'success' | 'info' | 'warning' | 'error', message: string) => {
    const newNotification = { 
      id: Date.now() + Math.random(),
      type, 
      message 
    };
    setNotifications(prev => [...prev, newNotification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  };

  const removeNotification = (notification: any) => {
    setNotifications(prev => prev.filter(n => n !== notification));
  };

  const saveProgress = async (documentUpdate: any) => {
    if (!applicationId || !documentUpdate) {
      addNotification('warning', 'No changes to save');
      return;
    }

    try {
      setSaving(true);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/applications/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(documentUpdate),
      });

      if (response.ok) {
        const result: ApiResponse = await response.json();
        if (result.status === 1) {
          addNotification('success', 'Progress saved successfully!');
          return true;
        } else {
          addNotification('error', result.message || 'Failed to save progress');
          return false;
        }
      } else {
        addNotification('error', 'Failed to save progress');
        return false;
      }
    } catch (error) {
      console.error('Save progress error:', error);
      addNotification('error', 'Failed to save progress');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submitApplication = async (stats: any) => {
    if (stats.requiredUploaded < stats.required) {
      addNotification('warning', `Please upload all required documents. ${stats.requiredUploaded}/${stats.required} completed.`);
      return;
    }

    if (!applicationId) {
      addNotification('error', 'No application ID found');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/applications/${applicationId}/submit`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result: ApiResponse = await response.json();
        if (result.status === 1) {
          setApplicationStatus('submitted');
          addNotification('success', 'Application submitted successfully!');
          onApplicationSubmit?.(result.data);
          
          setTimeout(() => {
            onClose?.();
          }, 2000);
        } else {
          addNotification('error', result.message || 'Failed to submit application');
        }
      } else {
        addNotification('error', 'Failed to submit application');
      }
    } catch (error) {
      console.error('Submit error:', error);
      addNotification('error', 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12 text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading application details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="page-heading mb-1">
                Application for {scheme?.name || 'Government Scheme'}
                {onClose && (
                  <button 
                    className="btn btn-outline-secondary btn-sm ms-3"
                    onClick={onClose}
                  >
                    ← Back
                  </button>
                )}
              </h1>
              <p className="text-muted">{scheme?.description || 'Complete your application by uploading the required documents.'}</p>
              <small className="text-muted">
                Debug: Scheme Slug = {schemeSlug} | App ID = {applicationId}
              </small>
              <div className="d-flex gap-2 flex-wrap">
                {scheme?.department && <span className="badge bg-primary">{scheme.department}</span>}
                <span className={`badge bg-${scheme?.status === 'active' ? 'success' : 'warning'}`}>
                  {scheme?.status ? String(scheme.status).toUpperCase() : 'N/A'}
                </span>
                {scheme?.deadline && (
                  <span className="badge bg-info">
                    Deadline: {new Date(scheme.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="text-end">
              <span className={`badge bg-${applicationStatus === 'submitted' ? 'success' : 'secondary'} fs-6`}>
                Status: {applicationStatus ? String(applicationStatus).replace('_', ' ').toUpperCase() : 'DRAFT'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DPR Generation Section */}
      {hasDPRDocuments && applicationStatus !== 'submitted' && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-primary">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">📋 DPR (Detailed Project Report) Required</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-8">
                    <p className="mb-2">
                      <strong>This scheme requires a Detailed Project Report (DPR).</strong>
                    </p>
                    <p className="mb-3 text-muted">
                      You can either upload your existing DPR document directly, or let us generate one for you through an interactive questionnaire based on your application details.
                    </p>

                    <div className="mb-3">
                      <strong>DPR documents required:</strong>
                      <ul className="mb-0 mt-1">
                        {dprDocuments.map((doc, index) => (
                          <li key={index} className="text-muted">
                            {doc.old_title}
                            {doc.attached && <span className="badge bg-success ms-2">✓ Uploaded</span>}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Extra Documents Upload Section */}
                    <div className="mt-4">
                      <h6 className="mb-2">📎 Additional Documents for Better DPR Generation (Optional)</h6>
                      <p className="text-muted small mb-3">
                        Upload any existing documents related to your project (proposals, estimates, drawings, etc.) 
                        to help our AI generate more accurate and targeted questions for your DPR.
                      </p>
                      
                      <FilePond
                        files={extraDocuments}
                        onupdatefiles={handleExtraFileChange}
                        allowMultiple={true}
                        maxFiles={5}
                        maxFileSize="25MB"
                        acceptedFileTypes={[
                          'application/pdf',
                          'image/jpeg',
                          'image/png',
                          'application/msword',
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                          'application/vnd.ms-excel',
                          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                          'text/plain'
                        ]}
                        labelIdle='Drag & Drop or <span class="filepond--label-action">Browse</span> relevant documents (PDF, DOC, XLS, TXT, Images)'
                        name="extra_documents"
                        allowRevert={true}
                        allowRemove={true}
                        allowReorder={true}
                      />
                      
                      {uploadedExtraFiles.length > 0 && (
                        <div className="mt-2">
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-success">
                              <i className="bi bi-check-circle me-1"></i>
                              {uploadedExtraFiles.length} document{uploadedExtraFiles.length !== 1 ? 's' : ''} ready to send
                            </small>
                            <button 
                              className="btn btn-sm btn-outline-secondary"
                              onClick={clearExtraDocuments}
                              title="Clear all documents"
                            >
                              Clear All
                            </button>
                          </div>
                          <ul className="list-group list-group-flush mt-2">
                            {uploadedExtraFiles.slice(0, 3).map((file, index) => (
                              <li key={index} className="list-group-item d-flex justify-content-between align-items-center py-1 px-0">
                                <small className="text-muted">
                                  <i className="bi bi-file-earmark me-1"></i>
                                  {file.filename}
                                </small>
                                <span className="badge bg-secondary rounded-pill">
                                  {(file.size / 1024 / 1024).toFixed(1)}MB
                                </span>
                              </li>
                            ))}
                            {uploadedExtraFiles.length > 3 && (
                              <li className="list-group-item py-1 px-0">
                                <small className="text-muted">
                                  ... and {uploadedExtraFiles.length - 3} more file{uploadedExtraFiles.length - 3 !== 1 ? 's' : ''}
                                </small>
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="col-md-4">
                    <div className="text-center">
                      <button
                        className="btn btn-success btn-lg w-100"
                        onClick={generateDPR}
                        disabled={generatingDPR}
                      >
                        {generatingDPR ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Starting DPR...
                          </>
                        ) : (
                          <>
                            🚀 Generate DPR
                          </>
                        )}
                      </button>
                      <small className="d-block mt-2 text-muted">
                        Interactive questionnaire
                      </small>
                      
                      {uploadedExtraFiles.length > 0 && (
                        <div className="alert alert-info mt-3 py-2">
                          <small>
                            <i className="bi bi-lightbulb me-1"></i>
                            <strong>{uploadedExtraFiles.length} document{uploadedExtraFiles.length !== 1 ? 's' : ''}</strong> will be 
                            analyzed to generate more targeted questions
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="row mb-3">
          <div className="col-12">
            {notifications.map((notification) => (
              <div key={notification.id} className={`alert alert-${notification.type} alert-dismissible fade show`} role="alert">
                {notification.message}
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => removeNotification(notification)}
                  aria-label="Close"
                ></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Manager Component */}
      <DocumentManager
        schemeSlug={schemeSlug}
        schemeId={schemeId}
        applicationId={applicationId}
        applicationStatus={applicationStatus}
        submitting={submitting}
        saving={saving}
        applicationData={applicationData}
        onSubmitApplication={submitApplication}
        onSaveProgress={saveProgress}
        onNotification={addNotification}
      />

      {/* Success Message for Submitted Applications */}
      {applicationStatus === 'submitted' && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="alert alert-success text-center">
              <h4 className="alert-heading">🎉 Application Submitted Successfully!</h4>
              <p className="mb-0">
                Your application has been submitted and is now under review. 
                You will be notified of any updates via email or SMS.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationWindow;
