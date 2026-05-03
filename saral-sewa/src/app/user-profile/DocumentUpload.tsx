// components/DocumentUpload.tsx
import React, { useState, useEffect } from 'react';
import FileUploader from '../uploadFileComponent';

interface Document {
  _id: string;
  title: string;
  filename: string;
  s3_url: string;
  verified: boolean;
  createdOn: string;
  lastModifiedOn: string;
}

interface ApiResponse {
  status: number;
  message: string;
  data: Document[] | Document | string[] | null;
  tag: string;
}

interface DocumentType {
  title: string;
  id: string;
  category: string;
  description: string;
  required: boolean;
}

const DocumentUpload: React.FC = () => {
  const [existingDocuments, setExistingDocuments] = useState<Document[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocTypes, setLoadingDocTypes] = useState(true);
  const [notifications, setNotifications] = useState<{type: 'success' | 'info' | 'warning' | 'error', message: string}[]>([]);
  const [showUploadForm, setShowUploadForm] = useState<{[key: string]: boolean}>({});
  const [showUpdateForm, setShowUpdateForm] = useState<{[key: string]: boolean}>({});
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";

  // Category mapping for document types
  const getCategoryForDocument = (docName: string): string => {
    const identityDocs = ['Aadhaar Card', 'PAN Card', 'Passport', 'Voter ID Card', 'Driving License', 'Birth Certificate'];
    const financialDocs = ['Bank Account Details / Cancelled Cheque', 'BPL Card', 'Income Proof / BPL Card', 'ESI Identity Certificate'];
    const educationalDocs = ['10th Class Marksheet', '12th Class Marksheet', 'Graduation Degree', 'School Leaving Certificate', 'Bonafide Certificate'];
    const utilitiyDocs = ['Electricity Bill', 'Water Bill', 'Ration Card'];
    const certificateDocs = ['Caste Certificate', 'Domicile Certificate', 'Marriage Certificate', 'Disability Certificate'];
    
    if (identityDocs.some(doc => docName.includes(doc) || doc.includes(docName))) return 'identity';
    if (financialDocs.some(doc => docName.includes(doc) || doc.includes(docName))) return 'financial';
    if (educationalDocs.some(doc => docName.includes(doc) || doc.includes(docName))) return 'educational';
    if (utilitiyDocs.some(doc => docName.includes(doc) || doc.includes(docName))) return 'utility';
    if (certificateDocs.some(doc => docName.includes(doc) || doc.includes(docName))) return 'certificates';
    
    return 'other';
  };

  // Get description for document type
  const getDescriptionForDocument = (docName: string): string => {
    const descriptions: {[key: string]: string} = {
      'Aadhaar Card': 'Government issued identity proof',
      'PAN Card': 'Permanent Account Number card',
      'Passport': 'Indian passport for identity',
      'Voter ID Card': 'Election commission voter ID',
      'Driving License': 'Valid driving license',
      '10th Class Marksheet': 'Class 10th marksheet/certificate',
      '12th Class Marksheet': 'Class 12th marksheet/certificate',
      'Graduation Degree': 'Graduation degree certificate',
      'Bank Account Details / Cancelled Cheque': 'Bank account proof',
      'Income Proof / BPL Card': 'Income certificate or BPL card',
      'BPL Card': 'Below Poverty Line card',
      'Caste Certificate': 'Caste/category certificate',
      'Domicile Certificate': 'Domicile/residence certificate',
      'Birth Certificate': 'Official birth certificate',
      'Marriage Certificate': 'Marriage registration certificate',
      'Disability Certificate': 'Disability status certificate',
      'Electricity Bill': 'Recent electricity bill',
      'Water Bill': 'Recent water bill',
      'Ration Card': 'Food ration card',
      'ESI Identity Certificate': 'ESI identity proof',
      'Photograph': 'Recent passport size photograph',
      'DPR (Detailed Project Report)': 'Detailed project report document',
      'Bonafide Certificate': 'Educational bonafide certificate',
      'School Leaving Certificate': 'School leaving certificate'
    };
    
    return descriptions[docName] || `${docName} document`;
  };

  // Check if document is required (you can modify this logic based on your business rules)
  const isDocumentRequired = (docName: string): boolean => {
    const requiredDocs = ['Aadhaar Card', 'PAN Card', '10th Class Marksheet', '12th Class Marksheet'];
    return requiredDocs.includes(docName);
  };

  const categories = [
    { id: 'all', name: 'All Documents', icon: '📋' },
    { id: 'identity', name: 'Identity', icon: '🆔' },
    { id: 'financial', name: 'Financial', icon: '💰' },
    { id: 'educational', name: 'Educational', icon: '🎓' },
    { id: 'certificates', name: 'Certificates', icon: '📜' },
    { id: 'utility', name: 'Utility', icon: '🏠' },
    { id: 'other', name: 'Other', icon: '📄' }
  ];

  useEffect(() => {
    fetchDocumentTypes();
    fetchExistingDocuments();
  }, []);

  const fetchDocumentTypes = async () => {
    try {
      setLoadingDocTypes(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/document-types-names`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result: ApiResponse = await response.json();
        if (result.status === 1 && Array.isArray(result.data)) {
          const docTypes: DocumentType[] = (result.data as string[]).map((docName, index) => ({
            title: docName,
            id: docName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            category: getCategoryForDocument(docName),
            description: getDescriptionForDocument(docName),
            required: isDocumentRequired(docName)
          }));
          setDocumentTypes(docTypes);
        } else {
          addNotification('error', 'Failed to fetch document types');
        }
      } else {
        addNotification('error', 'Failed to fetch document types');
      }
    } catch (error) {
      console.error('Error fetching document types:', error);
      addNotification('error', 'Failed to fetch document types');
    } finally {
      setLoadingDocTypes(false);
    }
  };

  const fetchExistingDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result: ApiResponse = await response.json();
        if (result.status === 1 && Array.isArray(result.data)) {
          setExistingDocuments(result.data as Document[]);
        }
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      addNotification('error', 'Failed to fetch existing documents');
    } finally {
      setLoading(false);
    }
  };

  const addNotification = (type: 'success' | 'info' | 'warning' | 'error', message: string) => {
    const newNotification = { type, message };
    setNotifications(prev => [...prev, newNotification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== newNotification));
    }, 5000);
  };

  const removeNotification = (notification: any) => {
    setNotifications(prev => prev.filter(n => n !== notification));
  };

  const handleUploadSuccess = (document: Document) => {
    setExistingDocuments(prev => {
      const filtered = prev.filter(doc => doc.title !== document.title);
      return [...filtered, document];
    });
    
    setShowUploadForm(prev => ({ ...prev, [document.title]: false }));
    setShowUpdateForm(prev => ({ ...prev, [document.title]: false }));
    
    addNotification('success', `${document.title} processed successfully!`);
  };

  const handleUploadError = (error: any) => {
    console.error('Upload/Update error:', error);
    addNotification('error', typeof error === 'string' ? error : 'Operation failed. Please try again.');
  };

  const handleVerificationComplete = (isVerified: boolean, message: string) => {
    if (isVerified) {
      addNotification('success', message);
    } else {
      addNotification('warning', message);
    }
  };

  const getExistingDocument = (title: string) => {
    return existingDocuments.find(doc => doc.title === title);
  };

  const getDocumentStats = () => {
    const total = documentTypes.length;
    const uploaded = existingDocuments.length;
    const verified = existingDocuments.filter(doc => doc.verified).length;
    const required = documentTypes.filter(dt => dt.required).length;
    const requiredUploaded = documentTypes.filter(dt => dt.required && getExistingDocument(dt.title)).length;
    
    return { total, uploaded, verified, required, requiredUploaded };
  };

  const getFilteredDocuments = () => {
    let filtered = documentTypes;
    
    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === activeCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchQuery.toLowerCase())
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
        if (result.status === 1 && result.data && typeof result.data === 'object' && 'url' in result.data) {
          window.open((result.data as any).url, '_blank');
          addNotification('success', `Download link generated for ${filename}`);
        } else {
          addNotification('error', result.message || 'Failed to generate download link');
        }
      } else {
        addNotification('error', 'Failed to generate download link');
      }
    } catch (error) {
      console.error('Download error:', error);
      addNotification('error', 'Failed to generate download link');
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
          setExistingDocuments(prev => prev.filter(doc => doc._id !== docId));
          addNotification('success', `${title} deleted successfully`);
        } else {
          addNotification('error', result.message || 'Failed to delete document');
        }
      } else {
        addNotification('error', 'Failed to delete document');
      }
    } catch (error) {
      console.error('Delete error:', error);
      addNotification('error', 'Failed to delete document');
    }
  };

  if (loading || loadingDocTypes) {
    return (
      <div className="row">
        <div className="col-12 text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">
            {loadingDocTypes ? 'Loading document types...' : 'Loading documents...'}
          </p>
        </div>
      </div>
    );
  };

  const stats = getDocumentStats();
  const filteredDocs = getFilteredDocuments();

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="page-heading mb-1">Document Management</h1>
              <p className="text-muted">Upload and manage your documents for verification</p>
            </div>
            <div className="d-flex gap-2">
              <button 
                className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('list')}
              >
                📋 List
              </button>
              <button 
                className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('grid')}
              >
                ⊞ Grid
              </button>
              <button 
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  fetchDocumentTypes();
                  fetchExistingDocuments();
                }}
                title="Refresh data"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="row mb-3">
          <div className="col-12">
            {notifications.map((notification, index) => (
              <div key={index} className={`alert alert-${notification.type} alert-dismissible fade show`} role="alert">
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

      {/* Stats Dashboard */}
      {documentTypes.length > 0 && (
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
                {stats.total > 0 && (
                  <>
                    <div className="progress mt-3" style={{ height: '8px' }}>
                      <div 
                        className="progress-bar bg-success" 
                        style={{ width: `${(stats.verified/stats.total)*100}%` }}
                      ></div>
                      <div 
                        className="progress-bar bg-warning" 
                        style={{ width: `${((stats.uploaded-stats.verified)/stats.total)*100}%` }}
                      ></div>
                    </div>
                    <small className="text-muted mt-1 d-block">
                      <span className="badge bg-success me-2">Verified</span>
                      <span className="badge bg-warning me-2">Uploaded</span>
                      <span className="badge bg-light text-dark">Pending</span>
                    </small>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="row mb-4">
        <div className="col-md-8">
          <div className="input-group">
            <span className="input-group-text">🔍</span>
            <input
              type="text"
              className="form-control"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-4">
          <div className="btn-group w-100" role="group">
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

      {/* Category Tabs (Mobile Friendly) */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex flex-wrap gap-2">
            {categories.map(cat => {
              const categoryCount = activeCategory === cat.id 
                ? filteredDocs.length 
                : cat.id === 'all' 
                  ? documentTypes.length 
                  : documentTypes.filter(d => d.category === cat.id).length;
              
              return (
                <button
                  key={cat.id}
                  className={`btn btn-sm ${activeCategory === cat.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.icon} {cat.name}
                  {activeCategory === cat.id && (
                    <span className="badge bg-light text-dark ms-1">
                      {categoryCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Documents List/Grid */}
      <div className="row">
        <div className="col-12">
          {documentTypes.length === 0 ? (
            <div className="text-center py-5">
              <div className="display-1">📋</div>
              <h4 className="text-muted">No document types available</h4>
              <p className="text-muted">Unable to load document types from server</p>
              <button 
                className="btn btn-primary"
                onClick={() => fetchDocumentTypes()}
              >
                🔄 Retry Loading
              </button>
            </div>
          ) : viewMode === 'list' ? (
            // List View
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">
                  Documents 
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
                      const existingDoc = getExistingDocument(docType.title);
                      const showingUploadForm = showUploadForm[docType.title];
                      const showingUpdateForm = showUpdateForm[docType.title];
                      
                      return (
                        <React.Fragment key={docType.id}>
                          <tr>
                            <td>
                              <div>
                                <strong className="d-flex align-items-center">
                                  {docType.title}
                                  {docType.required && <span className="badge bg-danger ms-2 small">Required</span>}
                                </strong>
                                <small className="text-muted">{docType.description}</small>
                              </div>
                            </td>
                            <td>
                              {existingDoc ? (
                                <span className={`badge bg-${existingDoc.verified ? 'success' : 'warning'}`}>
                                  {existingDoc.verified ? '✓ Verified' : '⏳ Pending'}
                                </span>
                              ) : (
                                <span className="badge bg-light text-dark">Not Uploaded</span>
                              )}
                            </td>
                            <td>
                              {existingDoc ? (
                                <div>
                                  <small className="d-block text-truncate" style={{ maxWidth: '200px' }}>
                                    {existingDoc.filename}
                                  </small>
                                  <small className="text-muted">
                                    {new Date(existingDoc.createdOn).toLocaleDateString()}
                                  </small>
                                </div>
                              ) : (
                                <small className="text-muted">No file uploaded</small>
                              )}
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                {existingDoc ? (
                                  <>
                                    <button 
                                      className="btn btn-outline-primary"
                                      onClick={() => downloadDocument(existingDoc._id, existingDoc.filename)}
                                    >
                                      📥
                                    </button>
                                    <button 
                                      className={`btn ${showingUpdateForm ? 'btn-secondary' : 'btn-outline-warning'}`}
                                      onClick={() => toggleUpdateForm(docType.title)}
                                    >
                                      {showingUpdateForm ? '✕' : '✏️'}
                                    </button>
                                    <button 
                                      className="btn btn-outline-danger"
                                      onClick={() => deleteDocument(existingDoc._id, docType.title)}
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
                            </td>
                          </tr>
                          {(showingUploadForm || showingUpdateForm) && (
                            <tr>
                              <td colSpan={4} className="bg-light">
                                <div className="p-3">
                                  <FileUploader 
                                    title={docType.title}
                                    existingDocument={existingDoc}
                                    isUpdateMode={showingUpdateForm}
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
          ) : (
            // Grid View
            <div className="row">
              {filteredDocs.map((docType) => {
                const existingDoc = getExistingDocument(docType.title);
                const showingUploadForm = showUploadForm[docType.title];
                const showingUpdateForm = showUpdateForm[docType.title];
                
                return (
                  <div key={docType.id} className="col-md-6 col-lg-4 mb-4">
                    <div className={`card h-100 ${existingDoc?.verified ? 'border-success' : existingDoc ? 'border-warning' : 'border-light'}`}>
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">
                          {docType.title}
                          {docType.required && <span className="badge bg-danger ms-1 small">Required</span>}
                        </h6>
                        {existingDoc ? (
                          <span className={`badge bg-${existingDoc.verified ? 'success' : 'warning'}`}>
                            {existingDoc.verified ? 'Verified' : 'Pending'}
                          </span>
                        ) : (
                          <span className="badge bg-light text-dark">Not Uploaded</span>
                        )}
                      </div>
                      <div className="card-body">
                        <p className="card-text small text-muted mb-3">{docType.description}</p>
                        
                        {existingDoc && (
                          <div className="alert alert-light mb-3">
                            <small>
                              <strong>File:</strong> <span className="text-truncate d-block">{existingDoc.filename}</span>
                              <strong>Date:</strong> {new Date(existingDoc.createdOn).toLocaleDateString()}
                            </small>
                          </div>
                        )}

                        <div className="d-grid gap-2">
                          {existingDoc ? (
                            <>
                              <div className="btn-group">
                                <button 
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={() => downloadDocument(existingDoc._id, existingDoc.filename)}
                                >
                                  📥 Download
                                </button>
                                <button 
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => deleteDocument(existingDoc._id, docType.title)}
                                >
                                  🗑️
                                </button>
                              </div>
                              <button 
                                className={`btn ${showingUpdateForm ? 'btn-secondary' : 'btn-warning'} btn-sm`}
                                onClick={() => toggleUpdateForm(docType.title)}
                              >
                                {showingUpdateForm ? '✕ Cancel Update' : '✏️ Update Document'}
                              </button>
                            </>
                          ) : (
                            <button 
                              className={`btn ${showingUploadForm ? 'btn-secondary' : 'btn-primary'}`}
                              onClick={() => toggleUploadForm(docType.title)}
                            >
                              {showingUploadForm ? '✕ Cancel' : '📤 Upload New'}
                            </button>
                          )}
                        </div>

                        {(showingUploadForm || showingUpdateForm) && (
                          <div className="mt-3 pt-3 border-top">
                            <FileUploader 
                              title={docType.title}
                              existingDocument={existingDoc}
                              isUpdateMode={showingUpdateForm}
                              onUploadSuccess={handleUploadSuccess}
                              onUploadError={handleUploadError}
                              onVerificationComplete={handleVerificationComplete}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredDocs.length === 0 && documentTypes.length > 0 && (
            <div className="text-center py-5">
              <div className="display-1">📋</div>
              <h4 className="text-muted">No documents found</h4>
              <p className="text-muted">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;