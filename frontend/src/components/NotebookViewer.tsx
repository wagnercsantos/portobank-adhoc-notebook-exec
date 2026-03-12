import { useState, useEffect } from 'react';
import { Code, FileText, AlertCircle, RefreshCw } from 'lucide-react';

interface NotebookCell {
  cell_type: 'code' | 'markdown' | 'raw';
  source: string[];
  outputs?: Array<{
    output_type: string;
    text?: string[];
    data?: Record<string, string[]>;
  }>;
}

interface NotebookContent {
  cells: NotebookCell[];
  metadata?: {
    kernelspec?: {
      display_name?: string;
      language?: string;
    };
  };
}

interface NotebookViewerProps {
  requestId: string;
  notebookName: string;
}

export default function NotebookViewer({ requestId, notebookName }: NotebookViewerProps) {
  const [content, setContent] = useState<NotebookContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotebook = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/requests/${requestId}/notebook`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Notebook content not available');
          }
          throw new Error('Failed to load notebook');
        }
        const data = await response.json();
        setContent(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchNotebook();
  }, [requestId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
        <span className="ml-3 text-gray-500">Loading notebook content...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
        <p className="text-gray-600 text-center">{error}</p>
        <p className="text-sm text-gray-400 mt-2">
          The notebook file may have been processed or is no longer available.
        </p>
      </div>
    );
  }

  if (!content || !content.cells) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-500">No content to display</p>
      </div>
    );
  }

  const language = content.metadata?.kernelspec?.language || 'python';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
        <FileText className="w-4 h-4" />
        <span className="font-medium">{notebookName}</span>
        <span className="text-gray-400">|</span>
        <span>{content.cells.length} cells</span>
        <span className="text-gray-400">|</span>
        <span className="capitalize">{language}</span>
      </div>

      <div className="space-y-3">
        {content.cells.map((cell, index) => (
          <div
            key={index}
            className={`border rounded-lg overflow-hidden ${
              cell.cell_type === 'code' ? 'border-blue-200' : 'border-gray-200'
            }`}
          >
            <div
              className={`flex items-center gap-2 px-3 py-1.5 text-xs ${
                cell.cell_type === 'code'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-gray-50 text-gray-600'
              }`}
            >
              {cell.cell_type === 'code' ? (
                <Code className="w-3.5 h-3.5" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span className="font-medium capitalize">{cell.cell_type}</span>
              <span className="text-gray-400">#{index + 1}</span>
            </div>

            <div className="p-3">
              <pre
                className={`text-sm whitespace-pre-wrap font-mono ${
                  cell.cell_type === 'code' ? 'bg-gray-900 text-gray-100 p-3 rounded' : ''
                }`}
              >
                {cell.source.join('')}
              </pre>

              {cell.outputs && cell.outputs.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Output:</p>
                  {cell.outputs.map((output, outIdx) => (
                    <div key={outIdx} className="bg-gray-50 p-2 rounded text-sm font-mono">
                      {output.text && (
                        <pre className="whitespace-pre-wrap text-gray-700">
                          {output.text.join('')}
                        </pre>
                      )}
                      {output.data?.['text/plain'] && (
                        <pre className="whitespace-pre-wrap text-gray-700">
                          {output.data['text/plain'].join('')}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
