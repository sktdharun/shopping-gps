'use client';

import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type: 'success' | 'error' | 'confirm';
  onOk?: () => void;
  onCancel?: () => void;
}

export default function Modal({ isOpen, onClose, message, type, onOk, onCancel }: ModalProps) {
  if (!isOpen) return null;

  const handleOk = () => {
    if (onOk) onOk();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-2xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-bold ${
            type === 'error' ? 'text-red-600' :
            type === 'success' ? 'text-green-600' :
            'text-blue-600'
          }`}>
            {type === 'error' ? 'Error' :
             type === 'success' ? 'Success' :
             'Confirm'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          {type === 'confirm' ? (
            <>
              <button
                onClick={handleCancel}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleOk}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
              >
                Yes
              </button>
            </>
          ) : (
            <button
              onClick={handleOk}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}