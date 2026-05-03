// components/DocumentManager.tsx
import React, { useState, useEffect } from 'react';
import ApplicationFileUploader from './ApplicationFileUploader';

interface RequiredDocument {
  old_title: string;
  title: string;
  document_type_code: number | null;
  attached: boolean;
  doc_ids: Array<{
    doc_id: string;
    s3_url?: string;
    s3_key?: string;
  }>;
}

interface UploadedDocument {
  _id: string;
  title: string;
  filename: string;
  s3_url: string;
  s3_key?: string;
  verified: boolean;
  createdOn: string;
  lastModifiedOn: string;
  schemeId: string;
}

interface ApiResponse {
  status: number;
  message: string;
  data: any;
  tag: string;
}

interface DocumentManagerProps {
  schemeSlug: string;
  schemeId?: string;
  applicationId: string | null;
  applicationStatus: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  submitting: boolean;
  saving: boolean;
  applicationData: any;
  onSubmitApplication: (stats: any) => void;
  onSaveProgress: (documentUpdate: any) => Promise<boolean>;
  onNotification: (type: 'success' | 'info' | 'warning' | 'error', message: string) => void;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({
  schemeSlug,
  schemeId,
  applicationId,
  applicationStatus,
  submitting,
  saving,
  applicationData,
  onSubmitApplication,
  onSaveProgress,
  onNotification
}) => {
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState<{[key: string]: boolean}>({});
  const [showUpdateForm, setShowUpdateForm] = useState<{[key: string]: boolean}>({});
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";

  const categories = [
    { id: 'all', name: 'All Documents', icon: '📋' },
    { id: 'identity', name: 'Identity', icon: '🆔' },
    { id: 'financial', name: 'Financial', icon: '💰' },
    { id: 'educational', name: 'Educational', icon: '🎓' },
    { id: 'other', name: 'Other', icon: '📄' }
  ];

  useEffect(() => {
    if (applicationData) {
      processApplicationData();
    }
  }, [applicationData]);

  const processApplicationData = () => {
    if (applicationData?.required_documents) {
      console.log('Processing application data:', applicationData);
      setRequiredDocuments(applicationData.required_documents);
      
      // Extract uploaded documents from the required_documents structure
      const uploaded: UploadedDocument[] = [];
      applicationData.required_documents.forEach((doc: RequiredDocument) => {
        if (doc.attached && doc.doc_ids?.length > 0) {
          doc.doc_ids.forEach(docRef => {
            // Create document structure from the reference
            uploaded.push({
              _id: docRef.doc_id,
              title: doc.title,
              filename: `${doc.title}.pdf`, // placeholder - backend should provide actual filename
              s3_url: docRef.s3_url || '',
              s3_key: docRef.s3_key || '',
              verified: false, // Backend should provide verification status
              createdOn: new Date().toISOString(),
              lastModifiedOn: new Date().toISOString(),
              schemeId: schemeId || ''
            });
          });
        }
      });
      
      setUploadedDocuments(uploaded);
    }
    setLoading(false);
  };

  const handleUploadSuccess = async (document: UploadedDocument) => {
    // Update local state
    setUploadedDocuments(prev => {
      const filtered = prev.filter(doc => doc.title !== document.title);
      return [...filtered, document];
    });
    
    setShowUploadForm(prev => ({ ...prev, [document.title]: false }));
    setShowUpdateForm(prev => ({ ...prev, [document.title]: false }));
    
    // Auto-save to backend
    const saveData = {
      title: document.title,
      doc_id: document._id,
      s3_url: document.s3_url,
      s3_key: document.s3_key
    };

    const saved = await onSaveProgress(saveData);
    if (saved) {
      // Update required documents to reflect the attachment
      setRequiredDocuments(prev => 
        prev.map(req => 
          req.title === document.title 
            ? { 
                ...req, 
                attached: true, 
                doc_ids: [...(req.doc_ids || []), {
                  doc_id: document._id,
                  s3_url: document.s3_url,
                  s3_key: document.s3_key
                }]
              }
            : req
        )
      );
      
      onNotification('success', `${document.title} uploaded and saved successfully!`);
    } else {
      onNotification('warning', `${document.title} uploaded but failed to save progress`);
    }
  };

  const handleUploadError = (error: any) => {
    console.error('Upload error:', error);
    onNotification('error', typeof error === 'string' ? error : 'Upload failed. Please try again.');
  };

  const handleVerificationComplete = (isVerified: boolean, message: string) => {
    if (isVerified) {
      onNotification('success', message);
    } else {
      onNotification('warning', message);
    }
  };

  const handleSaveProgress = async (docTitle: string) => {
    const uploadedDoc = getUploadedDocument(docTitle);
    if (!uploadedDoc) {
      onNotification('warning', 'No document to save');
      return;
    }

    setPendingSaves(prev => new Set(prev.add(docTitle)));

    const saveData = {
      title: docTitle,
      doc_id: uploadedDoc._id,
      s3_url: uploadedDoc.s3_url,
      s3_key: uploadedDoc.s3_key
    };

    const saved = await onSaveProgress(saveData);
    
    setPendingSaves(prev => {
      const newSet = new Set(prev);
      newSet.delete(docTitle);
      return newSet;
    });

    if (!saved) {
      onNotification('error', `Failed to save ${docTitle}`);
    }
  };

  const getUploadedDocument = (title: string) => {
    return uploadedDocuments.find(doc => doc.title === title);
  };

  const getDocumentStats = () => {
    const total = requiredDocuments.length;
    const uploaded = requiredDocuments.filter(doc => doc.attached).length;
    const verified = uploadedDocuments.filter(doc => 
      doc.verified && requiredDocuments.some(req => req.title === doc.title)
    ).length;
    const required = requiredDocuments.length; // All documents from backend are considered required
    const requiredUploaded = requiredDocuments.filter(doc => doc.attached).length;
    
    return { total, uploaded, verified, required, requiredUploaded };
  };

  const getFilteredDocuments = () => {
    let filtered = requiredDocuments;

    console.log('Before filtering - requiredDocuments:', requiredDocuments);
    console.log('activeCategory:', activeCategory);
    console.log('searchQuery:', searchQuery);
    
    if (activeCategory !== 'all') {
      // Basic categorization based on document title
      filtered = filtered.filter(doc => {
        const title = doc.title.toLowerCase();
        switch (activeCategory) {
          case 'identity':
            return title.includes('identity') || title.includes('aadhar') || title.includes('voter') || title.includes('address');
          case 'financial':
            return title.includes('income') || title.includes('financial') || title.includes('bank') || title.includes('salary');
          case 'educational':
            return title.includes('education') || title.includes('degree') || title.includes('certificate') || title.includes('mark');
          default:
            return true;
        }
      });
    }
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.old_title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const toggleUploadForm = (docTitle: string) => {
    setShowUploadForm(prev => ({ ...prev, [docTitle]: !prev[docTitle] }));
    setShowUpdateForm(prev => ({ ...prev, [docTitle]: false }));
  };

  const toggleUpdateForm = (docTitle: string) => {
    setShowUpdateForm(prev => ({ ...prev, [docTitle]: !prev[docTitle] }));
    setShowUploadForm(prev => ({ ...prev, [docTitle]: false }));
  };

  const downloadDocument = async (docId: string, filename: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${docId}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result: ApiResponse = await response.json();
        if (result.status === 1 && result.data && result.data.url) {
          window.open(result.data.url, '_blank');
          onNotification('success', `Download link generated for ${filename}`);
        } else {
          onNotification('error', result.message || 'Failed to generate download link');
        }
      } else {
        onNotification('error', 'Failed to generate download link');
      }
    } catch (error) {
      console.error('Download error:', error);
      onNotification('error', 'Failed to generate download link');
    }
  };

  const deleteDocument = async (docId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete ${title}?`)) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result: ApiResponse = await response.json();
        if (result.status === 1) {
          setUploadedDocuments(prev => prev.filter(doc => doc._id !== docId));
          
          // Update required documents to reflect removal
          setRequiredDocuments(prev => 
            prev.map(req => 
              req.title === title 
                ? { 
                    ...req, 
                    attached: false, 
                    doc_ids: req.doc_ids?.filter(doc => doc.doc_id !== docId) || []
                  }
                : req
            )
          );
          
          onNotification('success', `${title} deleted successfully`);
        } else {
          onNotification('error', result.message || 'Failed to delete document');
        }
      } else {
        onNotification('error', 'Failed to delete document');
      }
    } catch (error) {
      console.error('Delete error:', error);
      onNotification('error', 'Failed to delete document');
    }
  };

  const stats = getDocumentStats();
  const filteredDocs = getFilteredDocuments();

  const handleSubmitClick = () => {
    onSubmitApplication(stats);
  };

  const handleSaveAllProgress = () => {
    const hasUnsavedChanges = uploadedDocuments.some(doc => 
      !requiredDocuments.find(req => req.title === doc.title && req.attached)
    );
    
    if (hasUnsavedChanges) {
      uploadedDocuments.forEach(doc => {
        handleSaveProgress(doc.title);
      });
    } else {
      onNotification('info', 'All changes are already saved');
    }
  };

  if (loading) {
    return (
      <div className="row mb-4">
        <div className="col-12 text-center">
          <div className="spinner-border text-primary me-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span>Loading documents...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Stats Dashboard */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 bg-light">
            <div className="card-body">
              <div className="row text-center">
                <div className="col-6 col-md-3">
                  <div className="h3 text-primary mb-1">{stats.uploaded}/{stats.total}</div>
                  <small className="text-muted">Total Uploaded</small>
                </div>
                <div className="col-6 col-md-3">
                  <div className="h3 text-success mb-1">{stats.verified}</div>
                  <small className="text-muted">Verified</small>
                </div>
                <div className="col-6 col-md-3">
                  <div className="h3 text-warning mb-1">{stats.requiredUploaded}/{stats.required}</div>
                  <small className="text-muted">Required Complete</small>
                </div>
                <div className="col-6 col-md-3">
                  <div className="h3 text-info mb-1">{stats.total > 0 ? Math.round((stats.uploaded/stats.total)*100) : 0}%</div>
                  <small className="text-muted">Overall Progress</small>
                </div>
              </div>
              <div className="progress mt-3" style={{ height: '8px' }}>
                <div 
                  className="progress-bar bg-success" 
                  style={{ width: `${stats.total > 0 ? (stats.verified/stats.total)*100 : 0}%` }}
                ></div>
                <div 
                  className="progress-bar bg-warning" 
                  style={{ width: `${stats.total > 0 ? ((stats.uploaded-stats.verified)/stats.total)*100 : 0}%` }}
                ></div>
              </div>
              <small className="text-muted mt-1 d-block">
                <span className="badge bg-success me-2">Verified</span>
                <span className="badge bg-warning me-2">Uploaded</span>
                <span className="badge bg-light text-dark">Pending</span>
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="row mb-4">
        <div className="col-md-8">
          <div className="input-group">
            <span className="input-group-text">🔍</span>
            <input
              type="text"
              className="form-control"
              placeholder="Search required documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-4">
          <div className="d-flex flex-wrap gap-2">
            {categories.slice(0, 3).map(cat => (
              <button
                key={cat.id}
                className={`btn btn-sm ${activeCategory === cat.id ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                Required Documents 
                <span className="badge bg-secondary ms-2">{filteredDocs.length}</span>
              </h5>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Document</th>
                    <th>Status</th>
                    <th>File Info</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((docType) => {
                    const uploadedDoc = getUploadedDocument(docType.title);
                    const showingUploadForm = showUploadForm[docType.title];
                    const showingUpdateForm = showUpdateForm[docType.title];
                    
                    return (
                      <React.Fragment key={`${docType.title}-${docType.old_title}`}>
                        <tr>
                          <td>
                            <div>
                              <strong className="d-flex align-items-center">
                                {docType.title}
                                <span className="badge bg-danger ms-2 small">Required</span>
                                {pendingSaves.has(docType.title) && (
                                  <span className="badge bg-info ms-2 small">Saving...</span>
                                )}
                              </strong>
                              <small className="text-muted">
                                {docType.old_title !== docType.title && (
                                  <span>Original: {docType.old_title}<br /></span>
                                )}
                                Please upload your {docType.title.toLowerCase()}
                              </small>
                              <br />
                              <small className="text-info">
                                Allowed: PDF | Max: 5MB
                              </small>
                            </div>
                          </td>
                          <td>
                            {docType.attached ? (
                              <span className={`badge bg-${uploadedDoc?.verified ? 'success' : 'warning'}`}>
                                {uploadedDoc?.verified ? '✓ Verified' : '⏳ Pending'}
                              </span>
                            ) : (
                              <span className="badge bg-light text-dark">Not Uploaded</span>
                            )}
                          </td>
                          <td>
                            {uploadedDoc ? (
                              <div>
                                <small className="d-block text-truncate" style={{ maxWidth: '200px' }}>
                                  {uploadedDoc.filename}
                                </small>
                                <small className="text-muted">
                                  {new Date(uploadedDoc.createdOn).toLocaleDateString()}
                                </small>
                              </div>
                            ) : (
                              <small className="text-muted">No file uploaded</small>
                            )}
                          </td>
                          <td>
                            {applicationStatus === 'draft' && (
                              <div className="btn-group btn-group-sm">
                                {uploadedDoc ? (
                                  <>
                                    <button 
                                      className="btn btn-outline-primary"
                                      onClick={() => downloadDocument(uploadedDoc._id, uploadedDoc.filename)}
                                      title="Download"
                                    >
                                      📥
                                    </button>
                                    <button 
                                      className={`btn ${showingUpdateForm ? 'btn-secondary' : 'btn-outline-warning'}`}
                                      onClick={() => toggleUpdateForm(docType.title)}
                                      title="Edit"
                                    >
                                      {showingUpdateForm ? '✕' : '✏️'}
                                    </button>
                                    <button 
                                      className="btn btn-outline-danger"
                                      onClick={() => deleteDocument(uploadedDoc._id, docType.title)}
                                      title="Delete"
                                    >
                                      🗑️
                                    </button>
                                  </>
                                ) : (
                                  <button 
                                    className={`btn ${showingUploadForm ? 'btn-secondary' : 'btn-primary'}`}
                                    onClick={() => toggleUploadForm(docType.title)}
                                  >
                                    {showingUploadForm ? '✕ Cancel' : '📤 Upload'}
                                  </button>
                                )}
                              </div>
                            )}
                            {applicationStatus !== 'draft' && uploadedDoc && (
                              <button 
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => downloadDocument(uploadedDoc._id, uploadedDoc.filename)}
                              >
                                📥 Download
                              </button>
                            )}
                          </td>
                        </tr>
                        {(showingUploadForm || showingUpdateForm) && applicationStatus === 'draft' && (
                          <tr key={`${docType.title}-${docType.old_title}-form`}>
                            <td colSpan={4} className="bg-light">
                              <div className="p-3">
                                <ApplicationFileUploader 
                                  schemeId={schemeId}
                                  schemeDocument={{
                                    _id: `${docType.title}-${docType.document_type_code || 'doc'}`,
                                    title: docType.title,
                                    description: `Please upload your ${docType.title.toLowerCase()}`,
                                    required: true,
                                    category: 'identity',
                                    fileType: ['pdf'],
                                    maxSize: '5MB'
                                  }}
                                  existingDocument={uploadedDoc}
                                  isUpdateMode={showingUpdateForm}
                                  applicationId={applicationId}
                                  onUploadSuccess={handleUploadSuccess}
                                  onUploadError={handleUploadError}
                                  onVerificationComplete={handleVerificationComplete}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {filteredDocs.length === 0 && (
            <div className="text-center py-5">
              <div className="display-1">📋</div>
              <h4 className="text-muted">No documents found</h4>
              <p className="text-muted">
                {requiredDocuments.length === 0 
                  ? 'No required documents configured for this scheme.' 
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - Desktop */}
      {applicationStatus === 'draft' && (
        <div className="row mt-4 d-none d-md-block">
          <div className="col-12">
            <div className="d-flex justify-content-end gap-2">
              <button 
                className="btn btn-outline-primary"
                onClick={handleSaveAllProgress}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    Saving...
                  </>
                ) : (
                  <>💾 Save Progress</>
                )}
              </button>
              
              <button 
                className="btn btn-success"
                onClick={handleSubmitClick}
                disabled={submitting || stats.requiredUploaded < stats.required}
              >
                {submitting ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    Submitting...
                  </>
                ) : (
                  <>📤 Submit Application</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons - Mobile */}
      {applicationStatus === 'draft' && (
        <div className="row mt-3 d-block d-md-none">
          <div className="col-12">
            <div className="d-grid gap-2">
              <button 
                className="btn btn-outline-primary"
                onClick={handleSaveAllProgress}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    Saving Progress...
                  </>
                ) : (
                  <>💾 Save Progress</>
                )}
              </button>
              
              <button 
                className="btn btn-success btn-lg"
                onClick={handleSubmitClick}
                disabled={submitting || stats.requiredUploaded < stats.required}
              >
                {submitting ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    Submitting Application...
                  </>
                ) : (
                  <>
                    📤 Submit Application
                    {stats.requiredUploaded < stats.required && (
                      <small className="d-block">
                        {stats.requiredUploaded}/{stats.required} required documents uploaded
                      </small>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentManager;