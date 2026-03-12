import { useState, useRef } from 'react';
import { Upload, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppStore } from '../stores/appStore';

export default function SubmitRequest() {
  const { submitRequest, loading, error } = useAppStore();
  const [notebook, setNotebook] = useState<File | null>(null);
  const [justification, setJustification] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file extension
      const validExtensions = ['.py', '.sql', '.ipynb'];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExtensions.includes(ext)) {
        setSubmitError('Please upload a .py, .sql, or .ipynb file');
        return;
      }
      setNotebook(file);
      setSubmitError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notebook || !justification.trim()) {
      setSubmitError('Please provide a notebook and justification');
      return;
    }

    try {
      setSubmitError(null);
      await submitRequest(notebook, justification);
      setSuccess(true);
      setNotebook(null);
      setJustification('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setSubmitError((err as Error).message);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const validExtensions = ['.py', '.sql', '.ipynb'];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExtensions.includes(ext)) {
        setSubmitError('Please upload a .py, .sql, or .ipynb file');
        return;
      }
      setNotebook(file);
      setSubmitError(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Submit Notebook for Approval</h1>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Request submitted successfully!</p>
            <p className="text-sm text-green-600">
              Your request is now pending approval. You can track it in "My Requests".
            </p>
          </div>
        </div>
      )}

      {(submitError || error) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{submitError || error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notebook File
          </label>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center ${
              notebook
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {notebook ? (
              <div className="flex items-center justify-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-medium">{notebook.name}</p>
                  <p className="text-sm text-gray-500">
                    {(notebook.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNotebook(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="ml-4 text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Drag and drop your notebook here, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supported formats: .py, .sql, .ipynb
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".py,.sql,.ipynb"
              onChange={handleFileChange}
              className={notebook ? 'hidden' : 'absolute inset-0 opacity-0 cursor-pointer'}
            />
          </div>
        </div>

        {/* Justification */}
        <div>
          <label
            htmlFor="justification"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Justification
          </label>
          <textarea
            id="justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Explain why this notebook needs to run in production..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Provide a clear justification for running this notebook in production.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !notebook || !justification.trim()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
          {loading ? 'Submitting...' : 'Submit for Approval'}
        </button>
      </form>

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">What happens next?</h3>
        <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
          <li>Your notebook will be stored for audit purposes</li>
          <li>An approver will review your request and justification</li>
          <li>If approved, a job will be created to run your notebook</li>
          <li>You'll be able to see the job run status in "My Requests"</li>
        </ol>
      </div>
    </div>
  );
}
