import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { RiHome2Line, RiDeleteBin5Line, RiEdit2Line, RiSearchLine } from "react-icons/ri";
import "./Admin.scss";
import uploadImage from "../../assets/upload-image.png";

const Admin = ({ onSwitchToChat }) => {
  const [file, setFile] = useState(null);
  const [docTitle, setDocTitle] = useState("");
  const [category, setCategory] = useState("");
  const [isUploaded, setIsUploaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [editingDocId, setEditingDocId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [documents, setDocuments] = useState([
    {
      id: 1,
      title: "Employee Handbook.pdf",
      category: "Onboarding",
      fileName: "employee_handbook.pdf",
      uploadDate: "5/25/2025, 10:30 AM",
    },
    {
      id: 2,
      title: "Q1 Financial Report.docx",
      category: "Prepared",
      fileName: "q1_financial_report.docx",
      uploadDate: "5/20/2025, 2:15 PM",
    },
    {
      id: 3,
      title: "Meeting Notes.txt",
      category: "Training",
      fileName: "meeting_notes.txt",
      uploadDate: "5/15/2025, 9:45 AM",
    },
  ]);
  const [currentView, setCurrentView] = useState("new");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      console.log("Selected file:", selectedFile.name);
      setFile(selectedFile);
      setDocTitle(selectedFile.name);
      setIsUploaded(false);
      e.target.value = null;
    }
  };

  const handleDeleteFile = () => {
    console.log("Deleted selected file");
    setFile(null);
    setDocTitle("");
    document.getElementById("fileInput").value = null;
  };

  const handleSave = () => {
    if (file && docTitle && category) {
      const newDoc = {
        id: Date.now(),
        title: docTitle,
        category: category,
        fileName: file.name,
        uploadDate: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      };
      setDocuments([...documents, newDoc]);
      setIsUploaded(true);
      toast.success("File uploaded successfully!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setFile(null);
      setDocTitle("");
      setCategory("");
    } else {
      toast.error("Please fill in all required fields!", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleDeleteDocument = (id) => {
    setDocuments(documents.filter((doc) => doc.id !== id));
    toast.info("Document deleted!", {
      position: "top-right",
      autoClose: 3000,
    });
  };

  const handleEditDocument = (doc) => {
    setEditingDocId(doc.id);
    setEditTitle(doc.title);
    setEditCategory(doc.category);
  };

  const handleSaveEdit = (id) => {
    setDocuments(
      documents.map((doc) =>
        doc.id === id ? { ...doc, title: editTitle, category: editCategory } : doc
      )
    );
    setEditingDocId(null);
    toast.success("Document updated successfully!", {
      position: "top-right",
      autoClose: 3000,
    });
  };

  const handleCancelEdit = () => {
    setEditingDocId(null);
    setEditTitle("");
    setEditCategory("");
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFilter = (filterValue) => {
    setFilter(filterValue);
  };

  const filteredDocuments = documents
    .filter((doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((doc) => (filter ? doc.category === filter : true));

  const handleCancel = () => {
    onSwitchToChat();
  };

  const switchToNewDocument = () => {
    setCurrentView("new");
  };

  const switchToReviewDocuments = () => {
    setCurrentView("review");
  };

  return (
    <div className="admin-page">
      <ToastContainer />
      <header className="admin-header">
        <div className="view-buttons">
          <button
            className={`view-button ${currentView === "new" ? "active" : ""}`}
            onClick={switchToNewDocument}
          >
            New Document
          </button>
          <button
            className={`view-button ${currentView === "review" ? "active" : ""}`}
            onClick={switchToReviewDocuments}
          >
            Review Documents
          </button>
        </div>
      </header>

      <div className="content-section">
        <div className={`upload-section ${currentView === "new" ? "visible" : "hidden"}`}>
          <h2>New documents</h2>
          <p>
            I have an insatiable hunger for knowledge—feed my curiosity and upload your documents to enrich my mind!
          </p>

          <div
            className="upload-area"
            onClick={() => document.getElementById('fileInput').click()}
          >
            <div className="upload-icon">
              <img src={uploadImage} alt="Upload" className="upload-image" />
            </div>
            <p className="upload-text">Choose document</p>
            <p className="upload-supported">Supported file types: pdf, doc, txt</p>
            <input
              type="file"
              id="fileInput"
              className="file-input"
              accept=".pdf,.doc,.txt"
              onChange={handleFileChange}
            />
          </div>

          <div className="form-section">
            <h3>Name & categorize documents</h3>
            <div className="file-info">
              <span className="file-name">{file ? file.name : "No file selected"}</span>
              {file && (
                <button onClick={handleDeleteFile} className="delete-button">
                  <RiDeleteBin5Line className="action-icon" />
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Document title *"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="doc-title-input"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="category-select"
            >
              <option value="">Category *</option>
              <option value="Onboarding">Onboarding</option>
              <option value="Training">Training</option>
              <option value="Prepared">Prepared</option>
            </select>
          </div>

          <div className="action-buttons">
            <button onClick={handleCancel} className="cancel-button">
              Cancel
            </button>
            <button onClick={handleSave} className="save-button">
              Save
            </button>
          </div>
        </div>

        <div className={`review-section ${currentView === "review" ? "visible" : "hidden"}`}>
          <h2>Review documents</h2>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search for document"
              value={searchQuery}
              onChange={handleSearch}
            />
            <button>
              <RiSearchLine />
            </button>
          </div>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === "Onboarding" ? "active onboarding" : ""}`}
              onClick={() => handleFilter("Onboarding")}
            >
              Onboarding
            </button>
            <button
              className={`filter-btn ${filter === "Training" ? "active training" : ""}`}
              onClick={() => handleFilter("Training")}
            >
              Training
            </button>
            <button
              className={`filter-btn ${filter === "Prepared" ? "active prepared" : ""}`}
              onClick={() => handleFilter("Prepared")}
            >
              Prepared
            </button>
          </div>
          {filteredDocuments.length === 0 ? (
            <div className="empty-state">
              <p>No documents found</p>
            </div>
          ) : (
            <div className="documents-list">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="document-item">
                  {editingDocId === doc.id ? (
                    <div className="edit-form">
                      <h3>Update document</h3>
                      <div className="form-group">
                        <label className="floating-label">Name <span>*</span></label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="edit-input"
                        />
                      </div>
                      <div className="edit-buttons">
                        <button
                          className={`edit-btn ${editCategory === "Onboarding" ? "active onboarding" : ""}`}
                          onClick={() => setEditCategory("Onboarding")}
                        >
                          Onboarding
                        </button>
                        <button
                          className={`edit-btn ${editCategory === "Training" ? "active training" : ""}`}
                          onClick={() => setEditCategory("Training")}
                        >
                          Training
                        </button>
                        <button
                          className={`edit-btn ${editCategory === "Prepared" ? "active prepared" : ""}`}
                          onClick={() => setEditCategory("Prepared")}
                        >
                          Prepared
                        </button>
                      </div>
                      <div className="versions-section">
                        <label>Versions</label>
                        <div className="version-item">
                          <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                          <button className="delete-version-btn">
                            <RiDeleteBin5Line />
                          </button>
                        </div>
                        <button className="add-version-btn">Add new version</button>
                      </div>
                      <div className="edit-actions">
                        <button className="delete-doc-btn" onClick={() => handleDeleteDocument(doc.id)}>
                          Delete
                        </button>
                        <button className="save-edit-btn" onClick={() => handleSaveEdit(doc.id)}>
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="doc-info">
                        <span className="doc-title">{doc.title}</span>
                        <span className={`doc-category ${doc.category.toLowerCase()}`}>
                          {doc.category}
                        </span>
                      </div>
                      <div className="doc-actions">
                        <button
                          className="action-button edit-button"
                          onClick={() => handleEditDocument(doc)}
                          title="Edit"
                        >
                          <RiEdit2Line className="action-icon" />
                        </button>
                        <button
                          className="action-button delete-button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          title="Delete"
                        >
                          <RiDeleteBin5Line className="action-icon" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;