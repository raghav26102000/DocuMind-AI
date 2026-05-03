// components/ApplicationFileUploader.tsx - Updated to work with existing endpoints
"use client";

import React, { useState } from "react";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import "filepond/dist/filepond.min.css";

// Register the plugins
registerPlugin(FilePondPluginFileValidateType, FilePondPluginFileValidateSize, FilePondPluginImagePreview);

interface SchemeDocument {
  _id: string;
  title: string;
  description: string;
  required: boolean;
  category: string;
  fileType: string[];
  maxSize: string;
}

interface UploadedDocument {
  _id: string;
  title: string;
  filename: string;
  s3_url: string;
  verified: boolean;
  createdOn: string;
  lastModifiedOn: string;
  schemeId: string;
}

interface Props {
  schemeId: string;
  schemeDocument: SchemeDocument;
  existingDocument?: UploadedDocument;
  isUpdateMode?: boolean;
  applicationId?: string | null;
  onUploadSuccess?: (response: UploadedDocument) => void;
  onUploadError?: (error: any) => void;
  onVerificationComplete?: (isVerified: boolean, message: string) => void;
}

interface BackendResponse {
  status: number;
  message: string;
  data: UploadedDocument | null;
  tag: string;
}

const ApplicationFileUploader: React.FC<Props> = ({ 
  schemeId,
  schemeDocument,
  existingDocument,
  isUpdateMode = false,
  applicationId,
  onUploadSuccess, 
  onUploadError,
  onVerificationComplete
}) => {
  const [files, setFiles] = useState<any[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'verifying' | 'verified' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [uploadedDocument, setUploadedDocument] = useState<UploadedDocument | null>(existingDocument || null);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token") || ""
      : "";

  // Convert maxSize string to bytes for FilePond
  const getMaxFileSizeInBytes = (sizeString: string): number => {
    const match = sizeString.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB)/i);
    if (!match) return 4 * 1024 * 1024; // Default 4MB
    
    const [, size, unit] = match;
    const sizeNum = parseFloat(size);
    
    switch (unit.toUpperCase()) {
      case 'KB': return sizeNum * 1024;
      case 'MB': return sizeNum * 1024 * 1024;
      case 'GB': return sizeNum * 1024 * 1024 * 1024;
      default: return 4 * 1024 * 1024;
    }
  };

  // Get MIME types from file extensions
  const getMimeTypes = (fileTypes: string[]): string[] => {
    const mimeTypeMap: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    return fileTypes.map(ext => {
      const normalizedExt = ext.toLowerCase().replace('.', '');
      return mimeTypeMap[normalizedExt] || `application/${normalizedExt}`;
    });
  };

  const handleProcessResponse = (response: string) => {
    try {
      const parsedResponse: BackendResponse = JSON.parse(response);
      
      if (parsedResponse.status === 1 && parsedResponse.data) {
        setUploadedDocument(parsedResponse.data);
        setUploadStatus('uploaded');
        setStatusMessage(isUpdateMode ? 'Document updated successfully!' : 'Document uploaded successfully!');
        
        // Show upload success message first
        onUploadSuccess?.(parsedResponse.data);
        
        // Then show verification status
        setTimeout(() => {
          setUploadStatus('verified');
          const verificationMessage = parsedResponse.data!.verified 
            ? `${schemeDocument.title} has been verified and is ready!`
            : `${schemeDocument.title} ${isUpdateMode ? 'updated' : 'uploaded'} but verification failed. Please check the document and try again.`;
          
          setStatusMessage(verificationMessage);
          onVerificationComplete?.(parsedResponse.data!.verified, verificationMessage);
        }, 1000);
        
        return response;
      } else {
        // Error response from backend
        setUploadStatus('error');
        const errorMessage = parsedResponse.message || (isUpdateMode ? 'Update failed' : 'Upload failed');
        setStatusMessage(errorMessage);
        onUploadError?.(errorMessage);
        
        return null;
      }
    } catch (e) {
      console.error('Failed to parse upload response:', e);
      setUploadStatus('error');
      
      // Handle specific upload errors
      let errorMessage = isUpdateMode ? 'Update failed - Server error' : 'Upload failed - Server error';
      if (typeof response === 'string') {
        if (response.includes('already uploaded')) {
          errorMessage = `You've already uploaded a document titled '${schemeDocument.title}'.`;
        } else if (response.includes('Unsupported or invalid file type')) {
          errorMessage = 'Invalid file type. Please upload a PDF file.';
        } else if (response.includes('not a valid')) {
          errorMessage = `Document verification failed. Please ensure the document is a valid ${schemeDocument.title}.`;
        } else if (response.includes('FILE_SIZE_EXCEEDED')) {
          errorMessage = `File size exceeds the maximum allowed size of ${schemeDocument.maxSize}.`;
        }
      }
      
      setStatusMessage(errorMessage);
      onUploadError?.(errorMessage);
      return null;
    }
  };

  const handleProcessError = (file: any, error: any) => {
    console.error('Upload error:', error);
    setUploadStatus('error');
    setStatusMessage(isUpdateMode ? 'Update failed' : 'Upload failed');
    onUploadError?.(error);
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return (
          <div className="spinner-border spinner-border-sm text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        );
      case 'uploaded':
        return (
          <svg width="20" height="20" fill="currentColor" className="text-info" viewBox="0 0 16 16">
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z"/>
          </svg>
        );
      case 'verified':
        return uploadedDocument?.verified ? (
          <svg width="20" height="20" fill="currentColor" className="text-success" viewBox="0 0 16 16">
            <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
          </svg>
        ) : (
          <svg width="20" height="20" fill="currentColor" className="text-danger" viewBox="0 0 16 16">
            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
          </svg>
        );
      case 'error':
        return (
          <svg width="20" height="20" fill="currentColor" className="text-danger" viewBox="0 0 16 16">
            <path d="M11.46.146A.5.5 0 0 0 11.107 0H4.893a.5.5 0 0 0-.353.146L.146 4.54A.5.5 0 0 0 0 4.893v6.214a.5.5 0 0 0 .146.353l4.394 4.394a.5.5 0 0 0 .353.146h6.214a.5.5 0 0 0 .353-.146l4.394-4.394a.5.5 0 0 0 .146-.353V4.893a.5.5 0 0 0-.146-.353L11.46.146zM8 4c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusAlertClass = () => {
    switch (uploadStatus) {
      case 'uploaded':
        return 'alert-info';
      case 'verified':
        return uploadedDocument?.verified ? 'alert-success' : 'alert-danger';
      case 'error':
        return 'alert-danger';
      default:
        return 'alert-info';
    }
  };

  // Use your existing document endpoints
  const endpoint = isUpdateMode ? '/documents/update' : '/documents/upload';
  const httpMethod = isUpdateMode ? 'PUT' : 'POST';

  const maxFileSize = getMaxFileSizeInBytes(schemeDocument.maxSize);
  const acceptedMimeTypes = getMimeTypes(schemeDocument.fileType);

  return (
    <div className="application-file-uploader-container">
      {/* Show scheme document requirements */}
      <div className="alert alert-light mb-3">
        <div className="d-flex align-items-start">
          <div className="me-2">
            {schemeDocument.required ? (
              <span className="badge bg-danger">Required</span>
            ) : (
              <span className="badge bg-secondary">Optional</span>
            )}
          </div>
          <div className="small">
            <strong>Accepted formats:</strong> {schemeDocument.fileType.join(', ')} <br />
            <strong>Maximum size:</strong> {schemeDocument.maxSize}
          </div>
        </div>
      </div>

      {/* Show existing document info if in update mode */}
      {isUpdateMode && existingDocument && !uploadedDocument && (
        <div className="alert alert-info mb-3">
          <div className="d-flex align-items-center">
            <div className="me-2">
              {existingDocument.verified ? (
                <svg width="20" height="20" fill="currentColor" className="text-success" viewBox="0 0 16 16">
                  <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                </svg>
              ) : (
                <svg width="20" height="20" fill="currentColor" className="text-warning" viewBox="0 0 16 16">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566z"/>
                </svg>
              )}
            </div>
            <div>
              <strong>Current: {existingDocument.filename}</strong>
              <br />
              <small>
                Status: {existingDocument.verified ? 'Verified' : 'Not Verified'} | 
                Uploaded: {new Date(existingDocument.createdOn).toLocaleDateString()}
              </small>
            </div>
          </div>
        </div>
      )}

      <FilePond
        files={files}
        onupdatefiles={setFiles}
        allowMultiple={false}
        maxFileSize={maxFileSize}
        acceptedFileTypes={acceptedMimeTypes}
        fileValidateTypeDetectType={(source, type) => {
          return new Promise((resolve, reject) => {
            // Check if file type is in accepted types
            if (acceptedMimeTypes.includes(type)) {
              resolve(type);
            } else {
              // Check by extension
              const extension = source.name.toLowerCase().split('.').pop();
              if (schemeDocument.fileType.some(ext => ext.toLowerCase().replace('.', '') === extension)) {
                resolve(type);
              } else {
                reject(type);
              }
            }
          });
        }}
        labelFileTypeNotAllowed="File type not allowed for this document"
        fileValidateTypeLabelExpectedTypes={`Expects ${schemeDocument.fileType.join(', ')}`}
        labelFileSizeNotAllowed={`File size exceeds maximum of ${schemeDocument.maxSize}`}
        labelIdle={`Drag & Drop or <span class="filepond--label-action">Browse</span> ${schemeDocument.title} (${schemeDocument.fileType.join(', ')}) ${isUpdateMode ? '- This will replace your current document' : ''}`}
        name="file"
        server={{
          url: `${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`,
          process: {
            url: "/",
            method: httpMethod,
            withCredentials: false,
            headers: {
              Authorization: `Bearer ${token}`,
            },
            onload: (response: any) => {
              try {
                const result = handleProcessResponse(response);
                if (result === null) {
                  return '';
                }
                return result;
              } catch (error) {
                console.error('Error in onload handler:', error);
                setUploadStatus('error');
                setStatusMessage(isUpdateMode ? 'Update processing failed' : 'Upload processing failed');
                return '';
              }
            },
            onerror: (error: any) => {
              console.error('FilePond server error:', error);
              setUploadStatus('error');
              setStatusMessage('Network error - Please check your connection');
              onUploadError?.('Network error');
            },
            ondata: (formData: FormData) => {
              formData.append("title", schemeDocument.title);
              // Note: Your backend expects 'title' parameter, not schemeId or applicationId
              return formData;
            },
          },
        }}
        onprocessfilestart={() => {
          setUploadStatus('uploading');
          setStatusMessage(isUpdateMode ? 'Updating document...' : 'Uploading document...');
        }}
        onprocessfile={() => {
          // Status is handled in handleProcessResponse
        }}
      />
      
      {/* Show upload/verification status */}
      {(uploadStatus !== 'idle' && statusMessage) && (
        <div className={`alert ${getStatusAlertClass()} mt-2`}>
          <div className="d-flex align-items-center">
            <div className="me-2">
              {getStatusIcon()}
            </div>
            <div>
              <strong>
                {uploadStatus === 'uploading' && (isUpdateMode ? 'Updating...' : 'Uploading...')}
                {uploadStatus === 'uploaded' && (isUpdateMode ? 'Update Complete' : 'Upload Complete')}
                {uploadStatus === 'verified' && (uploadedDocument?.verified ? 'Document Verified' : 'Verification Failed')}
                {uploadStatus === 'error' && (isUpdateMode ? 'Update Failed' : 'Upload Failed')}
              </strong>
              <br />
              <small>{statusMessage}</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationFileUploader;